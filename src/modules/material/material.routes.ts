import {Router} from 'express';

import {
  addCategory,
  addMaterial,
  changeMaterialStatus,
  editCategory,
  editMaterial,
  getMaterial,
  listAdminMaterials,
  listBuyerMaterials,
  listCategories,
  removeMaterial,
} from './material.controller';

import {authMiddleware} from '../../middleware/auth.middleware';

const router = Router();

// ==========================================
// ADMIN - keep BEFORE dynamic /:id routes
// ==========================================

router.post(
  '/admin/categories',
  authMiddleware,
  addCategory,
);

router.get(
  '/admin/categories',
  authMiddleware,
  listCategories,
);

router.patch(
  '/admin/categories/:id',
  authMiddleware,
  editCategory,
);

router.post(
  '/admin',
  authMiddleware,
  addMaterial,
);

router.get(
  '/admin',
  authMiddleware,
  listAdminMaterials,
);

router.patch(
  '/admin/:id',
  authMiddleware,
  editMaterial,
);

router.delete(
  '/admin/:id',
  authMiddleware,
  removeMaterial,
);

router.patch(
  '/admin/:id/status',
  authMiddleware,
  changeMaterialStatus,
);

// ==========================================
// BUYER
// ==========================================

router.get(
  '/categories',
  authMiddleware,
  listCategories,
);

router.get(
  '/',
  authMiddleware,
  listBuyerMaterials,
);

router.get(
  '/:id',
  authMiddleware,
  getMaterial,
);

export default router;