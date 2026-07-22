import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      className = '',
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hasError = Boolean(error);
    const describedBy = hasError
      ? [ariaDescribedBy, errorId].filter(Boolean).join(' ')
      : ariaDescribedBy;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="font-body text-sm font-semibold text-brand-Gris_oscuro">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          {...props}
          aria-describedby={describedBy}
          aria-invalid={hasError ? true : ariaInvalid}
          className={`
            min-h-11 border p-2 rounded-md font-body text-brand-Gris_oscuro w-full
            focus:outline-none focus:ring-2 focus:ring-brand-Verde_principal
            transition-all duration-200 bg-brand-Blanco
            ${error ? 'border-brand-Status_rojo ring-1 ring-brand-Status_rojo' : 'border-brand-Gris_bajo'}
            ${className}
          `}
        />
        {error && (
          <span id={errorId} role="alert" className="text-brand-Status_rojo text-sm font-accent font-semibold mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
