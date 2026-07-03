/**
 * Managed-scraper adapter — the "real canonical URL" source. RentCast gives us
 * cheap, legal metadata but often no listing URL; a managed scraping service
 * (Apify actor, HasData, etc.) returns structured listings *with* real deep links
 * to the source site. We call the managed API — we do NOT run a headless browser
 * ourselves (anti-bot, IP blocks, and cold starts make that unreliable on
 * serverless).
 *
 * Opt-in per deploy: if SCRAPER_PROVIDER is unset, isScraperEnabled() is false
 * and orchestrate.ts skips this entirely, so the app runs free on RentCast alone.
 *
 * Currently wired for Apify's run-sync-get-dataset-items endpoint. Env:
 *   SCRAPER_PROVIDER = apify        (enables this provider)
 *   APIFY_TOKEN      = <token>
 *   APIFY_ACTOR      = maxcopell/zillow-scraper   (or any Zillow/Apartments actor)
 */
import type { Listing, Source, SearchCriteria } from '../../../src/lib/types.js';
import { requireEnv, optionalEnv } from '../env.js';
import { cached, TTL, hashKey } from '../cache.js';
import { assertWithinBudget, recordSpend } from '../budgetGuard.js';

/** Whether a managed scraper is configured for this deploy. */
export function isScraperEnabled(): boolean {
  return Boolean(optionalEnv('SCRAPER_PROVIDER'));
}

/** Loose shape of a scraped listing row — actors vary, so every field is optional. */
interface ScrapedRow {
  id?: string | number;
  zpid?: string | number;
  address?: string;
  addressStreet?: string;
  addressCity?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  latLong?: { latitude?: number; longitude?: number };
  price?: number | string;
  unformattedPrice?: number;
  beds?: number;
  bedrooms?: number;
  detailUrl?: string;
  url?: string;
  statusType?: string;
}

/**
 * Fetch listings with real canonical URLs from the configured scraper. Returns
 * [] (never throws) when disabled or on any failure — it's an enrichment source
 * layered on top of RentCast, so a scraper hiccup must not break search.
 */
export async function fetchScrapedListings(
  criteria: Partial<SearchCriteria>
): Promise<Listing[]> {
  if (!isScraperEnabled()) return [];
  const city = (criteria.city || '').trim();
  if (!city) return [];

  try {
    return await runScraper(city, criteria);
  } catch (err) {
    // Log and degrade — RentCast results still flow through orchestrate.ts.
    console.error('[scraper] fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

async function runScraper(city: string, criteria: Partial<SearchCriteria>): Promise<Listing[]> {
  const cacheKey = `listings:scraper:${hashKey(
    JSON.stringify({ city, maxRent: criteria.maxRent, beds: criteria.bedrooms })
  )}`;

  return cached(cacheKey, TTL.listings, async () => {
    await assertWithinBudget();

    const token = requireEnv('APIFY_TOKEN');
    const actor = optionalEnv('APIFY_ACTOR') || 'maxcopell/zillow-scraper';
    // Apify actor ids use "user/name"; the API path wants "user~name".
    const actorPath = actor.replace('/', '~');

    const res = await fetch(
      `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: city,
          locationQuery: city,
          maxItems: 25,
          rentalOnly: true,
        }),
      }
    );
    await recordSpend('scraper');

    if (!res.ok) {
      throw new Error(`Scraper error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const rows = (await res.json()) as ScrapedRow[];
    return rows.map(mapScraped).filter((l): l is Listing => l !== null);
  });
}

const SOURCE: Source = 'zillow';

function mapScraped(r: ScrapedRow): Listing | null {
  const lat = r.latitude ?? r.latLong?.latitude;
  const lng = r.longitude ?? r.latLong?.longitude;
  const rent = toNumber(r.unformattedPrice ?? r.price);
  const url = r.detailUrl || r.url || '';
  // Require the essentials AND a real URL — a scraped row with no canonical link
  // adds nothing RentCast doesn't already provide.
  if (lat == null || lng == null || rent == null || !url) return null;

  const address = r.addressStreet || r.address || 'Address unavailable';
  const city = r.addressCity || r.city || '';
  return {
    id: String(r.zpid ?? r.id ?? `${SOURCE}-${hashKey(`${address}:${rent}`)}`),
    source: SOURCE,
    listingUrl: absolute(url),
    address,
    neighborhood: city,
    city,
    lat,
    lng,
    rentMonthly: rent,
    bedrooms: r.bedrooms ?? r.beds ?? 0,
    tags: [],
    ratingValue: null,
    ratingSource: 'aggregated',
    lastSeenAt: new Date().toISOString(),
  };
}

/** Zillow detailUrls are sometimes site-relative ("/homedetails/..."). */
function absolute(url: string): string {
  if (url.startsWith('http')) return url;
  return `https://www.zillow.com${url.startsWith('/') ? '' : '/'}${url}`;
}

function toNumber(v: number | string | undefined): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}
