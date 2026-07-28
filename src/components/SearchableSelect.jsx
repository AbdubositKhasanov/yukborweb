import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { searchMatches } from '../utils/searchText';
import { registerMobileOverlay } from '../mobile/utils/mobileOverlayHistory';
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
  allowCustom = false,
  selectedLabel = '',
  onCustomCreate,
  getCustomCreateLabel = (customValue) => `"${customValue}"ni qo'lda qo'shish`,
  clearable = false,
  clearLabel = 'Tanlovni olib tashlash',
  mobile = false,
  selectionTitle = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const closeRef = useRef(() => setOpen(false));
  const selectedValue = value === null || value === undefined ? '' : String(value);
  const customDisplayLabel = selectedLabel ? String(selectedLabel).trim() : '';

  const selectedOption = useMemo(() => {
    return options.find((option) => String(option.value) === selectedValue);
  }, [options, selectedValue]);

  const visibleOptions = useMemo(() => {
    const source = query.trim()
      ? options.filter((option) => searchMatches(`${option.label} ${option.searchText || ''}`, query))
      : options;
    return source.slice(0, maxVisibleOptions);
  }, [maxVisibleOptions, options, query]);

  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  const canCreateCustom = useMemo(() => {
    if (!allowCustom || !normalizedQuery || normalizedQuery.length < 2) return false;
    const comparableQuery = normalizedQuery.toLocaleLowerCase('uz');
    return !options.some((option) => String(option.label || '').trim().toLocaleLowerCase('uz') === comparableQuery);
  }, [allowCustom, normalizedQuery, options]);

  useEffect(() => {
    if (!open || mobile) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [mobile, open]);

  useEffect(() => {
    if (!open || !mobile) return undefined;
    return registerMobileOverlay(() => closeRef.current());
  }, [mobile, open]);

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

  const handleCustomCreate = () => {
    if (!canCreateCustom) return;
    onCustomCreate?.(normalizedQuery);
    setOpen(false);
  };

  const hasSelectedDisplay = Boolean(selectedOption || customDisplayLabel);

  const menuContent = (
    <>
      <div className="searchable-select__search-wrap">
        <input
          ref={searchRef}
          type="text"
          className="searchable-select__search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (canCreateCustom) handleCustomCreate();
            }
            if (event.key === 'Escape') setOpen(false);
          }}
          placeholder={searchPlaceholder}
        />
      </div>

      <div className="searchable-select__options">
        {hasSelectedDisplay && (
          <button
            type="button"
            className="searchable-select__option searchable-select__option--clear"
            onClick={() => handleSelect('')}
          >
            <span aria-hidden="true">✕</span> {clearLabel}
          </button>
        )}

        {canCreateCustom && (
          <button
            type="button"
            className="searchable-select__option searchable-select__option--custom"
            onClick={handleCustomCreate}
          >
            {getCustomCreateLabel(normalizedQuery)}
          </button>
        )}

        {visibleOptions.map((option) => {
          const optionValue = String(option.value);
          return (
            <button
              key={optionValue}
              type="button"
              className={`searchable-select__option ${optionValue === selectedValue ? 'selected' : ''}`}
              onClick={() => handleSelect(optionValue)}
            >
              <span>{option.label}</span>
              {optionValue === selectedValue && <span aria-hidden="true">✓</span>}
            </button>
          );
        })}

        {visibleOptions.length === 0 && !canCreateCustom && (
          <div className="searchable-select__empty">Topilmadi</div>
        )}
      </div>
    </>
  );

  const mobileMenu = open && mobile && typeof document !== 'undefined'
    ? createPortal(
        <div className="searchable-select__mobile-layer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="searchable-select__mobile-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Tanlovni yopish"
          />
          <div className="searchable-select__mobile-panel">
            <div className="searchable-select__mobile-header">
              <button
                type="button"
                className="searchable-select__mobile-close"
                onClick={() => setOpen(false)}
                aria-label="Orqaga"
              >
                ←
              </button>
              <h2>{selectionTitle || `${placeholder}ni tanlang`}</h2>
            </div>
            {menuContent}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`searchable-select ${mobile ? 'searchable-select--mobile' : ''}`} ref={rootRef}>
      <div className={`searchable-select__control-wrap ${clearable && hasSelectedDisplay ? 'has-clear' : ''}`}>
        <button
          type="button"
          className={`${className} searchable-select__control`.trim()}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={hasSelectedDisplay ? '' : 'searchable-select__placeholder'}>
            {selectedOption?.label || customDisplayLabel || placeholder}
          </span>
          <span className="searchable-select__chevron">▾</span>
        </button>

        {clearable && hasSelectedDisplay && !disabled && (
          <button
            type="button"
            className="searchable-select__clear"
            onClick={() => handleSelect('')}
            aria-label={clearLabel}
            title={clearLabel}
          >
            ✕
          </button>
        )}
      </div>

      {open && !mobile && (
        <div className="searchable-select__menu">
          {menuContent}
        </div>
      )}
      {mobileMenu}
    </div>
  );
}
