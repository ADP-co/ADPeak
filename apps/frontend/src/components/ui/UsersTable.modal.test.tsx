import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  focusInitialModalElement,
  handleModalKeyDown,
  restoreModalFocus,
} from './ConfirmModal';
import { UserModalFrame } from './UsersTable';

const createFocusableElement = (isConnected = true) =>
  ({
    focus: vi.fn(),
    getAttribute: vi.fn(() => null),
    hasAttribute: vi.fn(() => false),
    isConnected,
    tabIndex: 0,
  }) as unknown as HTMLElement;

const createDialog = (focusableElements: HTMLElement[]) =>
  ({
    focus: vi.fn(),
    querySelectorAll: vi.fn(() => focusableElements),
  }) as unknown as HTMLDivElement;

const createKeyboardEvent = (key: string, shiftKey = false) => ({
  key,
  shiftKey,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
});

describe('UsersTable modal accessibility', () => {
  it('renders a labelled modal with viewport-safe mobile scrolling', () => {
    const markup = renderToStaticMarkup(
      <UserModalFrame labelledBy="test-user-modal-title">
        <h2 id="test-user-modal-title">Modificar usuario</h2>
        <input aria-label="Nombre" />
      </UserModalFrame>
    );

    expect(markup).toContain('role="presentation"');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="test-user-modal-title"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('overflow-y-auto');
    expect(markup).toContain('overscroll-contain');
    expect(markup).toContain('items-center');
    expect(markup).toContain('justify-center');
    expect(markup).toContain('max-h-[calc(100dvh-1.5rem)]');
    expect(markup).toContain('sm:max-h-[calc(100dvh-2rem)]');
  });

  it('focuses the first control and restores the trigger after closing', () => {
    const firstInput = createFocusableElement();
    const trigger = createFocusableElement();
    const dialog = createDialog([firstInput]);

    focusInitialModalElement(firstInput, dialog);
    restoreModalFocus(trigger);

    expect(firstInput.focus).toHaveBeenCalledOnce();
    expect(trigger.focus).toHaveBeenCalledOnce();
  });

  it('closes with Escape and wraps focus within the dialog', () => {
    const firstInput = createFocusableElement();
    const lastButton = createFocusableElement();
    const dialog = createDialog([firstInput, lastButton]);
    const onClose = vi.fn();
    const escapeEvent = createKeyboardEvent('Escape');
    const tabEvent = createKeyboardEvent('Tab');
    const shiftTabEvent = createKeyboardEvent('Tab', true);

    handleModalKeyDown(escapeEvent, dialog, firstInput, onClose);
    handleModalKeyDown(tabEvent, dialog, lastButton, onClose);
    handleModalKeyDown(shiftTabEvent, dialog, firstInput, onClose);

    expect(escapeEvent.preventDefault).toHaveBeenCalledOnce();
    expect(escapeEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(tabEvent.preventDefault).toHaveBeenCalledOnce();
    expect(firstInput.focus).toHaveBeenCalledOnce();
    expect(shiftTabEvent.preventDefault).toHaveBeenCalledOnce();
    expect(lastButton.focus).toHaveBeenCalledOnce();
  });
});
