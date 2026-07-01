import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Settings, Eye, Save, FileJson, Copy, Globe, Box, Folder, FolderOpen, Upload, X, AlertTriangle
} from 'lucide-react';
import { generateServerJSON, generateSitePHP } from '../utils.js';

export default function CaseSettingsPanel({
  activeCase,
  activeCaseIdx,
  folderName,
  updateCase,
  saveCase,
  showToast,
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState('server');

  const caseImgRef = useRef(null);
  const featImgRef = useRef(null);

  /* ── Image object URLs (memoised + cleaned up to prevent leak) ── */
  const caseImagePreview = useMemo(
    () => (activeCase.caseImage ? URL.createObjectURL(activeCase.caseImage) : null),
    [activeCase.caseImage],
  );
  const featuredImagePreview = useMemo(
    () => (activeCase.featuredImage ? URL.createObjectURL(activeCase.featuredImage) : null),
    [activeCase.featuredImage],
  );

  useEffect(() => {
    return () => {
      if (caseImagePreview) URL.revokeObjectURL(caseImagePreview);
    };
  }, [caseImagePreview]);

  useEffect(() => {
    return () => {
      if (featuredImagePreview) URL.revokeObjectURL(featuredImagePreview);
    };
  }, [featuredImagePreview]);

  const shortenFileName = (name) => {
    if (!name) return '';
    const parts = name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop() : '';
    const base = parts.join('.');
    if (base.length <= 8) return name;
    return base.substring(0, 6) + '…' + ext;
  };

  const serverJson = useMemo(() => generateServerJSON(activeCase), [activeCase]);
  const sitePHP = useMemo(() => generateSitePHP(activeCase, activeCaseIdx), [activeCase, activeCaseIdx]);

  return (
    <div className="cc-panel">
      <h2 className="cc-panel-title">
        <Settings size={16} /> Case Settings
      </h2>

      {/* ── Basic info ── */}
      <div className="cc-field">
        <label htmlFor="cs-id">Case ID</label>
        <input
          id="cs-id"
          value={activeCase.id}
          onChange={(e) => updateCase('id', e.target.value)}
          placeholder="e.g. weapon_case_1"
        />
      </div>

      <div className="cc-field">
        <label htmlFor="cs-name">Case Name</label>
        <input
          id="cs-name"
          value={activeCase.name}
          onChange={(e) => updateCase('name', e.target.value)}
          placeholder="e.g. Weapon Case #1"
        />
      </div>

      <div className="cc-field">
        <label htmlFor="cs-desc">Description (site)</label>
        <textarea
          id="cs-desc"
          className="cc-textarea"
          value={activeCase.description}
          onChange={(e) => updateCase('description', e.target.value)}
          placeholder="Legendary contraband collection…"
          rows={2}
        />
      </div>

      <div className="cc-inline">
        <div className="cc-field">
          <label htmlFor="cs-price">Price</label>
          <input
            id="cs-price"
            type="number"
            value={activeCase.price}
            onChange={(e) => updateCase('price', e.target.value)}
          />
        </div>
        <div className="cc-field">
          <label>Case Color</label>
          <div className="cc-color-preview">
            <input
              type="color"
              id="cs-color-picker"
              value={activeCase.color.startsWith('#') ? activeCase.color : `#${activeCase.color}`}
              onChange={(e) => {
                updateCase('color', e.target.value);
                updateCase('rarityColor', e.target.value);
              }}
            />
            <input
              id="cs-color-text"
              value={activeCase.color}
              onChange={(e) => {
                updateCase('color', e.target.value);
                updateCase('rarityColor', e.target.value);
              }}
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>

      <div className="cc-inline">
        <div className="cc-field">
          <label htmlFor="cs-cooldown">Cooldown (sec)</label>
          <input
            id="cs-cooldown"
            type="number"
            value={activeCase.cooldownSeconds}
            onChange={(e) => updateCase('cooldownSeconds', e.target.value)}
          />
        </div>
        <div className="cc-field">
          <label htmlFor="cs-maxopens">Max Opens/Round</label>
          <input
            id="cs-maxopens"
            type="number"
            value={activeCase.maxOpensPerRound}
            onChange={(e) => updateCase('maxOpensPerRound', e.target.value)}
          />
        </div>
      </div>

      <div className="cc-toggle-row">
        <label>Enabled</label>
        <div
          id="cs-enabled-toggle"
          className={`cc-toggle ${activeCase.enabled ? 'active' : ''}`}
          onClick={() => updateCase('enabled', !activeCase.enabled)}
          role="switch"
          aria-checked={activeCase.enabled}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && updateCase('enabled', !activeCase.enabled)}
        />
      </div>

      {/* ── Images ── */}
      <div className="cc-section-divider">
        <Eye size={13} /> Images
      </div>

      {/* Image warning banner */}
        {(activeCase.caseImage || activeCase.featuredImage) && (
          <div className="cc-image-warning">
            <AlertTriangle size={12} style={{marginRight: '4px', verticalAlign: '-1px'}} /> Images are not saved between sessions — re-upload after refresh.
          </div>
        )}

      {/* Case image */}
      <div className="cc-field">
        <label>Case Image</label>
        <div className="cc-image-upload-area">
          {caseImagePreview ? (
            <div className="cc-image-preview-box">
              <img src={caseImagePreview} alt="Case" className="cc-image-thumb" />
              <div className="cc-image-preview-info">
                <span className="cc-image-path" title={activeCase.caseImage?.name}>
                  {shortenFileName(activeCase.caseImage?.name)}
                </span>
                <button className="cc-remove-btn" onClick={() => updateCase('caseImage', null)} id="remove-case-img-btn">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button className="cc-upload-btn" onClick={() => caseImgRef.current?.click()} id="upload-case-img-btn">
              <Upload size={16} /> Upload Case Image
            </button>
          )}
          <input
            ref={caseImgRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && updateCase('caseImage', e.target.files[0])}
          />
        </div>
      </div>

      {/* Featured weapon image */}
      <div className="cc-field">
        <label>Featured Weapon Image</label>
        <div className="cc-image-upload-area">
          {featuredImagePreview ? (
            <div className="cc-image-preview-box">
              <img src={featuredImagePreview} alt="Featured" className="cc-image-thumb" />
              <div className="cc-image-preview-info">
                <span className="cc-image-path" title={activeCase.featuredImage?.name}>
                  {shortenFileName(activeCase.featuredImage?.name)}
                </span>
                <button className="cc-remove-btn" onClick={() => updateCase('featuredImage', null)} id="remove-feat-img-btn">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button className="cc-upload-btn" onClick={() => featImgRef.current?.click()} id="upload-feat-img-btn">
              <Upload size={16} /> Upload Featured Weapon
            </button>
          )}
          <input
            ref={featImgRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && updateCase('featuredImage', e.target.files[0])}
          />
        </div>
      </div>

      {/* Folder preview */}
      <div className="cc-folder-info">
        <FolderOpen size={14} />
        <span>Folder: <strong>{folderName}</strong></span>
      </div>
      <div className="cc-folder-tree">
        <div className="cc-tree-line">
          <Folder size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
          {folderName}/
        </div>
        <div className="cc-tree-line sub">├── server.json</div>
        <div className="cc-tree-line sub">├── site.php</div>
        {activeCase.caseImage && (
          <div className="cc-tree-line sub">├── case_{activeCase.id}.{activeCase.caseImage.name?.split('.').pop() || 'png'}</div>
        )}
        {activeCase.featuredImage && (
          <div className="cc-tree-line sub">└── featured_{activeCase.id}.{activeCase.featuredImage.name?.split('.').pop() || 'png'}</div>
        )}
      </div>

      {/* Actions */}
      <div className="cc-actions">
        <button className="cc-btn primary cc-btn-save" onClick={saveCase} id="export-single-btn">
          <Save size={15} /> Export ZIP
        </button>
        <button className="cc-btn" onClick={() => setShowPreview((p) => !p)} id="toggle-preview-btn">
          <FileJson size={15} /> {showPreview ? 'Hide' : 'Preview'}
        </button>
        <button
          className="cc-btn"
          id="copy-json-btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(serverJson);
              showToast('Server JSON copied!');
            } catch {
              showToast('Failed to copy');
            }
          }}
        >
          <Copy size={15} /> Copy JSON
        </button>
      </div>

      {/* JSON/PHP preview */}
      {showPreview && (
        <div className="cc-preview-section">
          <div className="cc-preview-tabs">
            <button
              className={`cc-preview-tab ${previewTab === 'server' ? 'active' : ''}`}
              onClick={() => setPreviewTab('server')}
              id="preview-tab-server"
            >
              <Box size={14} /> Server JSON
            </button>
            <button
              className={`cc-preview-tab ${previewTab === 'site' ? 'active' : ''}`}
              onClick={() => setPreviewTab('site')}
              id="preview-tab-site"
            >
              <Globe size={14} /> Site PHP
            </button>
          </div>
          <div className="cc-json-output">
            {previewTab === 'server' && serverJson}
            {previewTab === 'site' && sitePHP}
          </div>
        </div>
      )}
    </div>
  );
}
