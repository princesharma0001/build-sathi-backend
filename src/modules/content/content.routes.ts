
import { Router } from 'express';
import * as controller from './content.controller';

export const publicContentRouter = Router();
export const adminContentRouter = Router();

// Public routes
publicContentRouter.get('/', controller.getPublishedContent);
publicContentRouter.get('/:slug', controller.getPublishedContentBySlug);

// Admin routes
adminContentRouter.get('/', controller.getAllContentAdmin);
adminContentRouter.get('/:id', controller.getContentAdminById);
adminContentRouter.post('/', controller.createContentAdmin);
adminContentRouter.put('/:id', controller.updateContentAdmin);
adminContentRouter.patch('/:id/publish', controller.publishContentAdmin);
adminContentRouter.patch('/:id/unpublish', controller.unpublishContentAdmin);
adminContentRouter.delete('/:id', controller.deleteContentAdmin);
