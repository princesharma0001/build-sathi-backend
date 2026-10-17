
import { Request, Response } from 'express';
import * as service from './content.service';

const handleError = (res: Response, error: unknown) => {
  const err = error as { statusCode?: number; message?: string };

  const statusCode = err.statusCode ?? 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? 'Internal server error'
        : err.message ?? 'Request failed',
  });
};

const sendSuccess = (
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200,
) => res.status(statusCode).json({ success: true, message, data });

// Validate and extract a single route parameter
const getRouteParam = (
  param: string | string[] | undefined,
  name: string,
): string => {
  const value = Array.isArray(param) ? param[0] : param;

  if (typeof value !== 'string' || value.trim().length === 0) {
    const error = new Error(`Valid ${name} parameter is required`) as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }

  return value;
};

// Public: GET all published pages
export const getPublishedContent = async (
  _req: Request,
  res: Response,
) => {
  try {
    return sendSuccess(res, await service.listPublicContent());
  } catch (error) {
    return handleError(res, error);
  }
};

// Public: GET one published page by slug
export const getPublishedContentBySlug = async (
  req: Request,
  res: Response,
) => {
  try {
    const slug = getRouteParam(req.params.slug, 'slug');

    return sendSuccess(
      res,
      await service.getPublicContent(slug),
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// Admin: GET all pages, including drafts
export const getAllContentAdmin = async (
  _req: Request,
  res: Response,
) => {
  try {
    return sendSuccess(res, await service.listAdminContent());
  } catch (error) {
    return handleError(res, error);
  }
};

// Admin: GET page by database ID
export const getContentAdminById = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = getRouteParam(req.params.id, 'id');

    return sendSuccess(
      res,
      await service.getAdminContent(id),
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// Admin: CREATE a draft
export const createContentAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    return sendSuccess(
      res,
      await service.createContent(req.body),
      'Content created successfully',
      201,
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// Admin: UPDATE a page
export const updateContentAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = getRouteParam(req.params.id, 'id');

    return sendSuccess(
      res,
      await service.updateContent(id, req.body),
      'Content updated successfully',
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// Admin: PUBLISH
export const publishContentAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = getRouteParam(req.params.id, 'id');

    return sendSuccess(
      res,
      await service.publishContent(id),
      'Content published successfully',
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// Admin: UNPUBLISH
export const unpublishContentAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = getRouteParam(req.params.id, 'id');

    return sendSuccess(
      res,
      await service.unpublishContent(id),
      'Content unpublished successfully',
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// Admin: DELETE
export const deleteContentAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = getRouteParam(req.params.id, 'id');

    return sendSuccess(
      res,
      await service.deleteContent(id),
      'Content deleted successfully',
    );
  } catch (error) {
    return handleError(res, error);
  }
};
