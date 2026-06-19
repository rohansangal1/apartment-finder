/** Formatting + outbound-link helpers shared across views. */

export function formatRent(n) {
  return `$${n.toLocaleString('en-US')}/mo`;
}

export function formatBeds(beds) {
  return beds === 0 ? 'Studio' : `${beds} bd`;
}

export function formatCommute(minutes, mode) {
  const label = { walk: 'walk', transit: 'transit', bike: 'bike', drive: 'drive' }[mode] || mode;
  return `${minutes} min ${label}`;
}

/** Title-case a source enum for display, e.g. 'apartments_com' -> 'Apartments.com'. */
export function sourceLabel(source) {
  return (
    {
      rentcast: 'RentCast',
      apartments_com: 'Apartments.com',
      zillow: 'Zillow',
      mock: 'Demo data',
    }[source] || source
  );
}

export function ratingSourceLabel(source) {
  return (
    {
      google: 'Google reviews',
      yelp: 'Yelp',
      'platform-users': 'Verified residents',
      aggregated: 'Aggregated sources',
    }[source] || source
  );
}

/**
 * Graceful link-rot handling. City listings turn over fast, so if a listingUrl
 * is known-stale (or missing) we degrade to a SEARCH url on the source site
 * rather than ever showing a broken link.
 *
 * In Phase 2 a cron job marks `last_seen_at`-stale links; here we accept an
 * explicit `isStale` flag and otherwise trust the deep link.
 *
 * @param {import('./types.js').Listing} listing
 * @param {boolean} [isStale]
 * @returns {{ url: string, isFallback: boolean }}
 */
export function resolveListingUrl(listing, isStale = false) {
  if (listing.listingUrl && !isStale) {
    return { url: listing.listingUrl, isFallback: false };
  }
  return { url: buildSearchFallback(listing), isFallback: true };
}

function buildSearchFallback(listing) {
  const query = encodeURIComponent(`${listing.address} ${listing.city}`);
  switch (listing.source) {
    case 'zillow':
      return `https://www.zillow.com/homes/${query}_rb/`;
    case 'apartments_com':
    case 'rentcast':
    case 'mock':
    default:
      return `https://www.apartments.com/${encodeURIComponent(
        listing.city.toLowerCase().replace(/\s+/g, '-')
      )}/?q=${query}`;
  }
}
