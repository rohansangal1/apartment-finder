/** Formatting + outbound-link helpers shared across views. */
import type { Listing, CommuteMode, Source } from './types';

export function formatRent(n: number): string {
  return `$${n.toLocaleString('en-US')}/mo`;
}

export function formatBeds(beds: number): string {
  return beds === 0 ? 'Studio' : `${beds} bd`;
}

export function formatCommute(minutes: number, mode: CommuteMode): string {
  const label: Record<CommuteMode, string> = {
    walk: 'walk',
    transit: 'transit',
    bike: 'bike',
    drive: 'drive',
  };
  return `${minutes} min ${label[mode] ?? mode}`;
}

/** Title-case a source enum for display, e.g. 'apartments_com' -> 'Apartments.com'. */
export function sourceLabel(source: Source): string {
  const map: Record<Source, string> = {
    rentcast: 'RentCast',
    apartments_com: 'Apartments.com',
    zillow: 'Zillow',
    mock: 'Demo data',
  };
  return map[source] ?? source;
}

export function ratingSourceLabel(source: string): string {
  const map: Record<string, string> = {
    google: 'Google reviews',
    yelp: 'Yelp',
    'platform-users': 'Verified residents',
    aggregated: 'Aggregated sources',
  };
  return map[source] ?? source;
}

/**
 * Graceful link-rot handling. City listings turn over fast, so if a listingUrl
 * is known-stale (or missing) we degrade to a SEARCH url on the source site
 * rather than ever showing a broken link.
 *
 * In Phase 2 a cron job marks `last_seen_at`-stale links; here we accept an
 * explicit `isStale` flag and otherwise trust the deep link.
 */
/** Days after `lastSeenAt` beyond which a listing is treated as possibly gone. */
export const STALE_AFTER_DAYS = 21;

/**
 * True when a listing was last seen live long enough ago that its link may have
 * rotted. Listings with no `lastSeenAt` are treated as fresh (we can't tell).
 */
export function isListingStale(listing: Listing, now: number = Date.now()): boolean {
  if (!listing.lastSeenAt) return false;
  const seen = Date.parse(listing.lastSeenAt);
  if (Number.isNaN(seen)) return false;
  return now - seen > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export function resolveListingUrl(
  listing: Listing,
  isStale = false
): { url: string; isFallback: boolean } {
  if (listing.listingUrl && !isStale) {
    return { url: listing.listingUrl, isFallback: false };
  }
  return { url: buildSearchFallback(listing), isFallback: true };
}

function buildSearchFallback(listing: Listing): string {
  // We often don't know which site actually hosts the listing (aggregators like
  // RentCast don't always give a canonical URL). Rather than a generic web
  // search, deep-link into Zillow's rental search for the *specific address* —
  // the dominant rental portal, so this surfaces the real listing (or the closest
  // live one) far more often than a Google query, and never a dead detail page.
  const slug = addressSlug(`${listing.address} ${listing.city}`);
  if (slug) return `https://www.zillow.com/homes/for_rent/${slug}_rb/`;

  // No usable address text — fall back to a precise map pin for the coordinates.
  return `https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`;
}

/**
 * Turn a free-form address into Zillow's URL slug form: alphanumerics kept,
 * runs of anything else collapsed to single hyphens (e.g. "123 Main St, Austin
 * TX" -> "123-Main-St-Austin-TX"). Returns '' when nothing usable remains.
 */
function addressSlug(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
