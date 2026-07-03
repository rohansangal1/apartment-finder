/**
 * UserStore — the single interface for per-user persistence (saved listings,
 * default preferences, first-party reviews). Two implementations satisfy it:
 *
 *   localStore   — browser localStorage; guest mode / no Supabase configured.
 *   supabaseStore — Postgres behind Supabase Auth + RLS; the real Phase 2 store.
 *
 * UserDataContext picks the implementation based on auth state, so components
 * never branch on "are we signed in" for storage — they just call the store.
 */
import type { Listing, Review, NewReview, UserPreferences } from '../types';

/** A shortlisted listing: the full snapshot captured at save time + when. */
export interface SavedListing {
  listing: Listing;
  savedAt: string;
}

export interface UserStore {
  /** Full snapshots, most-recently-saved first. */
  listSaved(): Promise<SavedListing[]>;
  /** Save requires the full listing (snapshot); unsave keys off listing.id. */
  setSaved(listing: Listing, saved: boolean): Promise<void>;

  getPreferences(): Promise<UserPreferences | null>;
  savePreferences(prefs: UserPreferences): Promise<void>;

  getReviews(listingId: string): Promise<Review[]>;
  addReview(review: NewReview): Promise<Review>;
}
