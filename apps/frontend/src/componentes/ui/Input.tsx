import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        <label className="font-body text-sm font-semibold text-brand-Gris_oscuro">
          {label}
        </label>
        <input
          ref={ref}
          {...props}
          className={`
            border p-2 rounded-md font-body text-brand-Gris_oscuro w-full
            focus:outline-none focus:ring-2 focus:ring-brand-Verde_principal
            transition-all duration-200 bg-brand-Blanco
            ${error ? 'border-brand-Status_rojo ring-1 ring-brand-Status_rojo' : 'border-brand-Gris_bajo'}
            ${className}
          `}
        />
        {error && (
          <span className="text-brand-Status_rojo text-xs font-accent mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';