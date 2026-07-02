/**
 * GET /api/geocode?address=...  → { lat, lng }
 * Thin, key-protected wrapper over Google geocoding (cached ~forever).
 */
import { withHandler } from './_lib/handler.js';
import { HttpError } from './_lib/env.js';
import { geocode } from './_lib/providers/google.js';

export default withHandler('GET', async (req) => {
  const address = typeof req.query.address === 'string' ? req.query.address : '';
  if (!address.trim()) throw new HttpError(400, 'Query param "address" is required.');
  return await geocode(address);
});
