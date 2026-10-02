import {Prisma} from '@prisma/client';

import {prisma} from '../../config/database';
import {FREE_QUOTATION_LIMIT} from '../../config/subscription';

type Tx = Prisma.TransactionClient;

/* =========================================================
   ERRORS
========================================================= */

export class QuotaExhaustedError extends Error {
  statusCode = 403;
  code = 'QUOTA_EXHAUSTED';

  constructor() {
    super(
      `You have used all ${FREE_QUOTATION_LIMIT} free quotations and have no active plan with quotations left. Please purchase a plan to send more quotations.`,
    );
  }
}

/* =========================================================
   HELPERS
========================================================= */

const activeSubscriptionWhere = (sellerId: string, now: Date) => ({
  sellerId,
  status: 'ACTIVE' as const,
  startsAt: {lte: now},
  OR: [{expiresAt: null}, {expiresAt: {gt: now}}],
});

const mapPlan = (plan: any) => ({
  ...plan,
  price: Number(plan.price),
});

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/* =========================================================
   PLANS
========================================================= */

export const listPlans = async (includeInactive = false) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: includeInactive ? {} : {isActive: true},
    orderBy: [{sortOrder: 'asc'}, {price: 'asc'}],
  });

  return plans.map(mapPlan);
};

export const getPlanById = async (id: string) => {
  const plan = await prisma.subscriptionPlan.findUnique({where: {id}});

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  return mapPlan(plan);
};

export interface PlanInput {
  code: string;
  name: string;
  description?: string | null;
  price: number;
  quotationLimit: number;
  validityDays?: number | null;
  hasTrustedBadge?: boolean;
  features?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

export const createPlan = async (data: PlanInput) => {
  const existing = await prisma.subscriptionPlan.findUnique({
    where: {code: data.code},
  });

  if (existing) {
    throw new Error(`A plan with code ${data.code} already exists`);
  }

  const plan = await prisma.subscriptionPlan.create({data});

  return mapPlan(plan);
};

export const updatePlan = async (id: string, data: Partial<PlanInput>) => {
  const existing = await prisma.subscriptionPlan.findUnique({where: {id}});

  if (!existing) {
    throw new Error('Subscription plan not found');
  }

  if (data.code && data.code !== existing.code) {
    const clash = await prisma.subscriptionPlan.findUnique({
      where: {code: data.code},
    });

    if (clash) {
      throw new Error(`A plan with code ${data.code} already exists`);
    }
  }

  // Existing subscriptions keep the values they were bought with.
  const plan = await prisma.subscriptionPlan.update({where: {id}, data});

  return mapPlan(plan);
};

/* =========================================================
   SELLER SUBSCRIPTIONS
========================================================= */

interface SubscriptionRecordInput {
  sellerId: string;
  planId: string;
  quotationsTotal: number;
  validityDays: number | null;
  hasTrustedBadge: boolean;
  source: 'PURCHASE' | 'ADMIN_GRANT';
}

export const createSubscriptionRecord = (
  client: Tx | typeof prisma,
  input: SubscriptionRecordInput,
) => {
  const now = new Date();

  return client.sellerSubscription.create({
    data: {
      sellerId: input.sellerId,
      planId: input.planId,
      quotationsTotal: input.quotationsTotal,
      quotationsRemaining: input.quotationsTotal,
      hasTrustedBadge: input.hasTrustedBadge,
      source: input.source,
      startsAt: now,
      expiresAt: input.validityDays ? addDays(now, input.validityDays) : null,
    },
    include: {plan: true},
  });
};

// Admin grant (no payment). Paid purchases go through subscription.payment.ts
export const activateSubscription = async (
  sellerId: string,
  planId: string,
  source: 'PURCHASE' | 'ADMIN_GRANT' = 'ADMIN_GRANT',
) => {
  const seller = await prisma.user.findUnique({where: {id: sellerId}});

  if (!seller) {
    throw new Error('Seller not found');
  }

  if (seller.role !== 'SELLER') {
    throw new Error('Subscriptions can only be assigned to seller accounts');
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: {id: planId},
  });

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  if (!plan.isActive) {
    throw new Error('This subscription plan is not available');
  }

  return createSubscriptionRecord(prisma, {
    sellerId,
    planId,
    quotationsTotal: plan.quotationLimit,
    validityDays: plan.validityDays,
    hasTrustedBadge: plan.hasTrustedBadge,
    source,
  });
};

export const isTrustedSeller = async (sellerId: string) => {
  const count = await prisma.sellerSubscription.count({
    where: {
      ...activeSubscriptionWhere(sellerId, new Date()),
      hasTrustedBadge: true,
    },
  });

  return count > 0;
};

// For listing many sellers at once (e.g. buyer viewing quotes)
export const getTrustedSellerIds = async (sellerIds: string[]) => {
  if (sellerIds.length === 0) return new Set<string>();

  const now = new Date();

  const rows = await prisma.sellerSubscription.findMany({
    where: {
      sellerId: {in: sellerIds},
      status: 'ACTIVE',
      hasTrustedBadge: true,
      startsAt: {lte: now},
      OR: [{expiresAt: null}, {expiresAt: {gt: now}}],
    },
    select: {sellerId: true},
    distinct: ['sellerId'],
  });

  return new Set(rows.map(r => r.sellerId));
};

export const getQuotaSummary = async (sellerId: string) => {
  const seller = await prisma.user.findUnique({
    where: {id: sellerId},
    select: {freeQuotesUsed: true},
  });

  if (!seller) {
    throw new Error('Seller not found');
  }

  const now = new Date();

  const subscriptions = await prisma.sellerSubscription.findMany({
    where: {sellerId},
    orderBy: {createdAt: 'desc'},
    include: {plan: {select: {id: true, code: true, name: true}}},
  });

  const freeUsed = Math.min(seller.freeQuotesUsed, FREE_QUOTATION_LIMIT);
  const freeRemaining = Math.max(FREE_QUOTATION_LIMIT - freeUsed, 0);

  const mapped = subscriptions.map(sub => {
    const expired = sub.expiresAt !== null && sub.expiresAt <= now;

    let state: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'CANCELLED' = 'ACTIVE';
    if (sub.status === 'CANCELLED') state = 'CANCELLED';
    else if (expired) state = 'EXPIRED';
    else if (sub.quotationsRemaining <= 0) state = 'EXHAUSTED';

    return {
      id: sub.id,
      plan: sub.plan,
      state,
      source: sub.source,
      quotationsTotal: sub.quotationsTotal,
      quotationsRemaining: sub.quotationsRemaining,
      hasTrustedBadge: sub.hasTrustedBadge,
      startsAt: sub.startsAt,
      expiresAt: sub.expiresAt,
    };
  });

  const usable = mapped.filter(
    s => s.state === 'ACTIVE' && s.quotationsRemaining > 0,
  );

  const paidRemaining = usable.reduce(
    (sum, s) => sum + s.quotationsRemaining,
    0,
  );

  // Badge stays while a Pro subscription is inside its validity period,
  // even if its quotations are used up.
  const trusted = subscriptions.some(
    sub =>
      sub.hasTrustedBadge &&
      sub.status === 'ACTIVE' &&
      sub.startsAt <= now &&
      (sub.expiresAt === null || sub.expiresAt > now),
  );

  return {
    freeQuota: {
      limit: FREE_QUOTATION_LIMIT,
      used: freeUsed,
      remaining: freeRemaining,
    },
    paidQuotationsRemaining: paidRemaining,
    totalQuotationsRemaining: freeRemaining + paidRemaining,
    canSendQuotation: freeRemaining + paidRemaining > 0,
    isTrustedSeller: trusted,
    activeSubscriptions: usable,
    subscriptionHistory: mapped,
  };
};

/* =========================================================
   QUOTA CONSUMPTION (called inside the quote transaction)
========================================================= */

// Uses one free quotation first, then the paid subscription that expires
// soonest. Conditional updates make this safe under concurrent requests.
export const consumeQuotation = async (tx: Tx, sellerId: string) => {
  const free = await tx.user.updateMany({
    where: {id: sellerId, freeQuotesUsed: {lt: FREE_QUOTATION_LIMIT}},
    data: {freeQuotesUsed: {increment: 1}},
  });

  if (free.count === 1) {
    return {source: 'FREE' as const, subscriptionId: null};
  }

  const now = new Date();

  const candidates = await tx.sellerSubscription.findMany({
    where: {
      ...activeSubscriptionWhere(sellerId, now),
      quotationsRemaining: {gt: 0},
    },
    orderBy: [
      {expiresAt: {sort: 'asc', nulls: 'last'}},
      {createdAt: 'asc'},
    ],
  });

  for (const sub of candidates) {
    const result = await tx.sellerSubscription.updateMany({
      where: {id: sub.id, quotationsRemaining: {gt: 0}},
      data: {quotationsRemaining: {decrement: 1}},
    });

    if (result.count === 1) {
      return {source: 'SUBSCRIPTION' as const, subscriptionId: sub.id};
    }
  }

  throw new QuotaExhaustedError();
};