import { Request, Response } from 'express';

import {
  adminLogin,
  forgotPassword,
  loginUser,
  registerUser,
  resendOtp,
  resetPassword,
  selectRole,
  verifyForgotPasswordOtp,
  verifyOtp,
} from './auth.service';

export const register = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Name, email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters',
      });
    }

    const result = await registerUser(
      name.trim(),
      email.trim().toLowerCase(),
      password,
    );

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Registration failed',
    });
  }
};

export const verifyEmailOtp = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      email,
      otp,
    } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits',
      });
    }

    const result = await verifyOtp(
      email.trim().toLowerCase(),
      otp,
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'OTP verification failed',
    });
  }
};

export const chooseRole = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      email,
      role,
    } = req.body || {};

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required',
      });
    }

    if (
      role !== 'BUYER' &&
      role !== 'SELLER'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Role must be BUYER or SELLER',
      });
    }

    const result = await selectRole(
      email.trim().toLowerCase(),
      role,
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Role selection failed',
    });
  }
};

export const login = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      email,
      password,
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Email and password are required',
      });
    }

    const result = await loginUser(
      email.trim().toLowerCase(),
      password,
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Login failed',
    });
  }
};

export const forgotPasswordController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {email} = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const result =
      await forgotPassword(cleanEmail);

    return res.status(200).json({
      success: true,
      message:
        'If an account exists with this email, an OTP has been sent',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to process forgot password request',
    });
  }
};


export const verifyForgotPasswordOtpController =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        email,
        otp,
      } = req.body || {};

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required',
        });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: 'OTP must be 6 digits',
        });
      }

      const result =
        await verifyForgotPasswordOtp(
          email.trim().toLowerCase(),
          otp,
        );

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'OTP verification failed',
      });
    }
  };


export const resetPasswordController =
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        email,
        otp,
        newPassword,
      } = req.body || {};

      if (
        !email ||
        !otp ||
        !newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Email, OTP and new password are required',
        });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: 'OTP must be 6 digits',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message:
            'Password must be at least 8 characters',
        });
      }

      const result =
        await resetPassword(
          email.trim().toLowerCase(),
          otp,
          newPassword,
        );

      return res.status(200).json({
        success: true,
        message:
          'Password reset successfully',
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Password reset failed',
      });
    }
  };

  export const resendOtpController = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {email} = req.body;
  
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }
  
      const result = await resendOtp(email);
  
      return res.status(200).json({
        success: true,
        message: 'OTP resent successfully',
        data: result,
      });
    } catch (error: any) {
      console.error(
        'RESEND OTP ERROR:',
        error,
      );
  
      if (error?.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
  
      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Unable to resend OTP',
      });
    }
  };


export const adminLoginController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await adminLogin(email, password);

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: result,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message || "Admin login failed",
    });
  }
};