const smartcar = require('smartcar');

const client = new smartcar.AuthClient({
  clientId: process.env.SMARTCAR_CLIENT_ID,
  clientSecret: process.env.SMARTCAR_CLIENT_SECRET,
  redirectUri: process.env.SMARTCAR_REDIRECT_URI,
  testMode: process.env.SMARTCAR_TEST_MODE === 'true',
});

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Generate a random state value to prevent CSRF attacks
  const state = Math.random().toString(36).slice(2);

  const authUrl = client.getAuthUrl(
    ['read_vehicle_info', 'read_location', 'read_odometer', 'read_vin'],
    { state, forcePrompt: true }
  );

  res.redirect(authUrl);
};
