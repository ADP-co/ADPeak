import React, { forwardRef } from 'react';
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
  ({ label, options, error, className = '', containerClassName = '', variant = 'default', ...props }, ref) => {

    const baseSelectStyles = "appearance-none outline-none transition-colors cursor-pointer";

    const variantStyles = {
      default: `w-full h-9 pl-4 pr-10 rounded-md border text-sm text-center text-brand-Gris_oscuro font-body bg-brand-Blanco focus:ring-1 focus:ring-brand-Verde_principal focus:border-brand-Verde_principal ${
        error ? 'border-brand-Status_rojo focus:ring-brand-Status_rojo focus:border-brand-Status_rojo' : 'border-brand-Gris_bajo/50'
      }`,
      outline: `w-full h-8 px-4 pr-8 rounded-full border border-brand-Verde_oscuro text-center text-brand-Verde_oscuro text-xs font-bold font-accent bg-transparent`,
      solid: `w-full h-8 px-4 pr-8 rounded-full bg-brand-Verde_oscuro text-center text-brand-Blanco text-xs font-bold font-accent`
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
          <label className="text-sm font-semibold text-brand-Gris_oscuro font-body">
            {label}
          </label>
        )}

        <div className="relative w-full">
          <select
            ref={ref}
            className={`${baseSelectStyles} ${variantStyles[variant]} ${className}`}
            {...props}
          >
            {/* Opción por defecto (placeholder) */}
            <option value="" disabled hidden>
              Seleccione una opción
            </option>

            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center ${currentIcon.className}`}>
            <ChevronDown size={currentIcon.size} strokeWidth={currentIcon.strokeWidth} />
          </div>
        </div>

        {error && (
          <span className="text-xs text-brand-Status_rojo font-body font-medium">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
