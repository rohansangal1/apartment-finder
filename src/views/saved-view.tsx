import { Link } from 'react-router-dom';
import { useUserData } from '../context/user-data-context';
import { useAuth } from '../context/auth-context';
import Rating from '../components/rating';
import SaveButton from '../components/save-button';
import { formatRent, formatBeds, resolveListingUrl } from '../lib/format';

/**
 * Saved apartments. Renders directly from the snapshots stored at save time
 * (see UserDataContext → UserStore). Signed-in users read from Supabase (synced
 * across devices); guests read from localStorage on this device. No re-fetch is
 * needed because the full listing is captured when saved — listings are external
 * and ephemeral, so there's no reliable way to rehydrate them by id later.
 */
export default function SavedView() {
  const { savedListings } = useUserData();
  const { enabled, user } = useAuth();
  const listings = savedListings.map((s) => s.listing);

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved apartments</h1>
        <p className="mt-1 text-sm text-slate-500">
          {enabled && user ? (
            'Your shortlist, synced to your account across all your devices.'
          ) : (
            <>
              Your shortlist, saved on this device.{' '}
              <Link to="/account" className="font-medium text-brand-600 hover:underline">
                Sign in
              </Link>{' '}
              to sync it across devices.
            </>
          )}
        </p>
      </header>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl">🤍</span>
          <h2 className="mt-3 text-lg font-semibold text-slate-800">Nothing saved yet</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Tap the heart on any listing to add it here.
          </p>
          <Link
            to="/results"
            className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse results
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => {
            const { url } = resolveListingUrl(l);
            return (
              <li
                key={l.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-ink p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/listing/${l.id}`}
                    className="block truncate font-semibold text-slate-900 hover:text-brand-600"
                  >
                    {l.neighborhood}
                  </Link>
                  <p className="truncate text-sm text-slate-500">{l.address}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{formatRent(l.rentMonthly)}</span>
                    <span className="text-slate-400">·</span>
                    <span>{formatBeds(l.bedrooms)}</span>
                  </div>
                  <div className="mt-1">
                    <Rating value={l.ratingValue} source={l.ratingSource} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <SaveButton listing={l} />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    View
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
