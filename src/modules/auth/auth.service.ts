import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { sendOtpEmail } from "../../utils/email";
import { createNotification } from "../notifications/notification.service";

type Role = "BUYER" | "SELLER";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createToken = (userId: string, role: string) => {
  return jwt.sign(
    {
      userId,
      role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    }
  );
};

export const adminLogin = async (email: string, password: string) => {
  const admin = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase().trim(),
    },
  });

  if (!admin) {
    throw new Error("Invalid email or password");
  }

  if (admin.role !== "ADMIN") {
    throw new Error("Access denied. Admin account required.");
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    admin.passwordHash // ✅ important
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      userId: admin.id,
      role: admin.role,
      email: admin.email,
    },
    secret,
    {
      expiresIn: "7d",
    }
  );

  return {
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
};

// REGISTER
export const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const existingRegistration = await prisma.registrationOtp.findUnique({
    where: {
      email,
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  const otp = generateOtp();

  const otpHash = await bcrypt.hash(otp, 10);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  if (existingRegistration) {
    await prisma.registrationOtp.update({
      where: { email },
      data: {
        name,
        passwordHash,
        otpHash,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });
  } else {
    await prisma.registrationOtp.create({
      data: {
        name,
        email,
        passwordHash,
        otpHash,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });
  }

  await sendOtpEmail(email, otp);
  return {
    email,
    message: "OTP sent to your email",
  };
};

// VERIFY OTP
export const verifyOtp = async (email: string, otp: string) => {
  const registration = await prisma.registrationOtp.findUnique({
    where: {
      email,
    },
  });

  if (!registration) {
    throw new Error("Registration session not found");
  }

  if (registration.verified) {
    return {
      verified: true,
      email,
    };
  }

  if (registration.expiresAt < new Date()) {
    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (registration.attempts >= 5) {
    throw new Error("Too many incorrect attempts. Please request a new OTP");
  }

  const otpMatch = await bcrypt.compare(otp, registration.otpHash);

  if (!otpMatch) {
    await prisma.registrationOtp.update({
      where: {
        email,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    throw new Error("Invalid OTP");
  }

  await prisma.registrationOtp.update({
    where: {
      email,
    },
    data: {
      verified: true,
    },
  });

  return {
    verified: true,
    email,
  }; 
};

export const selectRole = async (email: string, role: Role) => {
  const normalizedEmail = email.trim().toLowerCase();

  const registration = await prisma.registrationOtp.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!registration) {
    throw new Error("Registration session not found");
  }

  if (!registration.verified) {
    throw new Error("Please verify your email first");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new Error("User account already exists");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create user
    // FREE quotations are managed through
    // User.freeQuotesUsed.
    const user = await tx.user.create({
      data: {
        name: registration.name,
        email: registration.email,
        passwordHash: registration.passwordHash,
        role,

        // Start seller's FREE quotation counter from 0
        ...(role === "SELLER"
          ? {
              freeQuotesUsed: 0,
            }
          : {}),
      },
    });

    // 2. Do NOT create FREE SellerSubscription
    //
    // FREE quotation quota is handled by:
    //
    // User.freeQuotesUsed
    //
    // PLUS / PRO subscriptions will be created
    // separately when the seller purchases/upgrades.

    // 3. Delete registration OTP
    await tx.registrationOtp.delete({
      where: {
        email: normalizedEmail,
      },
    });

    return {
      user,
      subscription: null,
    };
  });

  // 4. Create login token
  const token = createToken(result.user.id, result.user.role);

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      status: result.user.status,
    },

    subscription: null,

    token,
  };
};

// SELECT ROLE + CREATE USER
// export const selectRole = async (email: string, role: Role) => {
//   const registration = await prisma.registrationOtp.findUnique({
//     where: {
//       email,
//     },
//   });

//   if (!registration) {
//     throw new Error("Registration session not found");
//   }

//   if (!registration.verified) {
//     throw new Error("Please verify your email first");
//   }

//   const existingUser = await prisma.user.findUnique({
//     where: {
//       email,
//     },
//   });

//   if (existingUser) {
//     throw new Error("User account already exists");
//   }

//   const user = await prisma.user.create({
//     data: {
//       name: registration.name,
//       email: registration.email,
//       passwordHash: registration.passwordHash,
//       role,
//     },
//   });

//   await prisma.registrationOtp.delete({
//     where: {
//       email,
//     },
//   });

//   const token = createToken(user.id, user.role);

//   return {
//     user: {
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       status: user.status,
//     },
//     token,
//   };
// };


// LOGIN
export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Your account is not active");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const token = createToken(user.id, user.role);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    token,
  };
};




// ============================================
// FORGOT PASSWORD
// ============================================

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  /*
   * Security:
   * User exist kare ya nahi, same response denge.
   * Isse attacker email existence discover nahi kar sakta.
   */
  if (!user) {
    return {
      email,
      otpSent: true,
    };
  }

  const otp = generateOtp();

  const otpHash = await bcrypt.hash(otp, 10);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const existingOtp = await prisma.passwordResetOtp.findUnique({
    where: {
      email,
    },
  });

  if (existingOtp) {
    await prisma.passwordResetOtp.update({
      where: {
        email,
      },
      data: {
        otpHash,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });
  } else {
    await prisma.passwordResetOtp.create({
      data: {
        email,
        otpHash,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });
  }

  await sendOtpEmail(email, otp);

  console.log(`🔐 Password reset OTP sent to ${email}`);

  return {
    email,
    otpSent: true,
  };
};

// ============================================
// VERIFY FORGOT PASSWORD OTP
// ============================================

export const verifyForgotPasswordOtp = async (email: string, otp: string) => {
  const resetOtp = await prisma.passwordResetOtp.findUnique({
    where: {
      email,
    },
  });

  if (!resetOtp) {
    throw new Error("Password reset session not found");
  }

  if (resetOtp.expiresAt < new Date()) {
    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (resetOtp.attempts >= 5) {
    throw new Error("Too many incorrect attempts. Please request a new OTP");
  }

  const otpMatch = await bcrypt.compare(otp, resetOtp.otpHash);

  if (!otpMatch) {
    await prisma.passwordResetOtp.update({
      where: {
        email,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    throw new Error("Invalid OTP");
  }

  await prisma.passwordResetOtp.update({
    where: {
      email,
    },
    data: {
      verified: true,
    },
  });

  return {
    verified: true,
    email,
  };
};

// ============================================
// RESET PASSWORD
// ============================================

export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string
) => {
  const resetOtp = await prisma.passwordResetOtp.findUnique({
    where: {
      email,
    },
  });

  if (!resetOtp) {
    throw new Error("Password reset session not found");
  }

  if (resetOtp.expiresAt < new Date()) {
    throw new Error("OTP has expired. Please request a new OTP");
  }

  /*
   * OTP must already be verified.
   */
  if (!resetOtp.verified) {
    throw new Error("Please verify OTP first");
  }

  /*
   * Check OTP again before changing password.
   */
  const otpMatch = await bcrypt.compare(otp, resetOtp.otpHash);

  if (!otpMatch) {
    throw new Error("Invalid OTP");
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
    },
  });

  /*
   * Delete OTP after successful password reset.
   */
  await prisma.passwordResetOtp.delete({
    where: {
      email,
    },
  });

  return {
    email,
    passwordReset: true,
  };
};

export const resendOtp = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const existingRegistration = await prisma.registrationOtp.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!existingRegistration) {
    throw new Error("Registration not found. Please start registration again.");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpHash = await bcrypt.hash(otp, 10);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.registrationOtp.update({
    where: {
      email: normalizedEmail,
    },
    data: {
      otpHash,
      expiresAt,
      verified: false,
      attempts: 0,
    },
  });

  await sendOtpEmail(normalizedEmail, otp);

  return {
    email: normalizedEmail,
    expiresAt,
  };
};
