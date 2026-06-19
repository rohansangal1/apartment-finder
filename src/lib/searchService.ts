/**
 * Search orchestration. Phase 0 this runs in the browser; in Phase 1 the exact
 * same flow moves behind `POST /api/search` (to hide keys + cut round-trips) and
 * the apiClient just calls that endpoint. The orchestration shape is identical
 * either way, which is why it lives here as a standalone service rather than
 * inside a component.
 *
 * Flow: getListings -> geocode work address -> getCommute per listing ->
 *       blend rating -> scoreListing -> rank.
 */
import type { SearchCriteria, ScoredListing, GeoPoint } from './types';
import { getListings, getCommute, getRating, geocode } from './dataClient';
import { scoreListing, computeSubScores, explainMatch } from './scoring';

/** Run a full search and return ranked, scored listings (best first). */
export async function runSearch(criteria: SearchCriteria): Promise<ScoredListing[]> {
  const listings = await getListings(criteria);

  // Geocode the work origin once (only needed for in-person commuters).
  let origin: GeoPoint | null = null;
  if (criteria.inPerson && criteria.workAddress) {
    origin = await geocode(criteria.workAddress, criteria.city);
  }

  const scored = await Promise.all(
    listings.map(async (listing): Promise<ScoredListing> => {
      let commuteMinutes = 0;
      if (criteria.inPerson && origin) {
        const commute = await getCommute(
          origin,
          { lat: listing.lat, lng: listing.lng },
          criteria.commuteMode
        );
        commuteMinutes = commute.minutes;
      }

      // Blend rating behind the scenes (via the dataClient, source-agnostic);
      // the listing's ratingValue is updated to the single value the UI consumes.
      const rating = await getRating(listing);
      const enriched = {
        ...listing,
        ratingValue: rating.value,
        ratingSource: rating.source,
      };

      const subScores = computeSubScores(enriched, criteria, commuteMinutes);
      const matchScore = scoreListing(enriched, criteria, commuteMinutes);
      const whyItMatched = explainMatch(subScores, criteria);

      return {
        listing: enriched,
        matchScore,
        commuteMinutes,
        commuteMode: criteria.commuteMode,
        whyItMatched,
        subScores,
      };
    })
  );

  return scored.sort((a, b) => b.matchScore - a.matchScore);
}

/** Sort comparators for the Results view toggle. */
export const SORTERS: Record<string, (a: ScoredListing, b: ScoredListing) => number> = {
  match: (a, b) => b.matchScore - a.matchScore,
  price: (a, b) => a.listing.rentMonthly - b.listing.rentMonthly,
  commute: (a, b) => a.commuteMinutes - b.commuteMinutes,
};
