import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import buyerRoutes from "../modules/buyers/buyer.routes"
import addressRoutes from "../modules/address/address.routes"
import materialRoutes from "../modules/material/material.routes"
import requirementRoutes from "../modules/requirement/requirement.routes"
import sellerRoutes from "../modules/sellers/seller.routes"
import quoteRoutes from "../modules/quote/quote.routes"
const router = Router();

// API root
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Welcome to BuildSathi API',
    version: 'v1',
  });
});

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'BuildSathi API is healthy',
  });
});

// Auth routes
router.use('/auth', authRoutes);
router.use('/buyer', buyerRoutes);
router.use(
  '/sellers',
  sellerRoutes,
);

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


export default router;