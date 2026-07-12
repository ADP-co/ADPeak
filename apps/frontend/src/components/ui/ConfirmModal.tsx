import { useEffect, useId, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type ModalKeyboardEvent = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'preventDefault' | 'stopPropagation'
>;

const getFocusableElements = (dialog: HTMLElement) =>
  Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute('hidden') &&
      element.getAttribute('aria-hidden') !== 'true'
  );

export const focusInitialModalElement = (
  initialElement: HTMLElement | null,
  dialog: HTMLElement | null
) => {
  if (!dialog) {
    return;
  }

  (initialElement ?? getFocusableElements(dialog)[0] ?? dialog).focus();
};

export const restoreModalFocus = (element: HTMLElement | null) => {
  if (element?.isConnected) {
    element.focus();
  }
};

export const handleModalKeyDown = (
  event: ModalKeyboardEvent,
  dialog: HTMLElement | null,
  activeElement: Element | null,
  onClose: () => void
) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    onClose();
    return;
  }

  if (event.key !== 'Tab' || !dialog) {
    return;
  }

  const focusableElements = getFocusableElements(dialog);

  if (focusableElements.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeIndex = focusableElements.indexOf(activeElement as HTMLElement);
  const shouldWrap =
    activeIndex === -1 ||
    (event.shiftKey && activeElement === firstElement) ||
    (!event.shiftKey && activeElement === lastElement);

  if (shouldWrap) {
    event.preventDefault();
    (event.shiftKey ? lastElement : firstElement).focus();
  }
};

export const useModalFocusTrap = (isOpen: boolean, onClose: () => void) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    focusInitialModalElement(initialFocusRef.current, dialogRef.current);

    const handleKeyDown = (event: KeyboardEvent) => {
      handleModalKeyDown(
        event,
        dialogRef.current,
        document.activeElement,
        onCloseRef.current
      );
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      restoreModalFocus(previouslyFocusedElement);
    };
  }, [isOpen]);

  return { dialogRef, initialFocusRef };
};

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
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const messageId = `${modalId}-message`;
  const { dialogRef, initialFocusRef } = useModalFocusTrap(isOpen, onCancel);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-Gris_oscuro/60 backdrop-blur-sm p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="bg-brand-Blanco rounded-lg shadow-xl p-6 w-full max-w-sm border border-brand-Gris_bajo/20 flex flex-col items-center text-center"
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            isDestructive
              ? 'bg-brand-Status_rojo/10 text-brand-Status_rojo'
              : 'bg-brand-Status_amarillo/20 text-brand-Status_amarillo'
          }`}
        >
          <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.5} />
        </div>
        <h2 id={titleId} className="text-xl font-title font-bold text-brand-Gris_oscuro mb-2">
          {title}
        </h2>
        <p id={messageId} className="text-brand-Gris_oscuro/80 font-body text-sm mb-8">
          {message}
        </p>

        <div className="flex w-full gap-3">
          <button
            ref={initialFocusRef}
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-md border border-brand-Gris_bajo/50 text-brand-Gris_oscuro text-sm font-bold hover:bg-brand-Gris_bajo/10 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
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
