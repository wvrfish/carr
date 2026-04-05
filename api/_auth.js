const smartcar = require('smartcar');
const { parse, serialize } = require('cookie');

const client = new smartcar.AuthClient({
  clientId: process.env.SMARTCAR_CLIENT_ID,
  clientSecret: process.env.SMARTCAR_CLIENT_SECRET,
  redirectUri: process.env.SMARTCAR_REDIRECT_URI,
  testMode: process.env.SMARTCAR_TEST_MODE === 'true',
});

/**
 * Extracts a valid access token from the request.
 * Supports two auth strategies:
 *   1. Bearer token in Authorization header (iOS / native clients)
 *   2. httpOnly cookies with automatic refresh (web clients)
 *
 * Returns the access token string, or null if not authenticated.
 */
async function getValidAccessToken(req, res) {
  // --- Bearer token (iOS) ---
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // --- Cookie-based (web) ---
  const cookies = parse(req.headers.cookie || '');
  const { sc_access_token, sc_refresh_token, sc_token_expiry } = cookies;

  if (!sc_refresh_token) {
    return null;
  }

  const isExpired = !sc_token_expiry || new Date(sc_token_expiry) <= new Date();
  if (!sc_access_token || isExpired) {
    const tokens = await client.exchangeRefreshToken(sc_refresh_token);

    res.setHeader('Set-Cookie', [
      serialize('sc_access_token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2,
      }),
      serialize('sc_token_expiry', tokens.expiration.toISOString(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2,
      }),
    ]);

    return tokens.accessToken;
  }

  return sc_access_token;
}

module.exports = { getValidAccessToken };
