import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export type SelectVariant = 'default' | 'outline' | 'solid';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
  variant?: SelectVariant;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    options,
    error,
    className = '',
    containerClassName = '',
    variant = 'default',
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
    const generatedId = useId();
    const selectId = props.id ?? generatedId;
    const errorId = `${selectId}-error`;
    const hasError = Boolean(error);
    const describedBy = hasError
      ? [ariaDescribedBy, errorId].filter(Boolean).join(' ')
      : ariaDescribedBy;

    const baseSelectStyles = "appearance-none outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-Verde_principal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

    const variantStyles = {
      default: `w-full h-11 pl-4 pr-10 rounded-md border text-sm text-center text-brand-Gris_oscuro font-body bg-brand-Blanco focus:ring-1 focus:ring-brand-Verde_principal focus:border-brand-Verde_principal ${
        error ? 'border-brand-Status_rojo focus:ring-brand-Status_rojo focus:border-brand-Status_rojo' : 'border-brand-Gris_bajo/50'
      }`,
      outline: `w-full h-11 px-4 pr-8 rounded-full border border-brand-Verde_oscuro text-center text-brand-Verde_oscuro text-xs font-bold font-accent bg-transparent`,
      solid: `w-full h-11 px-4 pr-8 rounded-full bg-brand-Verde_oscuro text-center text-brand-Blanco text-xs font-bold font-accent`
    };

    const iconStyles = {
      default: { className: 'text-brand-Gris_oscuro', size: 16, strokeWidth: 2 },
      outline: { className: 'text-brand-Verde_oscuro', size: 14, strokeWidth: 3 },
      solid: { className: 'text-brand-Blanco', size: 14, strokeWidth: 3 },
    };

    const currentIcon = iconStyles[variant];

    return (
      <div className={`flex flex-col gap-1 ${containerClassName || 'w-full'}`.trim()}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-semibold text-brand-Gris_oscuro font-body">
            {label}
          </label>
        )}

        <div className="relative w-full">
          <select
            id={selectId}
            ref={ref}
            aria-describedby={describedBy}
            aria-invalid={hasError ? true : ariaInvalid}
            className={`${baseSelectStyles} ${variantStyles[variant]} ${className}`}
            {...props}
          >
            {/* Opción por defecto (placeholder) */}
            <option value="" disabled hidden className="bg-brand-Blanco text-brand-Gris_oscuro">
              Seleccione una opción
            </option>

            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-brand-Blanco text-brand-Gris_oscuro">
                {opt.label}
              </option>
            ))}
          </select>

          <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center ${currentIcon.className}`}>
            <ChevronDown size={currentIcon.size} strokeWidth={currentIcon.strokeWidth} />
          </div>
        </div>

        {error && (
          <span id={errorId} role="alert" className="text-sm text-brand-Status_rojo font-body font-semibold">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
