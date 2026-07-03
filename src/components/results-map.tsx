import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import type { ScoredListing } from '../lib/types';
import { formatRent, formatBeds } from '../lib/format';

/**
 * Map view of the results, using each listing's lat/lng. Dark CARTO tiles match
 * the app's editorial theme (free, no API key — unlike Google Maps JS). Each pin
 * shows its match score, color-graded the same way as the MatchScore badge.
 */

/** Pin fill by match strength — mirrors MatchScore's thresholds (hex, since the
 * marker is rendered by Leaflet outside Tailwind's class context). */
function pinColor(score: number): string {
  if (score >= 80) return '#34d399'; // emerald
  if (score >= 60) return '#4C8B67'; // brand green
  if (score >= 40) return '#fbbf24'; // amber
  return '#8B857D'; // slate
}

function scoreIcon(score: number, selected: boolean) {
  const bg = pinColor(score);
  const ring = selected ? 'box-shadow:0 0 0 3px rgba(255,255,255,0.9);' : '';
  return divIcon({
    className: '',
    html: `<div style="background:${bg};${ring}color:#0B0B0C;width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;font-family:ui-monospace,monospace;border:2px solid #0B0B0C;">${score}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

/** Fit the map to all pins whenever the set of coordinates changes. Keyed on a
 * stable string of the coords so a re-render with the same points doesn't refit
 * (and discard the user's manual pan/zoom). */
function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const key = points.map((p) => p.join()).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(latLngBounds(points), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function ResultsMap({
  scored,
  selectedId,
  onSelect,
}: {
  scored: ScoredListing[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  // Guard against listings missing coordinates.
  const withCoords = scored.filter(
    (s) => Number.isFinite(s.listing.lat) && Number.isFinite(s.listing.lng) && (s.listing.lat !== 0 || s.listing.lng !== 0)
  );
  const points = withCoords.map((s): [number, number] => [s.listing.lat, s.listing.lng]);

  if (withCoords.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-2xl border border-slate-200 bg-ink text-sm text-slate-500">
        No mappable locations for these results.
      </div>
    );
  }

  return (
    <div className="h-[60vh] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <MapContainer
        center={points[0]}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', background: '#0B0B0C' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />
        <FitBounds points={points} />
        {withCoords.map((s) => {
          const l = s.listing;
          return (
            <Marker
              key={l.id}
              position={[l.lat, l.lng]}
              icon={scoreIcon(s.matchScore, l.id === selectedId)}
              eventHandlers={{ click: () => onSelect?.(l.id) }}
            >
              <Popup>
                <div className="min-w-[9rem]">
                  <Link
                    to={`/listing/${l.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {l.neighborhood}
                  </Link>
                  <p className="mt-0.5 text-slate-600">{l.address}</p>
                  <p className="mt-1 text-slate-700">
                    <span className="font-semibold">{formatRent(l.rentMonthly)}</span> ·{' '}
                    {formatBeds(l.bedrooms)}
                  </p>
                  <p className="text-slate-500">Match {s.matchScore}/100</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
