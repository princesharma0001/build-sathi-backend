import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";

import {
  registerDeviceToken,
  removeDeviceToken,
  sendTestNotification,
} from "./notification.controller";

const router = Router();

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