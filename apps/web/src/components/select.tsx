import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  footerAction?: { label: string; onClick: () => void };
}

export const Select = ({
  value,
  options,
  onChange,
  placeholder = '请选择...',
  disabled = false,
  loading = false,
  className = '',
  id,
  'aria-label': ariaLabel,
  footerAction,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    if (!isOpen) return;
    // Small timeout to let the dropdown render
    const frame = requestAnimationFrame(() => {
      const listbox = containerRef.current?.querySelector('[role="listbox"]');
      if (!listbox) return;
      // Focus selected option, or first option
      const selected = listbox.querySelector('[aria-selected="true"]') as HTMLElement | null;
      const first = listbox.querySelector('[role="option"]') as HTMLElement | null;
      (selected ?? first)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const isDisabled = disabled || loading;

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        // Move focus into list
        const listbox = containerRef.current?.querySelector('[role="listbox"]');
        const first = listbox?.querySelector('[role="option"]') as HTMLElement | null;
        first?.focus();
      }
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const optionButtons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      if (optionButtons && index + 1 < optionButtons.length) {
        optionButtons[index + 1].focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        triggerRef.current?.focus();
      } else {
        const optionButtons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
        if (optionButtons) {
          optionButtons[index - 1].focus();
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(options[index].value);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-3 py-2 w-full
          bg-white dark:bg-dark-800
          border border-gray-200 dark:border-dark-700
          rounded-lg text-sm text-left
          transition-colors
          ${isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-primary-500' : ''}
        `}
      >
        <span className={`flex-1 truncate ${!selectedOption ? 'text-gray-400 dark:text-gray-500' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {loading ? (
          <Loader2 className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400 animate-spin" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[160px] bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="max-h-[240px] overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">暂无选项</div>
            ) : (
              options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(e) => handleOptionKeyDown(e, index)}
                  className={`
                    flex items-center w-full px-3 py-2 text-sm text-left transition-colors
                    ${option.value === value
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-900 dark:text-gray-50'
                    }
                  `}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
          {footerAction && (
            <div className="border-t border-gray-200 dark:border-dark-700">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  footerAction.onClick();
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-left text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                {footerAction.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
