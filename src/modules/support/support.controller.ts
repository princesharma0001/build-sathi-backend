
import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import * as service from "./support.service";

const handleError = (res: Response, error: any) => {
  const statusCode = error?.statusCode || 500;

  if (statusCode === 500) {
    console.error("SUPPORT API ERROR:", error);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Something went wrong."
        : error.message,
  });
};

export async function createTicketController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in again.",
      });
    }

    const { category, title, description } = req.body;

    const ticket = await service.createTicket({
      userId,
      role,
      category,
      title,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      data: ticket,
    });
  } catch (error: any) {
    return handleError(res, error);
  }
}

export async function myTicketsController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const tickets = await service.listMyTickets(userId);

    return res.json({
      success: true,
      data: { tickets },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function myTicketDetailController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ticket = await service.getMyTicket(
      userId,
      String(req.params.id)
    );

    return res.json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function adminTicketsController(
  req: Request,
  res: Response
) {
  try {
    const data = await service.listAdminTickets({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status
        ? String(req.query.status)
        : undefined,
      role: req.query.role
        ? String(req.query.role)
        : undefined,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function adminUpdateTicketController(
  req: Request,
  res: Response
) {
  try {
    const ticket = await service.updateTicket(
      String(req.params.id),
      req.body
    );

    return res.json({
      success: true,
      message: "Support ticket updated successfully.",
      data: { ticket },
    });
  } catch (error) {
    return handleError(res, error);
  }
}
