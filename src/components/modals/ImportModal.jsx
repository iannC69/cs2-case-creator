import { useState } from 'react';
import { X, Upload, AlertTriangle } from 'lucide-react';

/**
 * Import modal — supports both Replace All and Merge modes.
 * Calls onImport(parsed, mode) so App.jsx handles the actual state mutation.
 */
export default function ImportModal({ isOpen, onClose, onImport }) {
  const [importText, setImportText] = useState('');
  const [mode, setMode] = useState('replace'); // 'replace' | 'merge'
  const fileRef = { current: null };

  if (!isOpen) return null;

  const handleText = () => {
    try {
      const parsed = JSON.parse(importText);
      onImport(parsed, mode);
      setImportText('');
    } catch {
      // Let parent surface error via toast
      onImport(null, mode);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        onImport(parsed, mode);
        setImportText('');
      } catch {
        onImport(null, mode);
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="cc-preview-overlay" onClick={onClose}>
      <div
        className="cc-preview-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        {/* Header */}
        <div className="cc-preview-header">
          <h3 id="import-modal-title">Import Cases Profile</h3>
          <div style={{ flex: 1 }} />
          <button className="cc-icon-btn" onClick={onClose} id="import-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0d0f12' }}>
          <p style={{ color: '#64748b', fontSize: '0.84rem', lineHeight: 1.6 }}>
            Paste your <code style={{ color: '#94a3b8' }}>cases.json</code> text below, or upload the file directly.
          </p>

          {/* Mode toggle */}
          <div className="cc-import-mode-toggle">
            <button
              id="import-mode-replace"
              className={`cc-import-mode-btn ${mode === 'replace' ? 'active' : ''}`}
              onClick={() => setMode('replace')}
            >
              Replace All
            </button>
            <button
              id="import-mode-merge"
              className={`cc-import-mode-btn ${mode === 'merge' ? 'active' : ''}`}
              onClick={() => setMode('merge')}
            >
              Merge (add to existing)
            </button>
          </div>
          {mode === 'replace' && (
            <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '-0.5rem' }}>
              <AlertTriangle size={12} style={{marginRight: '4px', verticalAlign: '-2px'}} /> Replace All will overwrite your current cases.
            </p>
          )}

          <textarea
            className="cc-textarea"
            rows={8}
            placeholder='{"cases": [ ... ]}'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}
            id="import-textarea"
          />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="cc-btn primary"
              onClick={handleText}
              style={{ flex: 1, justifyContent: 'center', minHeight: '44px' }}
              disabled={!importText.trim()}
              id="import-text-btn"
            >
              Import Text
            </button>
            <label
              className="cc-btn"
              style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}
              htmlFor="import-file-input"
            >
              <Upload size={15} /> Upload JSON File
              <input
                id="import-file-input"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
