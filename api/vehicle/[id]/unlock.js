const smartcar = require('smartcar');
const { cors } = require('../../_cors');
const { getValidAccessToken } = require('../../_auth');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  const accessToken = await getValidAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const vehicle = new smartcar.Vehicle(id, accessToken);
  await vehicle.unlock();

  res.status(200).json({ success: true });
};
