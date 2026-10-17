import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_WEB_CLIENT_ID,
);

export async function verifyGoogleIdToken(idToken: string) {
  if (!idToken) {
    throw new Error('Google ID token is required');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_WEB_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new Error('Invalid Google account');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? '',
    picture: payload.picture ?? null,
  };
}