import React from 'react';
import { ChevronDown } from 'lucide-react';
import { FormField } from './Input';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options?: SelectOption[];
  error?: string | boolean;
  helperText?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  children,
  error,
  helperText,
  hint,
  required,
  id,
  className = '',
  ...props
}, ref) => {
  const errorMessage = typeof error === 'string' ? error : undefined;
  const isError = Boolean(error);

  const selectElement = (
    <div className="relative flex items-center">
      <select
        ref={ref}
        id={id}
        required={required}
        className={`w-full appearance-none bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border ${
          isError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-zinc-300 dark:border-zinc-700 focus:border-[#1F5C45] dark:focus:border-[#2F7D5A] focus:ring-[#1F5C45]/20 dark:focus:ring-[#2F7D5A]/20'
        } pl-3.5 pr-10 py-2.5 min-h-[42px] sm:min-h-[44px] transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {options ? (
          options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              {opt.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
      <div className="absolute right-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none flex items-center justify-center">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );

  if (label || errorMessage || helperText || hint) {
    return (
      <FormField
        label={label}
        error={errorMessage}
        hint={hint}
        helperText={helperText}
        required={required}
        htmlFor={id}
      >
        {selectElement}
      </FormField>
    );
  }

  return selectElement;
});

Select.displayName = 'Select';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  className = '',
  ...props
}, ref) => {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        ref={ref}
        className={`w-4 h-4 rounded-md border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-[#1F5C45] focus:ring-[#1F5C45] focus:ring-offset-white dark:focus:ring-offset-zinc-900 transition-all ${className}`}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}) => {
  return (
    <label className={`inline-flex items-center gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-[#1F5C45]/50 ${
          size === 'sm' ? 'w-8 h-4.5 p-0.5' : 'w-11 h-6 p-1'
        } ${checked ? 'bg-[#1F5C45]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow-xs transition-transform ${
            size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } ${checked ? (size === 'sm' ? 'translate-x-3.5' : 'translate-x-5') : 'translate-x-0'}`}
        />
      </button>
      {label && <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>}
    </label>
  );
};

