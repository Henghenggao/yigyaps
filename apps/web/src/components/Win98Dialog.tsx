import type { ReactNode } from 'react';

interface Win98DialogProps {
  title: string;
  icon?: string;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function Win98Dialog({ title, icon, onClose, footer, children }: Win98DialogProps) {
  return (
    <div className="w98-dialog-backdrop">
      <div className="w98-dialog">
        <div className="w98-titlebar">
          {icon && <span className="w98-titlebar__icon">{icon}</span>}
          <span className="w98-titlebar__title">{title}</span>
          <div className="w98-titlebar__controls">
            {onClose && (
              <button
                className="w98-ctrl-btn w98-ctrl-btn--close"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="w98-dialog__body">{children}</div>
        {footer && <div className="w98-dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
