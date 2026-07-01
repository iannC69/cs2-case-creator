import { X } from 'lucide-react';
import { WEAR_TIERS } from '../../constants.js';

/**
 * Modal shown when clicking an unselected skin in the browser.
 * Lets the user pick wear + weight before adding to the case.
 * Bug fix: wear/weight always reset to defaults when `skin` prop changes.
 */
export default function AddSkinModal({ skin, wear, weight, onWearChange, onWeightChange, onAdd, onClose }) {
  if (!skin) return null;

  return (
    <div
      className="cc-preview-overlay"
      onClick={onClose}
      style={{ backdropFilter: 'blur(5px)' }}
    >
      <div
        className="cc-preview-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          background: 'rgba(13, 16, 22, 0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
          borderRadius: '18px',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-skin-title"
      >
        {/* Header */}
        <div className="cc-preview-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.1rem 1.4rem' }}>
          <h3 id="add-skin-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Add Skin to Case</h3>
          <div style={{ flex: 1 }} />
          <button className="cc-icon-btn" onClick={onClose} id="add-skin-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          {/* Skin preview */}
          <div style={{
            display: 'flex', gap: '1rem', alignItems: 'center',
            background: 'rgba(255,255,255,0.03)', padding: '0.9rem', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <img
              src={skin.image}
              alt={skin.name}
              style={{ width: '96px', height: '68px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                {skin.pattern?.name || skin.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                {skin.weapon?.name}
              </div>
            </div>
          </div>

          {/* Wear selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 800, marginBottom: '0.5rem' }}>
              Wear Condition
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
              {WEAR_TIERS.map((w) => {
                const sel = wear === w.value;
                return (
                  <button
                    key={w.value}
                    id={`wear-btn-${w.value}`}
                    onClick={() => onWearChange(w.value)}
                    style={{
                      background: sel ? `color-mix(in srgb, ${w.color} 14%, transparent)` : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${sel ? w.color : 'rgba(255,255,255,0.06)'}`,
                      color: sel ? w.color : '#475569',
                      padding: '0.55rem 0.3rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      transition: 'all 0.18s',
                      boxShadow: sel ? `0 0 14px color-mix(in srgb, ${w.color} 30%, transparent) inset` : 'none',
                    }}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weight / drop chance */}
          <div>
            <label
              htmlFor="add-skin-weight"
              style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 800, marginBottom: '0.5rem' }}
            >
              Drop Chance (Weight)
            </label>
            <input
              id="add-skin-weight"
              type="number"
              min="0.01"
              step="0.01"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 1rem',
                background: 'rgba(0,0,0,0.3)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                fontSize: '1.1rem', fontWeight: 700, outline: 'none',
                transition: 'border-color 0.2s', fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(204,255,0,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button className="cc-btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }} id="add-skin-cancel-btn">
              Cancel
            </button>
            <button
              className="cc-btn primary"
              id="add-skin-confirm-btn"
              onClick={onAdd}
              style={{ flex: 2, justifyContent: 'center', fontSize: '0.9rem', minHeight: '44px' }}
            >
              Add to Case
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
