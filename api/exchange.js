const smartcar = require('smartcar');
const { cors } = require('./_cors');

const client = new smartcar.AuthClient({
  clientId: process.env.SMARTCAR_CLIENT_ID,
  clientSecret: process.env.SMARTCAR_CLIENT_SECRET,
  redirectUri: process.env.SMARTCAR_REDIRECT_URI,
  testMode: process.env.SMARTCAR_TEST_MODE === 'true',
});

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  // If the client (e.g. iOS) used a different redirect URI than the default,
  // create a one-off AuthClient with that URI — Smartcar requires it to match
  // exactly what was used when opening Connect.
  const exchangeClient = redirectUri
    ? new smartcar.AuthClient({
        clientId: process.env.SMARTCAR_CLIENT_ID,
        clientSecret: process.env.SMARTCAR_CLIENT_SECRET,
        redirectUri,
        testMode: process.env.SMARTCAR_TEST_MODE === 'true',
      })
    : client;

  const tokens = await exchangeClient.exchangeCode(code);

  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiration: tokens.expiration,
  });
};
