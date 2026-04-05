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

  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Missing refreshToken' });
  }

  const tokens = await client.exchangeRefreshToken(refreshToken);

  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiration: tokens.expiration,
  });
};
