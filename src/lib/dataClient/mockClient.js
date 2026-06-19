/**
 * Mock implementation of the dataClient interface (Phase 0).
 *
 * Everything external is faked here behind the SAME function signatures the real
 * implementation will use. Swapping to real APIs later (Phase 1) means writing
 * an apiClient.js with these same four methods that call serverless `/api`
 * endpoints — the UI never changes.
 *
 *   getListings(criteria) -> Promise<Listing[]>
 *   getCommute(origin, destination, mode) -> Promise<Commute>
 *   getRating(building) -> Promise<Rating>
 *   geocode(address) -> Promise<GeoPoint>
 *
 * @typedef {import('../types.js').Listing} Listing
 * @typedef {import('../types.js').SearchCriteria} SearchCriteria
 * @typedef {import('../types.js').Commute} Commute
 * @typedef {import('../types.js').Rating} Rating
 * @typedef {import('../types.js').GeoPoint} GeoPoint
 * @typedef {import('../types.js').CommuteMode} CommuteMode
 */
import { MOCK_LISTINGS } from '../mockData/listings.js';
import { MOCK_REVIEWS } from '../mockData/reviews.js';
import { CITY_CENTROIDS, KNOWN_ADDRESSES } from '../mockData/geo.js';

/** Simulate network latency so loading states are exercised in the prototype. */
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

/**
 * Return minimal listing METADATA matching the criteria. The app links out for
 * the full listing. We filter by city only here; finer ranking is the scorer's
 * job (we don't want to hard-exclude near-budget listings before scoring).
 * @param {SearchCriteria} criteria
 * @returns {Promise<Listing[]>}
 */
export async function getListings(criteria) {
  await delay();
  const city = (criteria?.city || '').trim().toLowerCase();
  let results = MOCK_LISTINGS;
  if (city) {
    results = results.filter((l) => l.city.toLowerCase() === city);
  }
  // Defensive copy so callers can't mutate the fixture.
  return results.map((l) => ({ ...l, tags: [...l.tags] }));
}

/**
 * Estimate commute minutes between two points for a given mode. Mocked with a
 * haversine distance and per-mode average speeds + a small fixed overhead
 * (parking, waiting for transit, etc.).
 * @param {GeoPoint} origin
 * @param {GeoPoint} destination
 * @param {CommuteMode} mode
 * @returns {Promise<Commute>}
 */
export async function getCommute(origin, destination, mode) {
  await delay(200);
  const km = haversineKm(origin, destination);

  /** average speed km/h + fixed overhead minutes per mode */
  const profile = {
    walk: { kmh: 4.8, overhead: 0 },
    bike: { kmh: 15, overhead: 2 },
    transit: { kmh: 22, overhead: 8 },
    drive: { kmh: 30, overhead: 5 },
  }[mode] || { kmh: 25, overhead: 5 };

  const minutes = Math.round((km / profile.kmh) * 60 + profile.overhead);
  return { minutes: Math.max(1, minutes), mode };
}

/**
 * Return ONE rating value for a building, computed behind the scenes from a
 * layered, weighted blend of external (scraped/Places) data and first-party
 * reviews. As first-party review count grows, its weight grows — modeling the
 * cold-start handoff. If data is too sparse, returns { value: null } and the UI
 * shows "Not enough info" — we never fabricate a number.
 * @param {Listing} building
 * @returns {Promise<Rating>}
 */
export async function getRating(building) {
  await delay(150);
  return blendRating(building);
}

/**
 * Synchronous version of the rating blend — handy for scoring loops that already
 * hold the listing and don't want an extra await per item. Same logic as
 * getRating, minus the simulated latency.
 * @param {Listing} building
 * @returns {Rating}
 */
export function blendRating(building) {
  const firstParty = MOCK_REVIEWS.filter((r) => r.listingId === building.id);
  const externalValue = building.ratingValue; // may be null
  const externalSource = building.ratingSource || 'aggregated';

  if (firstParty.length === 0) {
    if (externalValue == null) return { value: null, source: 'aggregated' };
    return { value: round1(externalValue), source: externalSource };
  }

  // First-party average, weighting verified (lived-here) reviews 2x.
  let fpWeightSum = 0;
  let fpScoreSum = 0;
  for (const r of firstParty) {
    const w = r.livedHereVerified ? 2 : 1;
    fpWeightSum += w;
    fpScoreSum += r.stars * w;
  }
  const fpAvg = fpScoreSum / fpWeightSum;

  if (externalValue == null) {
    return { value: round1(fpAvg), source: 'platform-users' };
  }

  // Blend: first-party weight grows with review count, capped at 0.8.
  // 1 review -> ~0.27, 3 -> ~0.55, 6+ -> approaches 0.8.
  const fpBlendWeight = Math.min(0.8, firstParty.length / (firstParty.length + 4) + 0.1);
  const blended = fpAvg * fpBlendWeight + externalValue * (1 - fpBlendWeight);
  return { value: round1(blended), source: 'aggregated' };
}

/**
 * Turn a typed address into coordinates. Mocked: matches a few well-known work
 * locations, otherwise falls back to the city centroid so the demo always
 * produces a sensible commute rather than failing.
 * @param {string} address
 * @param {string} [cityHint]
 * @returns {Promise<GeoPoint>}
 */
export async function geocode(address, cityHint) {
  await delay(120);
  const q = (address || '').toLowerCase();

  for (const known of KNOWN_ADDRESSES) {
    if (q.includes(known.match)) return { lat: known.lat, lng: known.lng };
  }
  // Match an embedded city name in the address.
  for (const [city, point] of Object.entries(CITY_CENTROIDS)) {
    if (q.includes(city.toLowerCase())) return { ...point };
  }
  if (cityHint && CITY_CENTROIDS[cityHint]) return { ...CITY_CENTROIDS[cityHint] };

  // Last resort: SF centroid. Real geocoder would error; the mock degrades.
  return { ...CITY_CENTROIDS['San Francisco'] };
}

// ---- helpers ----

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const toRad = (deg) => (deg * Math.PI) / 180;
const round1 = (n) => Math.round(n * 10) / 10;

/** Expose reviews for the detail view (first-party reviews exist from day one). */
export async function getReviews(listingId) {
  await delay(150);
  return MOCK_REVIEWS.filter((r) => r.listingId === listingId).map((r) => ({ ...r }));
}
