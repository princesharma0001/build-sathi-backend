import {Prisma} from '@prisma/client';

import {prisma} from '../../config/database';
import {FEEDBACK_COMMENT_MAX_LENGTH} from '../../config/feedback';
// import {NotificationType, safeNotify} from '../notification/notification.service';

/* =========================================================
   ERRORS
========================================================= */

export class FeedbackError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code?: string,
  ) {
    super(message);
  }
}

/* =========================================================
   HELPERS
========================================================= */

const feedbackInclude = {
  reviewer: {select: {id: true, name: true, role: true}},
  reviewee: {select: {id: true, name: true, role: true}},
} as const;

const toDto = (fb: any) => ({
  id: fb.id,
  orderId: fb.orderId,
  rating: fb.rating,
  comment: fb.comment,
  reviewerRole: fb.reviewer.role,
  reviewer: {id: fb.reviewer.id, name: fb.reviewer.name},
  reviewee: {id: fb.reviewee.id, name: fb.reviewee.name},
  createdAt: fb.createdAt,
  updatedAt: fb.updatedAt,
});

export const parsePagination = (page?: unknown, limit?: unknown) => {
  const p = Math.max(parseInt(String(page ?? '1'), 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(String(limit ?? '10'), 10) || 10, 1), 50);

  return {page: p, limit: l, skip: (p - 1) * l};
};

const pageMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const validateRating = (rating: unknown) => {
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new FeedbackError('rating must be a whole number from 1 to 5', 400);
  }
};

const cleanComment = (comment: unknown): string | null => {
  if (comment === undefined || comment === null) return null;

  if (typeof comment !== 'string') {
    throw new FeedbackError('comment must be text', 400);
  }

  const trimmed = comment.trim();

  if (trimmed.length > FEEDBACK_COMMENT_MAX_LENGTH) {
    throw new FeedbackError(
      `comment must be ${FEEDBACK_COMMENT_MAX_LENGTH} characters or fewer`,
      400,
    );
  }

  return trimmed || null;
};

/* =========================================================
   RATING SUMMARY  (average shown on profiles)
========================================================= */

const round1 = (n: number) => Math.round(n * 10) / 10;

export const getRatingSummary = async (userId: string) => {
  const where = {revieweeId: userId};

  const [agg, groups] = await Promise.all([
    prisma.feedback.aggregate({where, _avg: {rating: true}, _count: {_all: true}}),
    prisma.feedback.groupBy({where, by: ['rating'], _count: {_all: true}}),
  ]);

  const distribution: Record<string, number> = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0};

  for (const g of groups) {
    distribution[String(g.rating)] = g._count._all;
  }

  return {
    averageRating: agg._avg.rating === null ? null : round1(agg._avg.rating),
    totalRatings: agg._count._all,
    distribution,
  };
};

// For lists (e.g. buyer viewing many sellers' quotes) - one query for all users
export const getRatingSummaries = async (userIds: string[]) => {
  const result = new Map<string, {averageRating: number | null; totalRatings: number}>();

  if (userIds.length === 0) return result;

  const rows = await prisma.feedback.groupBy({
    where: {revieweeId: {in: userIds}},
    by: ['revieweeId'],
    _avg: {rating: true},
    _count: {_all: true},
  });

  for (const id of userIds) {
    result.set(id, {averageRating: null, totalRatings: 0});
  }

  for (const row of rows) {
    result.set(row.revieweeId, {
      averageRating: row._avg.rating === null ? null : round1(row._avg.rating),
      totalRatings: row._count._all,
    });
  }

  return result;
};

/* =========================================================
   CREATE / UPDATE
========================================================= */

const loadParticipants = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: {id: orderId},
    select: {id: true, orderNumber: true, status: true, buyerId: true, sellerId: true},
  });

  if (!order) {
    throw new FeedbackError('Order not found', 404);
  }

  return order;
};

// Feedback opens only after the order is completed (both sides confirmed delivery)
const eligibilityProblem = (orderStatus: string) =>
  orderStatus === 'COMPLETED'
    ? null
    : `Feedback opens after the order is completed. Current status: ${orderStatus.toLowerCase()}.`;

export const createFeedback = async (input: {
  userId: string;
  orderId: string;
  rating: unknown;
  comment?: unknown;
}) => {
  validateRating(input.rating);
  const comment = cleanComment(input.comment);

  const order = await loadParticipants(input.orderId);
  const {buyerId, sellerId} = order;

  if (input.userId !== buyerId && input.userId !== sellerId) {
    throw new FeedbackError(
      'You can only give feedback on your own orders',
      403,
    );
  }

  const problem = eligibilityProblem(order.status);

  if (problem) {
    throw new FeedbackError(problem, 400, 'FEEDBACK_NOT_ALLOWED');
  }

  const revieweeId = input.userId === sellerId ? buyerId : sellerId;

  try {
    const feedback = await prisma.feedback.create({
      data: {
        orderId: order.id,
        reviewerId: input.userId,
        revieweeId,
        rating: input.rating as number,
        comment,
      },
      include: feedbackInclude,
    });

    // await safeNotify(revieweeId, {
    //   type: NotificationType.FEEDBACK_RECEIVED,
    //   title: 'You received a new rating',
    //   body: `You received ${input.rating as number} star${input.rating === 1 ? '' : 's'} for order ${order.orderNumber}.`,
    //   data: {orderId: order.id, feedbackId: feedback.id},
    // });

    return toDto(feedback);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new FeedbackError(
        'You have already given feedback for this order. You can edit it instead.',
        409,
        'ALREADY_REVIEWED',
      );
    }

    throw error;
  }
};

export const updateFeedback = async (
  userId: string,
  feedbackId: string,
  input: {rating?: unknown; comment?: unknown},
) => {
  if (input.rating === undefined && input.comment === undefined) {
    throw new FeedbackError('Send rating and/or comment to update', 400);
  }

  const existing = await prisma.feedback.findFirst({
    where: {id: feedbackId, reviewerId: userId},
  });

  // Same message for "not yours" and "missing" so ids cannot be probed
  if (!existing) {
    throw new FeedbackError('Feedback not found', 404);
  }

  const data: Prisma.FeedbackUpdateInput = {};

  if (input.rating !== undefined) {
    validateRating(input.rating);
    data.rating = input.rating as number;
  }

  if (input.comment !== undefined) {
    data.comment = cleanComment(input.comment);
  }

  const feedback = await prisma.feedback.update({
    where: {id: feedbackId},
    data,
    include: feedbackInclude,
  });

  return toDto(feedback);
};

/* =========================================================
   READ
========================================================= */

const listBy = async (
  where: Prisma.FeedbackWhereInput,
  page: number,
  limit: number,
  skip: number,
) => {
  const [total, rows] = await Promise.all([
    prisma.feedback.count({where}),
    prisma.feedback.findMany({
      where,
      orderBy: {createdAt: 'desc'},
      skip,
      take: limit,
      include: feedbackInclude,
    }),
  ]);

  return {feedback: rows.map(toDto), pagination: pageMeta(page, limit, total)};
};

export const listReceivedFeedback = async (userId: string, pageQ?: unknown, limitQ?: unknown) => {
  const {page, limit, skip} = parsePagination(pageQ, limitQ);

  const [list, summary] = await Promise.all([
    listBy({revieweeId: userId}, page, limit, skip),
    getRatingSummary(userId),
  ]);

  return {summary, ...list};
};

export const listGivenFeedback = async (userId: string, pageQ?: unknown, limitQ?: unknown) => {
  const {page, limit, skip} = parsePagination(pageQ, limitQ);

  return listBy({reviewerId: userId}, page, limit, skip);
};

// Anyone logged in can see a seller's / buyer's public ratings
export const listFeedbackForUser = async (
  targetUserId: string,
  pageQ?: unknown,
  limitQ?: unknown,
) => {
  const user = await prisma.user.findUnique({
    where: {id: targetUserId},
    select: {id: true, name: true, role: true},
  });

  if (!user || (user.role !== 'SELLER' && user.role !== 'BUYER')) {
    throw new FeedbackError('User not found', 404);
  }

  const {page, limit, skip} = parsePagination(pageQ, limitQ);

  const [list, summary] = await Promise.all([
    listBy({revieweeId: targetUserId}, page, limit, skip),
    getRatingSummary(targetUserId),
  ]);

  return {user, summary, ...list};
};

export const getUserRatingSummary = async (targetUserId: string) => {
  const user = await prisma.user.findUnique({
    where: {id: targetUserId},
    select: {id: true, name: true, role: true},
  });

  if (!user || (user.role !== 'SELLER' && user.role !== 'BUYER')) {
    throw new FeedbackError('User not found', 404);
  }

  return {user, summary: await getRatingSummary(targetUserId)};
};

// For the UI: can I rate this order, and what has each side said?
export const getOrderFeedbackStatus = async (userId: string, orderId: string) => {
  const order = await loadParticipants(orderId);

  if (userId !== order.buyerId && userId !== order.sellerId) {
    throw new FeedbackError('Order not found', 404);
  }

  const rows = await prisma.feedback.findMany({
    where: {orderId},
    include: feedbackInclude,
  });

  const mine = rows.find(r => r.reviewerId === userId);
  const theirs = rows.find(r => r.reviewerId !== userId);

  let reason: string | null = eligibilityProblem(order.status);

  if (!reason && mine) {
    reason = 'You have already given feedback for this order';
  }

  return {
    orderId,
    orderStatus: order.status,
    canGiveFeedback: reason === null,
    reason,
    myFeedback: mine ? toDto(mine) : null,
    otherPartyFeedback: theirs ? toDto(theirs) : null,
  };
};