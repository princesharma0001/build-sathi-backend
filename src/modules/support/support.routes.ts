import {Router} from 'express';
import {
  createTicketController,
  myTicketsController,
  myTicketDetailController,
  adminTicketsController,
  adminUpdateTicketController,
} from './support.controller';

import {authMiddleware} from '../../middleware/auth.middleware';
// Import your existing admin-role middleware here.

const router = Router();

// Replace authMiddleware with the exact export name in your project.
router.post('/', authMiddleware, createTicketController);
router.get('/my', authMiddleware, myTicketsController);
router.get('/my/:id', authMiddleware, myTicketDetailController);

// IMPORTANT: protect these routes with BOTH authentication
// and your existing admin-role authorization middleware.
router.get('/admin/tickets', authMiddleware, /* requireAdmin, */ adminTicketsController);
router.patch('/admin/tickets/:id', authMiddleware, /* requireAdmin, */ adminUpdateTicketController);

export default router;