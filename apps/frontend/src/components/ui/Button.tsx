import type { ReactNode, ButtonHTMLAttributes } from 'react';

// Definimos las variantes de color basadas en los tokens de index.css
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
  // Mapeo de estilos según la variante elegida
  const baseStyles = 'font-accent font-bold px-6 py-2 rounded-md transition-all duration-250 cursor-pointer active:scale-98 disabled:opacity-50';

  const variants = {
    primary: 'bg-brand-Verde_oscuro text-brand-Blanco hover:bg-brand-Verde_principal',
    secondary: 'bg-transparent border border-brand-Verde_oscuro text-brand-Verde_oscuro hover:bg-brand-Verde_oscuro hover:text-brand-Blanco',
    success: 'bg-brand-Status_verde text-brand-Gris_oscuro hover:opacity-90',
    warning: 'bg-brand-Status_amarillo text-brand-Gris_oscuro hover:opacity-90',
    error: 'bg-brand-Status_rojo text-brand-Blanco hover:opacity-90',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
