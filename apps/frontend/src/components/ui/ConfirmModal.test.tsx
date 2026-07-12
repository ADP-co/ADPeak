import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfirmModal,
  focusInitialModalElement,
  handleModalKeyDown,
  restoreModalFocus,
} from './ConfirmModal';

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

const createKeyboardEvent = (key: string, shiftKey = false) => {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();

  return {
    event: { key, shiftKey, preventDefault, stopPropagation },
    preventDefault,
    stopPropagation,
  };
};

describe('ConfirmModal accessibility', () => {
  it('renders a modal dialog without hiding the backdrop from accessibility APIs', () => {
    const markup = renderToStaticMarkup(
      <ConfirmModal
        isOpen
        title="Delete item"
        message="This action cannot be undone."
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );

    const backdropTag = markup.match(/^<div[^>]*>/)?.[0];
    const labelledBy = markup.match(/aria-labelledby="([^"]+)"/)?.[1];
    const describedBy = markup.match(/aria-describedby="([^"]+)"/)?.[1];

    expect(backdropTag).toContain('role="presentation"');
    expect(backdropTag).not.toContain('aria-hidden');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain(`id="${labelledBy}"`);
    expect(markup).toContain(`id="${describedBy}"`);
  });

  it('focuses the initial control and restores the previously focused trigger', () => {
    const cancelButton = createFocusableElement();
    const dialog = createDialog([cancelButton]);
    const trigger = createFocusableElement();

    focusInitialModalElement(cancelButton, dialog);
    restoreModalFocus(trigger);

    expect(cancelButton.focus).toHaveBeenCalledOnce();
    expect(trigger.focus).toHaveBeenCalledOnce();
  });

  it('does not restore focus to an element that has left the document', () => {
    const detachedTrigger = createFocusableElement(false);

    restoreModalFocus(detachedTrigger);

    expect(detachedTrigger.focus).not.toHaveBeenCalled();
  });

  it('wraps Tab and Shift+Tab within the dialog', () => {
    const cancelButton = createFocusableElement();
    const confirmButton = createFocusableElement();
    const dialog = createDialog([cancelButton, confirmButton]);
    const forwardTab = createKeyboardEvent('Tab');
    const backwardTab = createKeyboardEvent('Tab', true);

    handleModalKeyDown(forwardTab.event, dialog, confirmButton, vi.fn());
    handleModalKeyDown(backwardTab.event, dialog, cancelButton, vi.fn());

    expect(forwardTab.preventDefault).toHaveBeenCalledOnce();
    expect(cancelButton.focus).toHaveBeenCalledOnce();
    expect(backwardTab.preventDefault).toHaveBeenCalledOnce();
    expect(confirmButton.focus).toHaveBeenCalledOnce();
  });

  it('closes on Escape and prevents the key from reaching the page', () => {
    const dialog = createDialog([]);
    const escape = createKeyboardEvent('Escape');
    const onClose = vi.fn();

    handleModalKeyDown(escape.event, dialog, null, onClose);

    expect(escape.preventDefault).toHaveBeenCalledOnce();
    expect(escape.stopPropagation).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
