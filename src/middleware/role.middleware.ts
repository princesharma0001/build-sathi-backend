import {NextFunction, Response} from 'express';

import {AuthRequest} from './auth.middleware';

// Use AFTER authMiddleware:  router.post('/', authMiddleware, requireRole('SELLER'), handler)
export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };