/**
 * Shared data-model typedefs for the whole app.
 *
 * This is a JS project, so these live as JSDoc `@typedef`s rather than TS
 * interfaces. They mirror the canonical data model exactly and give us editor
 * autocomplete + type-checking without a TS build step. When this project
 * migrates to TypeScript later, these translate 1:1.
 *
 * @typedef {'rentcast' | 'apartments_com' | 'zillow' | 'mock'} Source
 *
 * @typedef {Object} Listing
 * @property {string}  id
 * @property {Source}  source
 * @property {string}  listingUrl   Deep link out to the source site.
 * @property {string}  address
 * @property {string}  neighborhood
 * @property {string}  city
 * @property {number}  lat
 * @property {number}  lng
 * @property {number}  rentMonthly
 * @property {number}  bedrooms
 * @property {string[]} tags          e.g. ['pet-friendly', 'in-unit laundry']
 * @property {number|null} ratingValue
 * @property {string}  ratingSource   e.g. 'google', 'platform-users', 'aggregated'
 *
 * @typedef {'walk' | 'transit' | 'bike' | 'drive'} CommuteMode
 *
 * @typedef {Object} Weights
 * @property {number} commute   0–1
 * @property {number} price     0–1
 * @property {number} rating    0–1
 * @property {number} space     0–1
 *
 * @typedef {Object} SearchCriteria
 * @property {string}  city
 * @property {boolean} inPerson
 * @property {string=} workAddress
 * @property {number}  maxRent
 * @property {number}  bedrooms
 * @property {CommuteMode} commuteMode
 * @property {Weights} weights   User priorities, each 0–1, normalized before scoring.
 *
 * @typedef {Object} Review
 * @property {string}  id
 * @property {string}  listingId
 * @property {string}  userId
 * @property {number}  stars              1–5
 * @property {string}  text
 * @property {boolean} livedHereVerified  true if they found the place via the platform
 * @property {string}  createdAt
 *
 * @typedef {Object} Commute
 * @property {number} minutes
 * @property {CommuteMode} mode
 *
 * @typedef {Object} Rating
 * @property {number|null} value
 * @property {string} source
 *
 * @typedef {Object} GeoPoint
 * @property {number} lat
 * @property {number} lng
 *
 * A scored listing as consumed by the Results/Detail views.
 * @typedef {Object} ScoredListing
 * @property {Listing} listing
 * @property {number}  matchScore        0–100
 * @property {number}  commuteMinutes
 * @property {CommuteMode} commuteMode
 * @property {string}  whyItMatched
 * @property {{commute:number,price:number,rating:number,space:number}} subScores
 */

export {};
