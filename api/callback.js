const smartcar = require('smartcar');
const { serialize } = require('cookie');

const client = new smartcar.AuthClient({
  clientId: process.env.SMARTCAR_CLIENT_ID,
  clientSecret: process.env.SMARTCAR_CLIENT_SECRET,
  redirectUri: process.env.SMARTCAR_REDIRECT_URI,
  testMode: process.env.SMARTCAR_TEST_MODE === 'true',
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 60, // 60 days (matches Smartcar refresh token lifetime)
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { code, error } = req.query;

  if (error) {
    const frontendUrl = process.env.FRONTEND_URL || '/';
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  const tokens = await client.exchangeCode(code);

  // Store tokens in httpOnly cookies so the browser can't access them via JS
  res.setHeader('Set-Cookie', [
    serialize('sc_access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 2, // 2 hours (Smartcar access token lifetime)
    }),
    serialize('sc_refresh_token', tokens.refreshToken, COOKIE_OPTIONS),
    serialize('sc_token_expiry', tokens.expiration.toISOString(), {
      ...COOKIE_OPTIONS,
      httpOnly: false, // Allow frontend to read expiry for proactive refresh
    }),
  ]);

  const frontendUrl = process.env.FRONTEND_URL || '/';
  res.redirect(`${frontendUrl}/dashboard`);
};
