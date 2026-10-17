import {prisma} from '../../config/database';

const categories = [
  'ACCOUNT',
  'ORDER',
  'PAYMENT',
  'SUBSCRIPTION',
  'APP_BUG',
  'OTHER',
] as const;

const statuses = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;

export class SupportError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}


export const createTicket = async (input: {
    userId: string;
    role: string;
    category: string;
    title: string;
    description: string;
  }) => {
    const { userId, role, category, title, description } = input;
  
    if (!userId) {
      throw new SupportError(401, "User authentication required.");
    }
  
    if (
      !["BUYER", "SELLER"].includes(
        String(role).toUpperCase()
      )
    ) {
      throw new SupportError(400, "Invalid reporter role.");
    }
  
    if (
      typeof category !== "string" ||
      !categories.includes(
        category as (typeof categories)[number]
      )
    ) {
      throw new SupportError(400, "Invalid support category.");
    }
  
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 120
    ) {
      throw new SupportError(
        400,
        "Title is required (max 120 characters)."
      );
    }
  
    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 5000
    ) {
      throw new SupportError(
        400,
        "Description is required (max 5000 characters)."
      );
    }
  
    const ticketNumber = `SUP-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
  
    return prisma.supportTicket.create({
        data: {
          ticketNumber,
          userId,
          role: role.toUpperCase() as any,
          category: category as any,
          subject: title.trim(),
          description: description.trim(),
        },
      });
  };
  

export async function listMyTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: {userId},
    orderBy: {createdAt: 'desc'},
  });
}

export async function getMyTicket(userId: string, id: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: {id, userId},
  });

  if (!ticket) {
    throw new SupportError(404, 'Support ticket not found.');
  }

  return ticket;
}

export async function listAdminTickets(query: {
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));

  if (
    query.status &&
    !statuses.includes(query.status as (typeof statuses)[number])
  ) {
    throw new SupportError(400, 'Invalid ticket status.');
  }

  if (
    query.role &&
    !['BUYER', 'SELLER'].includes(query.role.toUpperCase())
  ) {
    throw new SupportError(400, 'Invalid reporter role.');
  }

  const where = {
    ...(query.status
      ? {status: query.status as (typeof statuses)[number]}
      : {}),
      ...(query.role ? { role: query.role.toUpperCase() as any } : {}),  };

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: {createdAt: 'desc'},
      skip: (page - 1) * limit,
      take: limit,
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
}

export async function updateTicket(
  id: string,
  input: {status?: string; adminNote?: string},
) {
  const existing = await prisma.supportTicket.findUnique({where: {id}});

  if (!existing) {
    throw new SupportError(404, 'Support ticket not found.');
  }

  if (
    input.status &&
    !statuses.includes(input.status as (typeof statuses)[number])
  ) {
    throw new SupportError(400, 'Invalid ticket status.');
  }

  if (
    input.adminNote !== undefined &&
    (typeof input.adminNote !== 'string' || input.adminNote.length > 5000)
  ) {
    throw new SupportError(400, 'Admin note must be under 5000 characters.');
  }

  return prisma.supportTicket.update({
    where: {id},
    data: {
      ...(input.status
        ? {status: input.status as (typeof statuses)[number]}
        : {}),
      ...(input.adminNote !== undefined
        ? {adminNote: input.adminNote.trim() || null}
        : {}),
    },
  });
}