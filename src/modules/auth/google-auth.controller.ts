
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { prisma } from '../../config/database';
import { verifyGoogleIdToken } from './google-auth.service';

export async function googleLogin(req: Request, res: Response) {
  try {
    const { idToken } = req.body;

    if (typeof idToken !== 'string' || !idToken.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    const profile = await verifyGoogleIdToken(idToken);

    if (!profile.googleId || !profile.email) {
      return res.status(401).json({
        success: false,
        message: 'Google account information is incomplete',
      });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: profile.googleId },
          { email: profile.email },
        ],
      },
    });

    if (!user) {
      // Generate a random password for Google-only accounts.
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          passwordHash,
        },
      });
    } else if (!user.googleId) {
      // Link the account only when your account-linking policy
      // confirms the Google email is verified.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
        },
      });
    } else if (user.googleId !== profile.googleId) {
      return res.status(409).json({
        success: false,
        message: 'This email is linked to another Google account',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '7d' },
    );

    // Never return password hashes or other private fields.
    const { passwordHash: _passwordHash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        accessToken,
        user: safeUser,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);

    return res.status(401).json({
      success: false,
      message: 'Google authentication failed',
    });
  }
}
