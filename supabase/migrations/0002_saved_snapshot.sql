-- Phase 2.1: store a snapshot of each saved listing.
--
-- Listings are external and ephemeral (RentCast / apartments.com) — there is no
-- reliable "get listing by id" endpoint, and a re-run search won't dependably
-- return a previously-saved unit. So the shortlist can't be rehydrated from the
-- listing_id alone. We denormalize: store the full Listing JSON at save time and
-- render the Saved page straight from it (no re-fetch, survives listing churn).
--
-- Apply with:  supabase db push   (or paste into the Supabase SQL editor)

alter table public.saved_listings
  add column if not exists listing jsonb;

-- Backfill note: rows saved before this migration have listing = null. They will
-- be dropped from the Saved page (no snapshot to render) until re-saved. That's
-- acceptable given the shortlist is small and easily rebuilt.
