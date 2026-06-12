import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = true,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-Gris_oscuro/60 backdrop-blur-sm p-4">
      <div className="bg-brand-Blanco rounded-lg shadow-xl p-6 w-full max-w-sm border border-brand-Gris_bajo/20 flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          isDestructive ? 'bg-brand-Status_rojo/10 text-brand-Status_rojo' : 'bg-brand-Status_amarillo/20 text-brand-Status_amarillo'
        }`}>
          <AlertTriangle size={24} strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-title font-bold text-brand-Gris_oscuro mb-2">
          {title}
        </h2>
        <p className="text-brand-Gris_oscuro/80 font-body text-sm mb-8">
          {message}
        </p>
        
        <div className="flex w-full gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-md border border-brand-Gris_bajo/50 text-brand-Gris_oscuro text-sm font-bold hover:bg-brand-Gris_bajo/10 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-md text-brand-Blanco text-sm font-bold transition-colors ${
              isDestructive 
                ? 'bg-brand-Status_rojo hover:bg-red-700' 
                : 'bg-brand-Verde_oscuro hover:bg-brand-Verde_principal'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};