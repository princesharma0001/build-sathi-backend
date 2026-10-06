import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";

import {
  getMyNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
  registerDeviceToken,
  removeDeviceToken,
  sendTestNotification,
} from "./notification.controller";

const router = Router();

router.get(
  '/',
  authMiddleware,
  getMyNotificationsController,
);


router.patch(
  '/:id/read',
  authMiddleware,
  markNotificationAsReadController,
);

/* =========================================================
   MARK ALL NOTIFICATIONS AS READ
========================================================= */

router.patch(
  '/read-all',
  authMiddleware,
  markAllNotificationsAsReadController,
);

router.post(
  "/device-token",
  authMiddleware,
  registerDeviceToken,
);

router.delete(
  "/device-token",
  authMiddleware,
  removeDeviceToken,
);

router.post(
  "/test",
  authMiddleware,
  sendTestNotification,
);

export default router;