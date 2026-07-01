import { AlertTriangle } from 'lucide-react';

/**
 * Custom confirm dialog — replaces native window.confirm().
 * Render it at the App level and control via confirmModal state.
 */
export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="cc-preview-overlay" onClick={onCancel}>
      <div
        className="cc-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="cc-confirm-header">
          <AlertTriangle size={18} className={danger ? 'cc-confirm-icon danger' : 'cc-confirm-icon'} />
          <h3 id="confirm-title">{title}</h3>
        </div>
        {message && <p className="cc-confirm-message">{message}</p>}
        <div className="cc-confirm-actions">
          <button className="cc-btn" onClick={onCancel} id="confirm-cancel-btn">
            {cancelLabel}
          </button>
          <button
            className={`cc-btn ${danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            id="confirm-ok-btn"
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
