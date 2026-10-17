
import { Prisma, SupportStatus, SupportPriority } from '@prisma/client';
import { prisma } from '../../config/database';

type ListParams = {
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  role?: unknown;
  priority?: unknown;
  search?: unknown;
};

type UpdateParams = {
  status?: unknown;
  priority?: unknown;
  adminReply?: unknown;
};

class SupportServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const parsePositiveInt = (
  value: unknown,
  fallback: number,
  max?: number,
) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
};

const validStatuses = Object.values(SupportStatus);
const validPriorities = Object.values(SupportPriority);

export const getAdminSupportTickets = async (params: ListParams) => {
  const page = parsePositiveInt(params.page, 1);
  const limit = parsePositiveInt(params.limit, 10, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.SupportTicketWhereInput = {};

  if (params.status !== undefined && params.status !== '') {
    if (
      typeof params.status !== 'string' ||
      !validStatuses.includes(params.status as SupportStatus)
    ) {
      throw new SupportServiceError('Invalid ticket status', 400);
    }

    where.status = params.status as SupportStatus;
  }

  if (params.priority !== undefined && params.priority !== '') {
    if (
      typeof params.priority !== 'string' ||
      !validPriorities.includes(params.priority as SupportPriority)
    ) {
      throw new SupportServiceError('Invalid ticket priority', 400);
    }

    where.priority = params.priority as SupportPriority;
  }

  if (params.role !== undefined && params.role !== '') {
    if (params.role !== 'BUYER' && params.role !== 'SELLER') {
      throw new SupportServiceError('Invalid user role', 400);
    }

    where.role = params.role;
  }

  if (typeof params.search === 'string' && params.search.trim()) {
    const search = params.search.trim();

    where.OR = [
      {ticketNumber: {contains: search, mode: 'insensitive'}},
      {subject: {contains: search, mode: 'insensitive'}},
      {description: {contains: search, mode: 'insensitive'}},
      {user: {name: {contains: search, mode: 'insensitive'}}},
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: {createdAt: 'desc'},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    }),
    prisma.supportTicket.count({where}),
  ]);

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAdminSupportTicketById = async (id: string) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: {id},
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new SupportServiceError('Support ticket not found', 404);
  }

  return ticket;
};

export const updateAdminSupportTicket = async (
  id: string,
  input: UpdateParams,
) => {
  const data: Prisma.SupportTicketUpdateInput = {};

  if (input.status !== undefined) {
    if (
      typeof input.status !== 'string' ||
      !validStatuses.includes(input.status as SupportStatus)
    ) {
      throw new SupportServiceError('Invalid ticket status', 400);
    }

    data.status = input.status as SupportStatus;

    if (input.status === 'RESOLVED') {
      data.resolvedAt = new Date();
    } else if (input.status === 'OPEN' || input.status === 'IN_PROGRESS') {
      data.resolvedAt = null;
    }
  }

  if (input.priority !== undefined) {
    if (
      typeof input.priority !== 'string' ||
      !validPriorities.includes(input.priority as SupportPriority)
    ) {
      throw new SupportServiceError('Invalid ticket priority', 400);
    }

    data.priority = input.priority as SupportPriority;
  }

  if (input.adminReply !== undefined) {
    if (
      typeof input.adminReply !== 'string' ||
      input.adminReply.trim().length > 5000
    ) {
      throw new SupportServiceError(
        'Admin reply must be a string of up to 5000 characters',
        400,
      );
    }

    data.adminReply = input.adminReply.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    throw new SupportServiceError('No valid update fields provided', 400);
  }

  try {
    return await prisma.supportTicket.update({
      where: {id},
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new SupportServiceError('Support ticket not found', 404);
    }

    throw error;
  }
};
