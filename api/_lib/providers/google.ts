/**
 * Google adapter — geocoding (Geocoding API) + commute times (Routes API).
 * Drop-in replacement for the TravelTime provider: identical geocode()/commute()
 * signatures, so swapping providers is just changing imports. Uses the single
 * GOOGLE_MAPS_API_KEY (the same key also powers Places ratings).
 *
 * Docs:
 *   Geocoding: https://developers.google.com/maps/documentation/geocoding
 *   Routes:    https://developers.google.com/maps/documentation/routes
 *
 * Results are cached the same way: geocodes ~forever, commute times for weeks
 * keyed by (originHash, destHash, mode).
 */
import type { GeoPoint, Commute, CommuteMode } from '../../../src/lib/types';
import { requireEnv } from '../env';
import { cached, TTL, hashKey } from '../cache';
import { assertWithinBudget, recordSpend } from '../budgetGuard';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Map our commute modes to Google Routes travelMode values. */
const TRAVEL_MODE: Record<CommuteMode, string> = {
  walk: 'WALK',
  bike: 'BICYCLE',
  transit: 'TRANSIT',
  drive: 'DRIVE',
};

export async function geocode(address: string): Promise<GeoPoint> {
  const q = address.trim();
  if (!q) throw new Error('geocode: empty address');
  const apiKey = requireEnv('GOOGLE_MAPS_API_KEY');

  return cached(`geocode:${hashKey(q.toLowerCase())}`, TTL.geocode, async () => {
    await assertWithinBudget();
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(q)}&key=${apiKey}`;
    const res = await fetch(url);
    await recordSpend('geocode');
    if (!res.ok) throw new Error(`Google geocode ${res.status}`);

    const data = (await res.json()) as {
      status: string;
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };
    const loc = data.results?.[0]?.geometry?.location;
    if (data.status !== 'OK' || !loc) {
      throw new Error(`No geocode result for "${q}" (status: ${data.status})`);
    }
    return { lat: loc.lat, lng: loc.lng };
  });
}

export async function commute(
  origin: GeoPoint,
  destination: GeoPoint,
  mode: CommuteMode
): Promise<Commute> {
  const apiKey = requireEnv('GOOGLE_MAPS_API_KEY');
  const originHash = hashKey(`${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`);
  const destHash = hashKey(`${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`);
  const key = `commute:${originHash}:${destHash}:${mode}`;

  return cached(key, TTL.commute, async () => {
    await assertWithinBudget();

    const travelMode = TRAVEL_MODE[mode];
    const body: Record<string, unknown> = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode,
    };
    // Traffic-aware driving needs a departure time; other modes reject the field.
    if (travelMode === 'DRIVE') {
      body.routingPreference = 'TRAFFIC_AWARE';
      body.departureTime = new Date(Date.now() + 60_000).toISOString();
    }

    const res = await fetch(ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Field mask keeps the call cheap — only ask for the duration.
        'X-Goog-FieldMask': 'routes.duration',
      },
      body: JSON.stringify(body),
    });
    await recordSpend('routes');
    if (!res.ok) throw new Error(`Google Routes ${res.status}: ${await safeText(res)}`);

    const data = (await res.json()) as { routes?: Array<{ duration?: string }> };
    const duration = data.routes?.[0]?.duration; // e.g. "1234s"
    if (!duration) throw new Error('No route found');
    const seconds = parseInt(duration.replace('s', ''), 10);
    return { minutes: Math.max(1, Math.round(seconds / 60)), mode };
  });
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '<no body>';
  }
}
