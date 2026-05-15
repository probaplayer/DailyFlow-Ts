import { useEffect, useRef, useState } from 'react';
import { IoChevronDown } from 'react-icons/io5';
import './AppDropdown.css';

export interface AppDropdownOption<T extends string | number> {
  value: T;
  label: string;
}

interface AppDropdownProps<T extends string | number> {
  label?: string;
  value: T;
  options: AppDropdownOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

const AppDropdown = <T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
}: AppDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div className={`app-dropdown ${className}`} ref={rootRef}>
      {label && <label className="app-dropdown-label">{label}</label>}
      <button
        type="button"
        className={`app-dropdown-button ${isOpen ? 'open' : ''}`}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <IoChevronDown />
      </button>
      {isOpen && !disabled && (
        <div className="context-menu app-dropdown-menu">
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className={`context-menu-item app-dropdown-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppDropdown;
