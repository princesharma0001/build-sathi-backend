import {Router} from 'express';

import {authMiddleware} from '../../middleware/auth.middleware';
import {requireRole} from '../../middleware/role.middleware';

import {
  adminListPlansController,
  createPlanController,
  devCheckoutPage,
  devPaymentResultPage,
  getMySubscriptionController,
  getOrderController,
  listOrdersController,
  purchasePlanController,
  simulatePaymentController,
  verifyOrderController,
  getPlanController,
  getPlansController,
  grantSubscriptionController,
  updatePlanController,
  cashfreeWebhookController,
} from './subscription.controller';

const router = Router();

/* =========================================================
   PUBLIC
========================================================= */

router.get('/plans', getPlansController);

router.get('/plans/:id', getPlanController);

/* =========================================================
   SELLER
========================================================= */

router.get(
  '/me',
  authMiddleware,
  requireRole('SELLER'),
  getMySubscriptionController,
);

router.post(
  '/purchase',
  authMiddleware,
  requireRole('SELLER'),
  purchasePlanController,
);

router.get(
  '/orders',
  authMiddleware,
  requireRole('SELLER'),
  listOrdersController,
);

router.get(
  '/orders/:orderId',
  authMiddleware,
  requireRole('SELLER'),
  getOrderController,
);

router.post(
  '/orders/:orderId/verify',
  authMiddleware,
  requireRole('SELLER'),
  verifyOrderController,
);

/* =========================================================
   CASHFREE WEBHOOK
   IMPORTANT:
   Do NOT add authMiddleware here.
========================================================= */

// router.post(
//   '/webhook/cashfree',
//   cashfreeWebhookController,
// );


/* =========================================================
   DEV / SANDBOX
========================================================= */

router.get(
  '/dev/checkout',
  devCheckoutPage,
);

router.get(
  '/dev/payment-result',
  devPaymentResultPage,
);

router.post(
  '/dev/orders/:orderId/simulate-payment',
  authMiddleware,
  requireRole('SELLER'),
  simulatePaymentController,
);

/* =========================================================
   ADMIN
========================================================= */

router.get(
  '/admin/plans',
  authMiddleware,
  requireRole('ADMIN'),
  adminListPlansController,
);

router.post(
  '/admin/plans',
  authMiddleware,
  requireRole('ADMIN'),
  createPlanController,
);

router.patch(
  '/admin/plans/:id',
  authMiddleware,
  requireRole('ADMIN'),
  updatePlanController,
);

router.post(
  '/admin/grant',
  authMiddleware,
  requireRole('ADMIN'),
  grantSubscriptionController,
);

export default router;