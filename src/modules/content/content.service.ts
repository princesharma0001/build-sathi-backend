
import { ContentType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

const defaultSlugs: Record<ContentType, string> = {
  TERMS: 'terms-and-conditions',
  PRIVACY: 'privacy-policy',
  ABOUT: 'about-neevsathi',
};

export class ContentError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ContentError';
  }
}

const isValidType = (type: unknown): type is ContentType =>
  typeof type === 'string' &&
  Object.values(ContentType).includes(type as ContentType);

export const listPublicContent = () =>
  prisma.appContent.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      type: true,
      title: true,
      slug: true,
      content: true,
      version: true,
      publishedAt: true,
      updatedAt: true,
    },
    orderBy: { type: 'asc' },
  });

export const getPublicContent = async (slug: string) => {
  const page = await prisma.appContent.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      type: true,
      title: true,
      slug: true,
      content: true,
      version: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (!page) {
    throw new ContentError('Published content not found', 404);
  }

  return page;
};

export const listAdminContent = () =>
  prisma.appContent.findMany({
    orderBy: { updatedAt: 'desc' },
  });

export const getAdminContent = async (id: string) => {
  const page = await prisma.appContent.findUnique({ where: { id } });

  if (!page) {
    throw new ContentError('Content not found', 404);
  }

  return page;
};

export const createContent = async (body: any) => {
  const { type, title, content, slug } = body ?? {};

  if (!isValidType(type)) {
    throw new ContentError('type must be TERMS, PRIVACY, or ABOUT');
  }

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    typeof content !== 'string' ||
    !content.trim()
  ) {
    throw new ContentError('title and content are required');
  }

  const normalizedSlug =
    typeof slug === 'string' && slug.trim()
      ? slug.trim().toLowerCase()
      : defaultSlugs[type];

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    throw new ContentError('Invalid slug format');
  }

  try {
    return await prisma.appContent.create({
      data: {
        type,
        title: title.trim(),
        content: content.trim(),
        slug: normalizedSlug,
        isPublished: false,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ContentError(
        'A content page with this type or slug already exists',
        409,
      );
    }
    throw error;
  }
};

export const updateContent = async (id: string, body: any) => {
  const existing = await getAdminContent(id);
  const data: Prisma.AppContentUpdateInput = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new ContentError('title cannot be empty');
    }
    data.title = body.title.trim();
  }

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || !body.content.trim()) {
      throw new ContentError('content cannot be empty');
    }
    data.content = body.content.trim();
  }

  if (body.slug !== undefined) {
    if (
      typeof body.slug !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim().toLowerCase())
    ) {
      throw new ContentError('Invalid slug format');
    }
    data.slug = body.slug.trim().toLowerCase();
  }

  if (body.type !== undefined) {
    if (!isValidType(body.type)) {
      throw new ContentError('Invalid content type');
    }
    data.type = body.type;
  }

  if (Object.keys(data).length === 0) {
    throw new ContentError('No valid fields provided to update');
  }

  // Increment version whenever content is edited.
  data.version = { increment: 1 };

  try {
    return await prisma.appContent.update({
      where: { id: existing.id },
      data,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ContentError('Content type or slug already exists', 409);
    }
    throw error;
  }
};

export const publishContent = async (id: string) => {
  await getAdminContent(id);

  return prisma.appContent.update({
    where: { id },
    data: {
      isPublished: true,
      publishedAt: new Date(),
    },
  });
};

export const unpublishContent = async (id: string) => {
  await getAdminContent(id);

  return prisma.appContent.update({
    where: { id },
    data: { isPublished: false },
  });
};

export const deleteContent = async (id: string) => {
  await getAdminContent(id);
  await prisma.appContent.delete({ where: { id } });
  return { id };
};
