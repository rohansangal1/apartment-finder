/**
 * Match scoring — one clear, tweakable pure module.
 *
 * Each sub-score is normalized to 0–100, then combined by the user's
 * (normalized) priority weights. Everything here is a pure function so it can be
 * unit-tested and reasoned about in isolation. Nothing in here touches the
 * network or the DOM.
 *
 * @typedef {import('./types.js').Listing} Listing
 * @typedef {import('./types.js').SearchCriteria} SearchCriteria
 * @typedef {import('./types.js').Weights} Weights
 */

/** Max acceptable commute, in minutes, before commute fit hits 0. Tune per mode later. */
export const MAX_COMMUTE = 60;

/** Neutral rating fit for listings with no rating data — sits at neutral, not zero. */
const UNKNOWN_RATING_FIT = 60;

/**
 * Normalize weights so they always sum to 1. Guards against an all-zero object.
 * @param {Weights} weights
 * @returns {Weights}
 */
export function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(
    Object.entries(weights).map(([k, v]) => [k, v / total])
  );
}

/**
 * Compute the four 0–100 sub-scores for a listing. Exposed separately so the UI
 * can explain *why* something matched.
 * @param {Listing} listing
 * @param {SearchCriteria} criteria
 * @param {number} commuteMinutes
 */
export function computeSubScores(listing, criteria, commuteMinutes) {
  const { maxRent } = criteria;

  // Price fit: full marks well under budget, declining toward the cap, penalized over.
  const priceFit =
    listing.rentMonthly <= maxRent
      ? 100 * (1 - listing.rentMonthly / (maxRent * 1.05))
      : Math.max(0, 100 - ((listing.rentMonthly - maxRent) / maxRent) * 200);

  // Commute fit: 100 at 0 min, 0 at the max acceptable commute. Remote = irrelevant.
  const commuteFit = criteria.inPerson
    ? Math.max(0, 100 * (1 - commuteMinutes / MAX_COMMUTE))
    : 100;

  // Rating fit: scale 1–5 to 0–100. Unknown ratings sit at neutral, not zero.
  const ratingFit =
    listing.ratingValue == null
      ? UNKNOWN_RATING_FIT
      : (listing.ratingValue / 5) * 100;

  // Space fit: meets or exceeds desired bedrooms = full marks.
  const spaceFit =
    listing.bedrooms >= criteria.bedrooms
      ? 100
      : Math.max(0, 100 - (criteria.bedrooms - listing.bedrooms) * 40);

  return {
    commute: clamp(commuteFit),
    price: clamp(priceFit),
    rating: clamp(ratingFit),
    space: clamp(spaceFit),
  };
}

/**
 * Combine sub-scores by the user's normalized weights into a 0–100 match score.
 * @param {Listing} listing
 * @param {SearchCriteria} criteria
 * @param {number} commuteMinutes
 * @returns {number} integer 0–100
 */
export function scoreListing(listing, criteria, commuteMinutes) {
  const sub = computeSubScores(listing, criteria, commuteMinutes);
  const w = normalizeWeights(criteria.weights);

  const score =
    w.commute * sub.commute +
    w.price * sub.price +
    w.rating * sub.rating +
    w.space * sub.space;

  return Math.round(clamp(score));
}

/**
 * Human-readable "why it matched" from whichever sub-scores are highest,
 * weighted by what the user actually cares about (so we don't brag about a
 * dimension they put zero weight on).
 * @param {ReturnType<typeof computeSubScores>} sub
 * @param {SearchCriteria} criteria
 * @returns {string}
 */
export function explainMatch(sub, criteria) {
  const w = normalizeWeights(criteria.weights);
  const phrases = {
    commute: phraseFor(sub.commute, 'a quick commute', 'a manageable commute'),
    price: phraseFor(sub.price, 'well under budget', 'a fair price'),
    rating: phraseFor(sub.rating, 'highly rated', 'solid reviews'),
    space: phraseFor(sub.space, 'plenty of space', 'enough room'),
  };

  // Rank dimensions by weighted contribution, drop ones the user ignores or that score poorly.
  const ranked = Object.keys(phrases)
    .filter((k) => w[k] > 0.01 && sub[k] >= 50)
    .sort((a, b) => w[b] * sub[b] - w[a] * sub[a])
    .slice(0, 2)
    .map((k) => phrases[k]);

  if (ranked.length === 0) return 'A reasonable overall match for your search.';
  if (ranked.length === 1) return capitalize(`${ranked[0]}.`);
  return capitalize(`${ranked[0]} and ${ranked[1]}.`);
}

function phraseFor(value, strong, mild) {
  return value >= 80 ? strong : mild;
}

function clamp(n) {
  return Math.max(0, Math.min(100, n));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
