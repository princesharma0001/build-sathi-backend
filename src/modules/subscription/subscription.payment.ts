import crypto from 'crypto';

import {prisma} from '../../config/database';

import {cashfreeConfig} from '../../config/cashfree';

import {
  CashfreePayment,
  createCashfreeOrder,
  fetchCashfreeOrder,
  fetchCashfreePayments,
  simulateCashfreePayment,
} from './cashfree.client';
import {createSubscriptionRecord, getQuotaSummary} from './subscription.service';

const orderInclude = {
  plan: {select: {id: true, code: true, name: true, hasTrustedBadge: true}},
  subscription: true,
} as const;

const mapOrder = (order: any) => ({
  ...order,
  amount: Number(order.amount),
});

// Cashfree order_id: 3-50 chars, letters, numbers, _ and -
const newOrderId = () =>
  `BS_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

/* =========================================================
   STEP 1 - CREATE ORDER  (POST /subscriptions/purchase)
========================================================= */

export const createPurchaseOrder = async (sellerId: string, planId: string) => {
  const seller = await prisma.user.findUnique({
    where: {id: sellerId},
    include: {sellerProfile: true},
  });

  if (!seller) {
    throw new Error('Seller not found');
  }

  if (seller.role !== 'SELLER') {
    throw new Error('Only seller accounts can purchase a plan');
  }

  // Cashfree needs a customer phone number
  const phone = seller.sellerProfile?.phone || seller.phone;

  if (!phone) {
    throw new Error(
      'Please complete your seller profile (business phone) before purchasing a plan',
    );
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: {id: planId},
  });

  if (!plan || !plan.isActive) {
    throw new Error('Subscription plan not found or not available');
  }

  const amount = Number(plan.price);

  if (amount <= 0) {
    throw new Error('This plan has no price set, so it cannot be purchased');
  }

  const orderId = newOrderId();

  const cfOrder = await createCashfreeOrder({
    orderId,
    amount,
    currency: plan.currency,
    customerId: seller.id,
    customerPhone: phone.replace(/\s/g, '').replace(/^\+91/, ''),
    customerName: seller.sellerProfile?.ownerName || seller.name,
    customerEmail: seller.email,
    note: `BuildSathi ${plan.name} plan`,
  });

  if (!cfOrder.payment_session_id) {
    throw new Error('Cashfree did not return a payment session');
  }

  const order = await prisma.subscriptionOrder.create({
    data: {
      orderId,
      sellerId,
      planId: plan.id,
      amount,
      currency: plan.currency,
      quotationLimit: plan.quotationLimit,
      validityDays: plan.validityDays,
      hasTrustedBadge: plan.hasTrustedBadge,
      status: 'CREATED',
      paymentSessionId: cfOrder.payment_session_id,
      cfOrderId: cfOrder.cf_order_id ? String(cfOrder.cf_order_id) : null,
    },
    include: orderInclude,
  });

  return mapOrder(order);
};

/* =========================================================
   STEP 2 - CONFIRM PAYMENT  (verify endpoint + webhook)
   Always asks Cashfree for the real status - never trusts the client.
========================================================= */

const summarisePayments = (payments: CashfreePayment[]) =>
  payments.map(p => ({
    cfPaymentId: p.cf_payment_id ? String(p.cf_payment_id) : null,
    status: p.payment_status,
    method: p.payment_group || null,
    message:
      p.error_details?.error_description ||
      p.payment_message ||
      null,
  }));

export const syncOrderWithCashfree = async (
  orderId: string,
  sellerId?: string,
) => {
  const existing = await prisma.subscriptionOrder.findUnique({
    where: {orderId},
  });

  if (!existing || (sellerId && existing.sellerId !== sellerId)) {
    throw new Error('Order not found');
  }

  // Already processed - just return it (makes verify + webhook safe to run twice)
  if (existing.status === 'PAID') {
    return finish(orderId);
  }

  const cfOrder = await fetchCashfreeOrder(orderId);

  // Payment attempts (used for the paid record and to explain "not completed")
  let payments: CashfreePayment[] = [];

  try {
    payments = await fetchCashfreePayments(orderId);
  } catch (error) {
    console.error('CASHFREE FETCH PAYMENTS ERROR:', error);
  }

  const successPayment = payments.find(p => p.payment_status === 'SUCCESS');

  // Order is paid if Cashfree says PAID, or it lists a SUCCESS payment.
  const isPaid = cfOrder.order_status === 'PAID' || !!successPayment;

  if (isPaid) {
    if (
      Number(cfOrder.order_amount) !== Number(existing.amount) ||
      cfOrder.order_currency !== existing.currency
    ) {
      throw new Error('Paid amount does not match the order amount');
    }

    const cfPaymentId = successPayment?.cf_payment_id
      ? String(successPayment.cf_payment_id)
      : null;
    const paymentMethod = successPayment?.payment_group || null;

    await prisma.$transaction(async tx => {
      // Only the request that flips CREATED/FAILED -> PAID creates the subscription
      const flipped = await tx.subscriptionOrder.updateMany({
        where: {orderId, status: {not: 'PAID'}},
        data: {status: 'PAID', paidAt: new Date(), cfPaymentId, paymentMethod},
      });

      if (flipped.count !== 1) return;

      const subscription = await createSubscriptionRecord(tx, {
        sellerId: existing.sellerId,
        planId: existing.planId,
        quotationsTotal: existing.quotationLimit,
        validityDays: existing.validityDays,
        hasTrustedBadge: existing.hasTrustedBadge,
        source: 'PURCHASE',
      });

      await tx.subscriptionOrder.update({
        where: {orderId},
        data: {subscriptionId: subscription.id},
      });
    });
  } else if (
    cfOrder.order_status === 'EXPIRED' ||
    cfOrder.order_status === 'TERMINATED'
  ) {
    await prisma.subscriptionOrder.updateMany({
      where: {orderId, status: 'CREATED'},
      data: {status: 'FAILED'},
    });
  }

  const result = await finish(orderId);

  return {
    ...result,
    cashfree: {
      orderStatus: cfOrder.order_status,
      payments: summarisePayments(payments),
    },
  };
};

const finish = async (orderId: string) => {
  const order = await prisma.subscriptionOrder.findUniqueOrThrow({
    where: {orderId},
    include: orderInclude,
  });

  const quota = order.status === 'PAID' ? await getQuotaSummary(order.sellerId) : null;

  return {order: mapOrder(order), quota};
};

/* =========================================================
   SANDBOX ONLY - force a payment to succeed (for Postman testing)
   Cashfree sandbox UPI collect payments can stay PENDING, so we use
   Cashfree's Simulate Payment API to finish them.
========================================================= */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const simulateSandboxPayment = async (
  sellerId: string,
  orderId: string,
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
) => {
  if (
    process.env.NODE_ENV === 'production' ||
    cashfreeConfig.environment !== 'sandbox'
  ) {
    throw new Error('Payment simulation is only available in the Cashfree sandbox');
  }

  const order = await prisma.subscriptionOrder.findFirst({
    where: {orderId, sellerId},
  });

  if (!order) {
    throw new Error('Order not found');
  }

  const payments = await fetchCashfreePayments(orderId);

  // newest attempt that has not succeeded yet
  const target = [...payments]
    .reverse()
    .find(p => p.payment_status !== 'SUCCESS' && p.cf_payment_id);

  if (!target?.cf_payment_id) {
    throw new Error(
      'No payment attempt found for this order. First run the Cashfree "Order Pay" request (UPI collect) or pay in the browser, then simulate.',
    );
  }

  await simulateCashfreePayment(String(target.cf_payment_id), status);

  // give Cashfree a moment to update the order
  await sleep(2000);

  return syncOrderWithCashfree(orderId, sellerId);
};

/* =========================================================
   ORDER HISTORY
========================================================= */

export const listSellerOrders = async (sellerId: string) => {
  const orders = await prisma.subscriptionOrder.findMany({
    where: {sellerId},
    orderBy: {createdAt: 'desc'},
    include: orderInclude,
  });

  return orders.map(mapOrder);
};

export const getSellerOrder = async (sellerId: string, orderId: string) => {
  const order = await prisma.subscriptionOrder.findFirst({
    where: {orderId, sellerId},
    include: orderInclude,
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return mapOrder(order);
};