import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

// Rough height of the open panel (search box + list). Used to decide whether the
// menu should flip above the trigger and to cap the panel height near edges.
const PANEL_MAX_HEIGHT = 300;
// Small breathing room kept between the panel and the viewport edge.
const VIEWPORT_GAP = 8;

export interface SearchableSelectOption {
  value: string;
  label: string;
  // Extra text (e.g. a code) that should also match when searching.
  keywords?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  darkMode: boolean;
  required?: boolean;
  requiredMessage?: string;
  disabled?: boolean;
  // When set, a "clear" row is shown at the top so the user can reset to ''.
  clearable?: boolean;
  clearLabel?: string;
  triggerClassName: string;
  chevronClassName?: string;
}

interface PanelPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

// A dropdown that can be filtered by typing. Used where the option list may be
// long enough that scrolling alone is painful (e.g. locations, officers).
//
// The menu is rendered in a portal with fixed positioning so it can't be clipped
// by a modal's overflow-hidden/overflow-y-auto containers, and it flips above the
// trigger when there isn't enough room below. Native form validation still works
// through a hidden, required input so the surrounding <form> keeps blocking submit
// and showing the localized "required" bubble.
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  darkMode,
  required = false,
  requiredMessage,
  disabled = false,
  clearable = false,
  clearLabel,
  triggerClassName,
  chevronClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const validationRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);
  const resolvedChevronClassName =
    chevronClassName ??
    `pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`;

  // Anchor the floating panel to the trigger, flipping it upward when the space
  // below is too small. Reads layout only (refs + window), so it stays stable.
  const computePosition = useCallback((): PanelPosition | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropUp = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
    const available = Math.max((dropUp ? spaceAbove : spaceBelow) - VIEWPORT_GAP, 0);
    const maxHeight = Math.min(PANEL_MAX_HEIGHT, available);
    return dropUp
      ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 4, maxHeight }
      : { left: rect.left, width: rect.width, top: rect.bottom + 4, maxHeight };
  }, []);

  // Close when clicking outside (trigger or panel) or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Keep the panel pinned to the trigger while the page or a container scrolls.
  useEffect(() => {
    if (!open) return;
    const update = () => setPosition(computePosition());
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, computePosition]);

  // Focus the search box the moment the menu opens so the user can type right away.
  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  // Keep the hidden validation input in sync with the localized message so the
  // browser never falls back to its English default.
  useEffect(() => {
    if (validationRef.current) {
      validationRef.current.setCustomValidity(value || !required ? '' : requiredMessage ?? '');
    }
  }, [value, required, requiredMessage]);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    // Measure before opening (the trigger is always mounted) so the panel never
    // flashes in the wrong place.
    setPosition(computePosition());
    setOpen(true);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => `${option.label} ${option.keywords ?? ''}`.toLowerCase().includes(normalizedQuery))
    : options;

  const commit = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (option: SearchableSelectOption) => {
    if (option.disabled) return;
    commit(option.value);
  };

  return (
    <div className="relative" ref={containerRef}>
      {required && (
        // Invisible but focusable: carries `required` so the form blocks submit,
        // and pointer-events-none lets clicks fall through to the button below.
        <input
          ref={validationRef}
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && toggleOpen()}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${triggerClassName} flex items-center text-left`}
      >
        <span className={`block flex-1 truncate ${selectedOption ? '' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </button>
      <ChevronDown className={resolvedChevronClassName} />
      {open && !disabled && position && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            left: position.left,
            width: position.width,
            top: position.top,
            bottom: position.bottom,
            maxHeight: position.maxHeight,
            zIndex: 10000,
          }}
          className={`flex flex-col overflow-hidden rounded-md border shadow-xl ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}
        >
          <div className={`shrink-0 border-b p-2 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="relative">
              <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className={`h-9 w-full rounded-md border pl-8 pr-3 text-sm outline-none transition-all focus:ring-2 ${
                  darkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
                    : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500/20'
                }`}
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto py-1" role="listbox">
            {clearable && (
              <li role="option" aria-selected={value === ''}>
                <button
                  type="button"
                  onClick={() => commit('')}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                    darkMode ? 'cursor-pointer text-slate-400 hover:bg-slate-700' : 'cursor-pointer text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {clearLabel ?? placeholder}
                </button>
              </li>
            )}
            {filteredOptions.length === 0 ? (
              <li className={`px-3 py-2 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{emptyText}</li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        option.disabled
                          ? darkMode ? 'cursor-not-allowed text-slate-600' : 'cursor-not-allowed text-slate-300'
                          : isSelected
                            ? darkMode ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-50 text-sky-700'
                            : darkMode ? 'cursor-pointer text-slate-200 hover:bg-slate-700' : 'cursor-pointer text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
