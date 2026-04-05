import smartcar from 'smartcar';
import { parse, serialize } from 'cookie';

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

  // Refresh if expired or missing
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = await getValidAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { vehicles } = await smartcar.getVehicles(accessToken);

  const vehicleDetails = await Promise.all(
    vehicles.map(async (vehicleId) => {
      const vehicle = new smartcar.Vehicle(vehicleId, accessToken);
      const attributes = await vehicle.attributes();
      return {
        id: vehicleId,
        make: attributes.make,
        model: attributes.model,
        year: attributes.year,
      };
    })
  );

  res.status(200).json({ vehicles: vehicleDetails });
}
