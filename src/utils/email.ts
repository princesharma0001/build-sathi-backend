import nodemailer, {Transporter} from 'nodemailer';

import {env} from '../config/env';

const SUBJECT = 'Your NeevSathi verification code';

const buildHtml = (otp: string) => `
  <div
    style="
      font-family: Arial, sans-serif;
      max-width: 520px;
      margin: 0 auto;
      padding: 30px;
      background: #fff8ee;
      border-radius: 16px;
    "
  >
    <h2 style="color: #ff7a00;">
      NeevSathi
    </h2>

    <p style="font-size: 16px; color: #333;">
      Your verification code is:
    </p>

    <div
      style="
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 8px;
        color: #0a0a0a;
        margin: 20px 0;
      "
    >
      ${otp}
    </div>

    <p style="color: #666;">
      This OTP will expire in 10 minutes.
    </p>

    <p style="font-size: 13px; color: #999;">
      If you did not request this code, please ignore this email.
    </p>
  </div>
`;

const buildText = (otp: string) =>
  `Your NeevSathi verification code is ${otp}. It expires in 10 minutes.`;

// =====================================================
// SMTP TRANSPORTER
// =====================================================

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) {
    return transporter;
  }

  if (!env.smtpHost) {
    throw new Error('SMTP_HOST is not configured');
  }

  if (!env.smtpUser) {
    throw new Error('SMTP_USER is not configured');
  }

  if (!env.smtpPass) {
    throw new Error('SMTP_PASS is not configured');
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
};

// =====================================================
// SMTP OTP EMAIL
// =====================================================

const sendViaSmtp = async (
  email: string,
  otp: string,
) => {
  const mailTransporter = getTransporter();

  const info = await mailTransporter.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to: email,
    subject: SUBJECT,
    text: buildText(otp),
    html: buildHtml(otp),
  });

  console.log(
    `📧 OTP email sent to ${email}`,
  );

  console.log(
    `📨 Message ID: ${info.messageId}`,
  );

  return {
    provider: 'smtp',
    id: info.messageId,
  };
};

// =====================================================
// RESEND
// =====================================================

const sendViaResend = async (
  email: string,
  otp: string,
) => {
  if (!env.resendApiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured',
    );
  }

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [email],
        subject: SUBJECT,
        text: buildText(otp),
        html: buildHtml(otp),
      }),
    },
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Resend API error (${response.status}): ${body}`,
    );
  }

  return {
    provider: 'resend',
    ...JSON.parse(body),
  };
};

// =====================================================
// CONSOLE
// =====================================================

const sendViaConsole = async (
  email: string,
  otp: string,
) => {
  if (env.nodeEnv === 'production') {
    throw new Error(
      'EMAIL_PROVIDER=console is not allowed in production',
    );
  }

  console.log('');
  console.log('=============================');
  console.log(`📧 [DEV OTP] to: ${email}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log('=============================');
  console.log('');

  return {
    provider: 'console',
  };
};

// =====================================================
// PUBLIC API
// =====================================================

export const sendOtpEmail = async (
  email: string,
  otp: string,
) => {
  switch (env.emailProvider) {
    case 'smtp':
      return sendViaSmtp(email, otp);

    case 'resend':
      return sendViaResend(email, otp);

    case 'console':
      return sendViaConsole(email, otp);

    default:
      throw new Error(
        `Unknown EMAIL_PROVIDER: ${env.emailProvider}`,
      );
  }
};