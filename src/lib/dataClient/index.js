/**
 * dataClient — the SINGLE boundary between the UI and all external data.
 *
 * The UI must NEVER import a mock file or call an external source directly. It
 * only ever imports from here. Switching from mock data to real APIs is a CONFIG
 * change, not a rewrite:
 *
 *   Phase 0 (now):   VITE_DATA_SOURCE=mock  -> mockClient (in-browser fixtures)
 *   Phase 1 (later): VITE_DATA_SOURCE=api   -> apiClient (calls /api serverless
 *                    functions that hold the secret keys + caching)
 *
 * apiClient.js doesn't exist yet — that's the point. When it does, it exports the
 * same four methods and we flip the env var. Nothing in /views or /components
 * changes.
 */
import * as mockClient from './mockClient.js';

const SOURCE = import.meta.env?.VITE_DATA_SOURCE || 'mock';

/**
 * Resolve the active implementation. Today only 'mock' exists; 'api' is wired to
 * throw a clear error until apiClient.js is added, so a misconfigured env fails
 * loudly instead of silently doing nothing.
 */
function resolveClient() {
  switch (SOURCE) {
    case 'mock':
      return mockClient;
    case 'api':
      throw new Error(
        "VITE_DATA_SOURCE=api but apiClient.js is not implemented yet (Phase 1). " +
          "Add src/lib/dataClient/apiClient.js exporting getListings/getCommute/getRating/geocode."
      );
    default:
      throw new Error(`Unknown VITE_DATA_SOURCE: "${SOURCE}"`);
  }
}

const client = resolveClient();

export const getListings = (...args) => client.getListings(...args);
export const getCommute = (...args) => client.getCommute(...args);
export const getRating = (...args) => client.getRating(...args);
export const geocode = (...args) => client.geocode(...args);
export const getReviews = (...args) => client.getReviews(...args);

/** Active source name, surfaced in the UI footer so it's obvious we're on mock data. */
export const DATA_SOURCE = SOURCE;
