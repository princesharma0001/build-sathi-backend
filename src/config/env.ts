// import dotenv from 'dotenv';

// dotenv.config();

// export const env = {
//   port: Number(process.env.PORT || 5000),

//   databaseUrl: process.env.DATABASE_URL || '',

//   jwtSecret:
//     process.env.JWT_SECRET || 'buildsathi_development_secret',

//   jwtExpiresIn:
//     process.env.JWT_EXPIRES_IN || '7d',

//   nodeEnv:
//     process.env.NODE_ENV || 'development',

//   clientUrl:
//     process.env.CLIENT_URL || '*',

//   resendApiKey:
//     process.env.RESEND_API_KEY || '',

//   resendFromEmail:
//     process.env.RESEND_FROM_EMAIL ||
//     'BuildSathi <onboarding@resend.dev>',
// };

import dotenv from 'dotenv';

dotenv.config();

type EmailProvider = 'smtp' | 'resend' | 'console';

const resendApiKey = process.env.RESEND_API_KEY || '';

export const env = {
  port: Number(process.env.PORT || 5000),

  databaseUrl: process.env.DATABASE_URL || '',

  jwtSecret:
    process.env.JWT_SECRET || 'buildsathi_development_secret',

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN || '7d',

  nodeEnv:
    process.env.NODE_ENV || 'development',

  clientUrl:
    process.env.CLIENT_URL || '*',

  // ---- Email provider: smtp | resend | console ----
  // console = prints OTP in the server terminal (local testing only)
  emailProvider: (process.env.EMAIL_PROVIDER ||
    (resendApiKey ? 'resend' : 'console')) as EmailProvider,

  // ---- Resend ----
  resendApiKey,
  resendFromEmail:
    process.env.RESEND_FROM_EMAIL ||
    'NeevSathi <onboarding@resend.dev>',

  // ---- SMTP ----
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom:
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'NeevSathi <no-reply@localhost>',
};