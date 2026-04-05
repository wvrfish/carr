const smartcar = require('smartcar');
const { parse, serialize } = require('cookie');
const { cors } = require('../_cors');

const client = new smartcar.AuthClient({
  clientId: process.env.SMARTCAR_CLIENT_ID,
  clientSecret: process.env.SMARTCAR_CLIENT_SECRET,
  redirectUri: process.env.SMARTCAR_REDIRECT_URI,
  testMode: process.env.SMARTCAR_TEST_MODE === 'true',
});

async function getValidAccessToken(req, res) {
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

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  const accessToken = await getValidAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const vehicle = new smartcar.Vehicle(id, accessToken);

  // Fetch all data concurrently
  const [attributes, location, odometer, vin] = await Promise.allSettled([
    vehicle.attributes(),
    vehicle.location(),
    vehicle.odometer(),
    vehicle.vin(),
  ]);

  const result = {
    id,
    attributes: attributes.status === 'fulfilled' ? attributes.value : null,
    location: location.status === 'fulfilled' ? location.value : null,
    odometer: odometer.status === 'fulfilled' ? odometer.value : null,
    vin: vin.status === 'fulfilled' ? vin.value : null,
  };

  res.status(200).json(result);
};
