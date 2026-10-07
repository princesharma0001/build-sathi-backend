import {Response} from 'express';

import {AuthRequest} from '../../middleware/auth.middleware';

import {
  FeedbackError,
  createFeedback,
  getOrderFeedbackStatus,
  getUserRatingSummary,
  listFeedbackForUser,
  listGivenFeedback,
  listReceivedFeedback,
  updateFeedback,
} from './feedback.service';

const fail = (res: Response, error: any, label: string) => {
  if (error instanceof FeedbackError) {
    return res.status(error.statusCode).json({
      success: false,
      ...(error.code ? {code: error.code} : {}),
      message: error.message,
    });
  }

  console.error(label, error);

  return res.status(500).json({
    success: false,
    message: error?.message || 'Something went wrong',
  });
};

const unauthorized = (res: Response) =>
  res.status(401).json({success: false, message: 'Unauthorized'});

// POST /feedback   { orderId, rating, comment? }
export const createFeedbackController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return unauthorized(res);

    const {orderId, rating, comment} = req.body || {};

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({success: false, message: 'orderId is required'});
    }

    const feedback = await createFeedback({userId, orderId, rating, comment});

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {feedback},
    });
  } catch (error) {
    return fail(res, error, 'CREATE FEEDBACK ERROR:');
  }
};

// PATCH /feedback/:id   { rating?, comment? }
export const updateFeedbackController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return unauthorized(res);

    const feedback = await updateFeedback(userId, String(req.params.id), req.body || {});

    return res.status(200).json({
      success: true,
      message: 'Feedback updated successfully',
      data: {feedback},
    });
  } catch (error) {
    return fail(res, error, 'UPDATE FEEDBACK ERROR:');
  }
};

// GET /feedback/received?page=1&limit=10
export const receivedFeedbackController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return unauthorized(res);

    const data = await listReceivedFeedback(userId, req.query.page, req.query.limit);

    return res.status(200).json({success: true, data});
  } catch (error) {
    return fail(res, error, 'RECEIVED FEEDBACK ERROR:');
  }
};

// GET /feedback/given?page=1&limit=10
export const givenFeedbackController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return unauthorized(res);

    const data = await listGivenFeedback(userId, req.query.page, req.query.limit);

    return res.status(200).json({success: true, data});
  } catch (error) {
    return fail(res, error, 'GIVEN FEEDBACK ERROR:');
  }
};

// GET /feedback/order/:orderId
export const orderFeedbackStatusController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return unauthorized(res);

    const data = await getOrderFeedbackStatus(userId, String(req.params.orderId));

    return res.status(200).json({success: true, data});
  } catch (error) {
    return fail(res, error, 'ORDER FEEDBACK STATUS ERROR:');
  }
};

// GET /feedback/users/:userId?page=1&limit=10   (ratings people gave this user)
export const userFeedbackController = async (req: AuthRequest, res: Response) => {
  try {
    const data = await listFeedbackForUser(
      String(req.params.userId),
      req.query.page,
      req.query.limit,
    );

    return res.status(200).json({success: true, data});
  } catch (error) {
    return fail(res, error, 'USER FEEDBACK ERROR:');
  }
};

// GET /feedback/users/:userId/summary   (average + count only)
export const userRatingSummaryController = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getUserRatingSummary(String(req.params.userId));

    return res.status(200).json({success: true, data});
  } catch (error) {
    return fail(res, error, 'USER RATING SUMMARY ERROR:');
  }
};