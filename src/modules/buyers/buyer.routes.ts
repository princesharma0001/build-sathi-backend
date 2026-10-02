import { Router } from 'express';

import {
  confirmMaterialReceivedController,
  getBuyerOrdersController,
  getProfile,
  saveBuyerProfile,
} from './buyer.controller';

import {
  authMiddleware,
} from '../../middleware/auth.middleware';

const router = Router();



router.get(
  '/profile',
  authMiddleware,
  getProfile,
);

router.post(
  '/profile',
  authMiddleware,
  saveBuyerProfile,
);

router.patch(
  '/profile',
  authMiddleware,
  saveBuyerProfile,
);

router.get(
  "/orders",
  authMiddleware,
  getBuyerOrdersController,
);

router.patch(
  '/orders/:orderId/received',
  authMiddleware,
  confirmMaterialReceivedController,
);

export default router;