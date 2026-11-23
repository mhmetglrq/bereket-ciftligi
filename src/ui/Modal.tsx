import { useEffect, useRef, type ReactNode } from 'react';
import { tr } from '../i18n/tr';

const focusables = 'button:not(:disabled), input:not(:disabled), select, textarea, [href], [tabindex="0"]';

export function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const element = ref.current;
    const outside = document.getElementById('game-content');
    outside?.setAttribute('inert', '');
    const targets = (): HTMLElement[] =>
      element ? Array.from(element.querySelectorAll<HTMLElement>(focusables)) : [];
    (targets()[0] ?? element)?.focus();
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const items = targets();
        if (items.length === 0) {
          event.preventDefault();
          element?.focus();
          return;
        }
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          items[items.length - 1].focus();
        } else if (!event.shiftKey && (index === items.length - 1 || index < 0)) {
          event.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('keydown', key, true);
      outside?.removeAttribute('inert');
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onPointerDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <h2 id="dialog-title">{title}</h2>
          <button className="icon-button" aria-label={tr.close} onClick={onClose}>×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
