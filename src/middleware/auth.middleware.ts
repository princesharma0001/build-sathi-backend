
import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';

import {env} from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authorization = req.headers.authorization;

    console.log('🔐 AUTHORIZATION HEADER:', authorization);

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required',
      });
    }

    const parts = authorization.split(' ');

    if (
      parts.length !== 2 ||
      parts[0] !== 'Bearer'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
      });
    }

    const token = parts[1];

    console.log('🔐 TOKEN RECEIVED:', token ? 'YES' : 'NO');

    const decoded = jwt.verify(
      token,
      env.jwtSecret,
    ) as {
      userId: string;
      role: string;
    };

    console.log('✅ JWT DECODED:', decoded);

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: userId missing',
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    console.log('✅ AUTH USER:', req.user);

    next();
  } catch (error) {
    console.log('❌ JWT VERIFY ERROR:', error);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};