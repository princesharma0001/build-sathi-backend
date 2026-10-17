
import {Router} from 'express';
import { getAdminSupportTicketByIdController, getAdminSupportTicketsController, updateAdminSupportTicketController } from './admin-support.controller';


const router = Router();

// GET /api/v1/admin/support
router.get('/', getAdminSupportTicketsController);

// GET /api/v1/admin/support/:id
router.get('/:id', getAdminSupportTicketByIdController);

// PATCH /api/v1/admin/support/:id
router.patch('/:id', updateAdminSupportTicketController);

export default router;
