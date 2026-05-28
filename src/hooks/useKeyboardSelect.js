import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A custom hook to handle premium keyboard accessibility and navigation
 * for custom dropdown lists.
 *
 * @param {object} params
 * @param {boolean} params.isOpen - Whether the dropdown is currently open.
 * @param {function} params.setIsOpen - Setter to open/close the dropdown.
 * @param {Array} params.options - Array of options: { id, name } or { value, label }
 * @param {string|number} params.selectedValue - The currently selected value.
 * @param {function} params.onSelect - Called with the option's id/value when selected.
 * @param {React.RefObject} params.triggerRef - Ref attached to the toggle button.
 * @param {React.RefObject} params.listRef - Ref attached to the scrollable UL/div containing [role="option"] items.
 *
 * @returns {{ highlightedIndex: number, setHighlightedIndex: function, handleKeyDown: function }}
 */
export function useKeyboardSelect({
  isOpen,
  setIsOpen,
  options,
  selectedValue,
  onSelect,
  triggerRef,
  listRef,
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // We store the highlighted index in a ref as well so the keydown closure is always fresh
  const highlightedIndexRef = useRef(0);

  const setHighlight = useCallback((idx) => {
    highlightedIndexRef.current = idx;
    setHighlightedIndex(idx);
  }, []);

  // When the dropdown opens, sync highlight to the currently selected item
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => {
        const val = opt.id !== undefined ? opt.id : opt.value;
        return val === selectedValue;
      });
      setHighlight(idx !== -1 ? idx : 0);
    }
  }, [isOpen]); // Only run when isOpen changes, not on every option/value change

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef?.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    const activeItem = items[highlightedIndex];
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen, listRef]);

  // Attach a document-level keydown listener whenever the dropdown is open.
  // This is the ONLY reliable way to capture keys without focus fighting.
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      const len = options.length;
      if (len === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          e.stopPropagation();
          setHighlight((highlightedIndexRef.current + 1) % len);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          e.stopPropagation();
          setHighlight((highlightedIndexRef.current - 1 + len) % len);
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          e.stopPropagation();
          const opt = options[highlightedIndexRef.current];
          if (opt) {
            const val = opt.id !== undefined ? opt.id : opt.value;
            onSelect(val);
            setIsOpen(false);
            triggerRef?.current?.focus();
          }
          break;
        }
        case 'Escape':
        case 'Tab': {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          triggerRef?.current?.focus();
          break;
        }
        default: {
          // Type-to-select: single printable character, no modifier keys
          if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            const char = e.key.toLowerCase();
            const matchingIndices = [];
            options.forEach((opt, idx) => {
              const name = (opt.name || opt.label || '').toString().trim().toLowerCase();
              if (name.startsWith(char)) {
                matchingIndices.push(idx);
              }
            });
            if (matchingIndices.length > 0) {
              const currentMatchIdx = matchingIndices.indexOf(highlightedIndexRef.current);
              if (currentMatchIdx !== -1) {
                // Already on a match — cycle to the next one
                setHighlight(matchingIndices[(currentMatchIdx + 1) % matchingIndices.length]);
              } else {
                // Not on a match — jump to the first one
                setHighlight(matchingIndices[0]);
              }
            }
          }
          break;
        }
      }
    };

    // Use capture phase so it fires before any other handler
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [isOpen, options, onSelect, setIsOpen, triggerRef, setHighlight]);

  // The trigger button's onKeyDown only needs to handle opening the dropdown
  // when it is closed (arrow keys). All other keys are handled by the effect above.
  const handleTriggerKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    },
    [isOpen, setIsOpen]
  );

  return {
    highlightedIndex,
    setHighlightedIndex: setHighlight,
    handleKeyDown: handleTriggerKeyDown,
  };
}
