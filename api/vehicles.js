const smartcar = require('smartcar');
const { cors } = require('./_cors');
const { getValidAccessToken } = require('./_auth');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

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
};
