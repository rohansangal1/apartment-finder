import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

/**
 * <ApartmentCarousel /> — a rotating "featured spaces" gallery for the landing
 * page. Auto-advances, pauses on hover, crossfades between slides, and exposes
 * arrow + dot controls.
 *
 * NOTE: these are stock/marketing photos. Per the design constraint they are
 * NEVER paired with a real listing address — listing cards use the unit's own
 * imagery or a clear placeholder. The captions here are illustrative.
 */
interface Slide {
  url: string;
  neighborhood: string;
  city: string;
  price: string;
  beds: string;
}

const SLIDES: Slide[] = [
  {
    url: '/images/apt-penthouse.jpg',
    neighborhood: 'Beacon Hill',
    city: 'Boston',
    price: '$3,200/mo',
    beds: '1 bed',
  },
  {
    url: '/images/apt-loft.jpg',
    neighborhood: 'SoMa',
    city: 'San Francisco',
    price: '$4,050/mo',
    beds: '2 bed',
  },
  {
    url: '/images/apt-studio.jpg',
    neighborhood: 'East Austin',
    city: 'Austin',
    price: '$1,850/mo',
    beds: 'Studio',
  },
  {
    url: '/images/skyline-river.jpg',
    neighborhood: 'Williamsburg',
    city: 'New York',
    price: '$3,700/mo',
    beds: '1 bed',
  },
  {
    url: '/images/brooklyn-bridge.jpg',
    neighborhood: 'Dumbo',
    city: 'New York',
    price: '$4,400/mo',
    beds: '2 bed',
  },
];

const ADVANCE_MS = 4500;
const FADE_MS = 700;

export default function ApartmentCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = SLIDES.length;

  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  // Auto-advance, paused on hover/focus. Restarts whenever index changes so a
  // manual nav gives a full dwell on the chosen slide.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (paused) return;
    timer.current = window.setTimeout(() => go(index + 1), ADVANCE_MS);
    return () => window.clearTimeout(timer.current);
  }, [index, paused, go]);

  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-ink-600 bg-ink-800 sm:aspect-[16/7]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured apartment spaces"
    >
      {/* Slides (crossfade via stacked, opacity-animated layers) */}
      {SLIDES.map((slide, i) => {
        const active = i === index;
        return (
          <figure
            key={slide.url}
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{ opacity: active ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
            aria-hidden={!active}
          >
            <img
              src={slide.url}
              alt={`${slide.neighborhood}, ${slide.city}`}
              className="h-full w-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
            {/* Legibility gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/20 to-transparent" />
            {/* Caption */}
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-paper">
                  <MapPin className="h-4 w-4 shrink-0 text-teal-400" aria-hidden="true" />
                  <span className="truncate text-base font-semibold sm:text-lg">
                    {slide.neighborhood}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-paper-muted">{slide.city}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="data text-base font-semibold text-paper sm:text-lg">{slide.price}</p>
                <p className="data text-xs text-paper-muted">{slide.beds}</p>
              </div>
            </figcaption>
          </figure>
        );
      })}

      {/* Prev / next arrows */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-ink-950/50 p-2 text-paper backdrop-blur transition hover:bg-ink-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-ink-950/50 p-2 text-paper backdrop-blur transition hover:bg-ink-950/80 focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Dot indicators */}
      <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.url}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}: ${slide.neighborhood}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 ${
              i === index ? 'w-6 bg-teal-400' : 'w-1.5 bg-paper/40 hover:bg-paper/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
