const smartcar = require('smartcar');
const { cors } = require('../../_cors');
const { getValidAccessToken } = require('../../_auth');

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

  const [attributes, location, odometer, vin] = await Promise.allSettled([
    vehicle.attributes(),
    vehicle.location(),
    vehicle.odometer(),
    vehicle.vin(),
  ]);

  res.status(200).json({
    id,
    attributes: attributes.status === 'fulfilled' ? attributes.value : null,
    location: location.status === 'fulfilled' ? location.value : null,
    odometer: odometer.status === 'fulfilled' ? odometer.value : null,
    vin: vin.status === 'fulfilled' ? vin.value : null,
  });
};
