/**
 * GET /api/places-autocomplete?input=...  → { suggestions: AddressSuggestion[] }
 * Key-protected wrapper over Google Places Autocomplete. Powers the work-address
 * type-ahead in the UI (suggestions cached a day, see providers/google.ts).
 */
import { withHandler } from './_lib/handler';
import { autocomplete } from './_lib/providers/google';

export default withHandler('GET', async (req) => {
  const input = typeof req.query.input === 'string' ? req.query.input : '';
  if (!input.trim()) return { suggestions: [] };
  return { suggestions: await autocomplete(input) };
});
