import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchMatches } from '../utils/searchText';
import './SearchableSelect.css';

export default function SearchableSelect({
  value = '',
  options = [],
  placeholder = 'Tanlang',
  searchPlaceholder = 'Qidirish',
  onChange,
  className = '',
  disabled = false,
  maxVisibleOptions = 80,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const selectedValue = value === null || value === undefined ? '' : String(value);

  const selectedOption = useMemo(() => {
    return options.find((option) => String(option.value) === selectedValue);
  }, [options, selectedValue]);

  const visibleOptions = useMemo(() => {
    const source = query.trim()
      ? options.filter((option) => searchMatches(`${option.label} ${option.searchText || ''}`, query))
      : options;
    return source.slice(0, maxVisibleOptions);
  }, [maxVisibleOptions, options, query]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div className="searchable-select" ref={rootRef}>
      <button
        type="button"
        className={`${className} searchable-select__control`.trim()}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selectedOption ? '' : 'searchable-select__placeholder'}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="searchable-select__chevron">▾</span>
      </button>

      {open && (
        <div className="searchable-select__menu">
          <div className="searchable-select__search-wrap">
            <input
              ref={searchRef}
              type="text"
              className="searchable-select__search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
                if (event.key === 'Escape') setOpen(false);
              }}
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="searchable-select__options">
            <button
              type="button"
              className={`searchable-select__option ${!selectedValue ? 'selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </button>

            {visibleOptions.map((option) => {
              const optionValue = String(option.value);
              return (
                <button
                  key={optionValue}
                  type="button"
                  className={`searchable-select__option ${optionValue === selectedValue ? 'selected' : ''}`}
                  onClick={() => handleSelect(optionValue)}
                >
                  {option.label}
                </button>
              );
            })}

            {visibleOptions.length === 0 && (
              <div className="searchable-select__empty">Topilmadi</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
