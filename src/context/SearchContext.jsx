/**
 * App-wide search state: the user's criteria, the last results, loading/error
 * status, and the set of saved listing IDs (Phase 0: in-memory + localStorage
 * stub; Phase 2: Supabase-backed per user).
 *
 * Keeping this in context means the Results and Detail views don't have to
 * re-run the search on navigation, and the Input view can pre-fill from the last
 * search (a taste of the "returning users skip re-entering their situation"
 * payoff that defaults/preferences deliver fully in Phase 2).
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { runSearch } from '../lib/searchService.js';

/** @typedef {import('../lib/types.js').SearchCriteria} SearchCriteria */

export const DEFAULT_CRITERIA = {
  city: 'San Francisco',
  inPerson: true,
  workAddress: '',
  maxRent: 3500,
  bedrooms: 1,
  commuteMode: 'transit',
  weights: { commute: 0.7, price: 0.7, rating: 0.5, space: 0.4 },
};

const SAVED_KEY = 'nestle.saved.v1';

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [savedIds, setSavedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify([...savedIds]));
    } catch {
      /* storage may be unavailable (private mode); saved list is a stub anyway */
    }
  }, [savedIds]);

  const search = useCallback(async (nextCriteria) => {
    setCriteria(nextCriteria);
    setStatus('loading');
    setError(null);
    setHasSearched(true);
    try {
      const ranked = await runSearch(nextCriteria);
      setResults(ranked);
      setStatus('ready');
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Something went wrong running your search.');
      setStatus('error');
    }
  }, []);

  const toggleSaved = useCallback((id) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const value = {
    criteria,
    setCriteria,
    results,
    status,
    error,
    hasSearched,
    search,
    savedIds,
    toggleSaved,
    isSaved: (id) => savedIds.has(id),
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>');
  return ctx;
}
