import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import buyerRoutes from "../modules/buyers/buyer.routes"
import addressRoutes from "../modules/address/address.routes"
import materialRoutes from "../modules/material/material.routes"
import requirementRoutes from "../modules/requirement/requirement.routes"
import sellerRoutes from "../modules/sellers/seller.routes"
import quoteRoutes from "../modules/quote/quote.routes"
import subscriptionRoutes from "../modules/subscription/subscription.routes"
import notificationRoutes from "../modules/notifications/notification.routes";
import feedbackRoutes from "../modules/feedback/feedback.routes";
import { adminContentRouter, publicContentRouter } from '../modules/content/content.routes';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import supportRoutes from '../modules/support/support.routes';
import adminSupportRoutes from "../modules/support/admin-support.routes"
const router = Router();

// API root
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Welcome to NeevSathi API',
    version: 'v1',
  });
});

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'NeevSathi API is healthy',
  });
});

// Auth routes
router.use('/auth', authRoutes);
router.use('/buyer', buyerRoutes);
router.use(
  '/sellers',
  sellerRoutes,
);

// router.get('/dashboard', getSellerDashboardController);
router.use("/notifications", notificationRoutes);

router.use(
  '/addresses',
  addressRoutes,
);
router.use(
  '/materials',
  materialRoutes,
);
router.use('/requirements', requirementRoutes);
router.use('/quotes', quoteRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/feedback', feedbackRoutes);

// Public content APIs: Buyer and Seller app
router.use('/content', publicContentRouter);

// Protected APIs: Admin only
router.use(
  '/admin/content',
  authMiddleware,
  adminMiddleware,
  adminContentRouter,
);

// Buyer & Seller support APIs
// Login required
router.use('/support', authMiddleware, supportRoutes);

// Admin support APIs
// Admin login + ADMIN role required
router.use(
  '/admin/support',
  authMiddleware,
  adminMiddleware,
  adminSupportRoutes,
);

export default router;