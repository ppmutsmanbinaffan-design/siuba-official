import React from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  helperText?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  helperText,
  required,
  htmlFor,
  children,
  className = '',
}) => {
  const displayHint = hint || helperText;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {displayHint && !error && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{displayHint}</p>
      )}
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1" role="alert">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
};

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  hint,
  leftIcon,
  rightIcon,
  icon,
  required,
  id,
  className = '',
  ...props
}, ref) => {
  const effectiveLeftIcon = leftIcon || icon;
  const errorMessage = typeof error === 'string' ? error : undefined;
  const isError = Boolean(error);

  const inputElement = (
    <div className="relative flex items-center">
      {effectiveLeftIcon && (
        <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none flex items-center justify-center">
          {effectiveLeftIcon}
        </div>
      )}
      <input
        ref={ref}
        id={id}
        required={required}
        className={`w-full bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border ${
          isError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-zinc-300 dark:border-zinc-700 focus:border-[#1F5C45] dark:focus:border-[#2F7D5A] focus:ring-[#1F5C45]/20 dark:focus:ring-[#2F7D5A]/20'
        } px-3.5 py-2.5 min-h-[42px] sm:min-h-[44px] transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed ${
          effectiveLeftIcon ? 'pl-10' : ''
        } ${rightIcon ? 'pr-10' : ''} ${className}`}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3.5 text-zinc-400 dark:text-zinc-500 flex items-center justify-center">
          {rightIcon}
        </div>
      )}
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
        {inputElement}
      </FormField>
    );
  }

  return inputElement;
});

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  hint,
  required,
  id,
  className = '',
  rows = 3,
  ...props
}, ref) => {
  const errorMessage = typeof error === 'string' ? error : undefined;
  const isError = Boolean(error);

  const textareaElement = (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      required={required}
      className={`w-full bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border min-h-[100px] ${
        isError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-zinc-300 dark:border-zinc-700 focus:border-[#1F5C45] dark:focus:border-[#2F7D5A] focus:ring-[#1F5C45]/20 dark:focus:ring-[#2F7D5A]/20'
      } px-3.5 py-2.5 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
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
        {textareaElement}
      </FormField>
    );
  }

  return textareaElement;
});

Textarea.displayName = 'Textarea';

