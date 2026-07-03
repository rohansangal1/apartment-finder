/**
 * Server-side search orchestration — the paid mirror of src/lib/search-service.ts.
 * Doing this server-side hides keys and avoids many browser round-trips:
 *   listings (RentCast) → geocode origin (Google) → commute per listing
 *   (Google Routes) → blended rating (Places + first-party) → score → rank.
 *
 * Reuses the SAME pure scoring engine the client uses (src/lib/scoring.ts), so
 * scores are identical regardless of where they're computed.
 */
import type { SearchCriteria, ScoredListing, GeoPoint, Listing } from '../../src/lib/types.js';
import { scoreListing, computeSubScores, explainMatch } from '../../src/lib/scoring.js';
import { fetchListings } from './providers/rentcast.js';
import { fetchScrapedListings } from './providers/scraper.js';
import { geocode, commute } from './providers/google.js';
import { blendRating } from './ratings.js';

export async function orchestrateSearch(criteria: SearchCriteria): Promise<ScoredListing[]> {
  // RentCast for cheap coverage + (optionally) a managed scraper for real
  // canonical URLs. The scraper is opt-in and self-degrades to [], so this is
  // free/RentCast-only unless SCRAPER_PROVIDER is configured.
  const [rentcast, scraped] = await Promise.all([
    fetchListings(criteria),
    fetchScrapedListings(criteria),
  ]);
  const listings = mergeListings(rentcast, scraped);

  let origin: GeoPoint | null = null;
  if (criteria.inPerson && criteria.workAddress) {
    origin = await geocode(criteria.workAddress);
  }

  const scored = await Promise.all(
    listings.map(async (listing): Promise<ScoredListing> => {
      let commuteMinutes = 0;
      if (criteria.inPerson && origin) {
        const c = await commute(origin, { lat: listing.lat, lng: listing.lng }, criteria.commuteMode);
        commuteMinutes = c.minutes;
      }

      const rating = await blendRating(listing);
      const enriched = { ...listing, ratingValue: rating.value, ratingSource: rating.source };

      const subScores = computeSubScores(enriched, criteria, commuteMinutes);
      const matchScore = scoreListing(enriched, criteria, commuteMinutes);

      return {
        listing: enriched,
        matchScore,
        commuteMinutes,
        commuteMode: criteria.commuteMode,
        whyItMatched: explainMatch(subScores, criteria, enriched),
        subScores,
      };
    })
  );

  return scored.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Merge two provider result sets, deduping by normalized address. When the same
 * place appears in both, keep the one with a real listingUrl (the scraped entry)
 * so users get a canonical link instead of RentCast's empty-URL fallback.
 */
function mergeListings(primary: Listing[], enrichment: Listing[]): Listing[] {
  const byAddress = new Map<string, Listing>();
  const key = (l: Listing) => `${l.address} ${l.city}`.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const l of [...primary, ...enrichment]) {
    const k = key(l);
    const existing = byAddress.get(k);
    // First writer wins, but a later entry with a real URL upgrades one without.
    if (!existing || (!existing.listingUrl && l.listingUrl)) byAddress.set(k, l);
  }
  return [...byAddress.values()];
}
