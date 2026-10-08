import {Router} from 'express';

import {authMiddleware} from '../../middleware/auth.middleware';
import {requireRole} from '../../middleware/role.middleware';

import {
  createFeedbackController,
  givenFeedbackController,
  orderFeedbackStatusController,
  receivedFeedbackController,
  updateFeedbackController,
  userFeedbackController,
  userRatingSummaryController,
} from './feedback.controller';

const router = Router();

// Buyers and sellers rate each other
const participant = [authMiddleware, requireRole('BUYER', 'SELLER')];

router.post('/', ...participant, createFeedbackController);
router.get('/received', ...participant, receivedFeedbackController);
router.get('/given', ...participant, givenFeedbackController);
router.get('/order/:orderId', ...participant, orderFeedbackStatusController);

// Public ratings of any seller / buyer (needs login)
router.get('/users/:userId', ...participant, userFeedbackController);
router.get('/users/:userId/summary', ...participant, userRatingSummaryController);

router.patch('/:id', ...participant, updateFeedbackController);

export default router;