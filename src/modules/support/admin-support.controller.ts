
import {Request, Response} from 'express';
import { getAdminSupportTicketById, getAdminSupportTickets, updateAdminSupportTicket } from './admin-support.service';


const handleError = (res: Response, error: any) => {
  console.error('ADMIN SUPPORT ERROR:', error);

  if (error?.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Something went wrong while processing support ticket.',
  });
};

// GET /api/v1/admin/support?page=1&limit=10&status=OPEN&role=BUYER
export const getAdminSupportTicketsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await getAdminSupportTickets({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      role: req.query.role,
      priority: req.query.priority,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      message: 'Support tickets fetched successfully',
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/v1/admin/support/:id
export const getAdminSupportTicketByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const ticket = await getAdminSupportTicketById(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: 'Support ticket fetched successfully',
      data: {ticket},
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// PATCH /api/v1/admin/support/:id
// Body: { status?, priority?, adminReply? }
export const updateAdminSupportTicketController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {status, priority, adminReply} = req.body ?? {};

    const ticket = await updateAdminSupportTicket(
      String(req.params.id),
      {status, priority, adminReply},
    );

    return res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully',
      data: {ticket},
    });
  } catch (error) {
    return handleError(res, error);
  }
};
