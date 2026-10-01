import {Router} from 'express';

import {authMiddleware} from '../../middleware/auth.middleware';

import {
  createSellerBasicProfileController,
  getSellerProfileController,
  getSellerRequirementByIdController,
  getSellerRequirementsController,
  updateSellerProfileController,
} from './seller.controller';

const router = Router();

// CREATE BASIC SELLER PROFILE
router.post(
    '/profile/basic',
    authMiddleware,
    createSellerBasicProfileController,
  );
  
  // GET SELLER PROFILE
  router.get(
    '/profile',
    authMiddleware,
    getSellerProfileController,
  );
  
  // EDIT SELLER PROFILE
  router.put(
    '/profile',
    authMiddleware,
    updateSellerProfileController,
  );

  router.get(
    '/requirements',
    authMiddleware,
    getSellerRequirementsController,
  );

  router.get(
    '/requirements/:id',
    authMiddleware,
    getSellerRequirementByIdController,
  );

export default router;