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



export default router;