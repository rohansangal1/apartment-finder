import { useEffect, useRef, useState } from 'react';
import { autocompleteAddress } from '../lib/data-client';
import type { AddressSuggestion } from '../lib/types';

/**
 * Work-address input with Google Places type-ahead. As the user types we debounce
 * a call to /api/places-autocomplete and show a clickable dropdown of matches.
 *
 * Degrades gracefully: on the mock data source `autocompleteAddress` is null, so
 * this behaves as a plain text input (no suggestions, no network calls).
 */
interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 200;
const MIN_CHARS = 1; // suggest as soon as the user types anything

export default function AddressAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  // True right after the user picks a suggestion, so the value change it triggers
  // doesn't immediately re-open the dropdown with a fresh query.
  const justSelected = useRef(false);

  // Debounced fetch whenever the typed value changes.
  useEffect(() => {
    const fetchSuggestions = autocompleteAddress;
    if (!fetchSuggestions) return; // mock mode → plain input
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      fetchSuggestions(q)
        .then((results) => {
          if (cancelled) return;
          setSuggestions(results);
          setOpen(results.length > 0);
          setActiveIndex(-1);
        })
        .catch((e) => {
          if (!cancelled) console.error('Autocomplete failed', e);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const select = (s: AddressSuggestion) => {
    justSelected.current = true;
    onChange(s.description);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-ink-600 bg-ink-800 py-1 shadow-xl"
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId || s.description} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep input focus through the click
                onClick={() => select(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === activeIndex ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                }`}
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
