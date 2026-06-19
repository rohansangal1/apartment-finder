/**
 * Search orchestration. Phase 0 this runs in the browser; in Phase 1 the exact
 * same flow moves behind `POST /api/search` (to hide keys + cut round-trips) and
 * the apiClient just calls that endpoint. The orchestration shape is identical
 * either way, which is why it lives here as a standalone service rather than
 * inside a component.
 *
 * Flow: getListings -> geocode work address -> getCommute per listing ->
 *       blend rating -> scoreListing -> rank.
 *
 * @typedef {import('./types.js').SearchCriteria} SearchCriteria
 * @typedef {import('./types.js').ScoredListing} ScoredListing
 */
import { getListings, getCommute, getRating, geocode } from './dataClient/index.js';
import { scoreListing, computeSubScores, explainMatch } from './scoring.js';

/**
 * Run a full search and return ranked, scored listings (best first).
 * @param {SearchCriteria} criteria
 * @returns {Promise<ScoredListing[]>}
 */
export async function runSearch(criteria) {
  const listings = await getListings(criteria);

  // Geocode the work origin once (only needed for in-person commuters).
  let origin = null;
  if (criteria.inPerson && criteria.workAddress) {
    origin = await geocode(criteria.workAddress, criteria.city);
  }

  const scored = await Promise.all(
    listings.map(async (listing) => {
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
export const SORTERS = {
  match: (a, b) => b.matchScore - a.matchScore,
  price: (a, b) => a.listing.rentMonthly - b.listing.rentMonthly,
  commute: (a, b) => a.commuteMinutes - b.commuteMinutes,
};
