import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Package, Plus, Box, Download, Save, Upload, Copy, Undo2, Redo2,
} from 'lucide-react';
import JSZip from 'jszip';

import {
  RARITY_MAP, createDefaultCase,
  API_URL, SKINS_CACHE_KEY, SKINS_CACHE_TTL,
} from './constants.js';
import {
  readFileAsArrayBuffer, generateServerJSON, generateSitePHP,
  snapshotCases, applyCS2Weights,
} from './utils.js';

import CaseSettingsPanel from './components/CaseSettingsPanel.jsx';
import SkinBrowser       from './components/SkinBrowser.jsx';
import CaseItemsList     from './components/CaseItemsList.jsx';
import SimulatorView     from './components/SimulatorView.jsx';
import AddSkinModal      from './components/modals/AddSkinModal.jsx';
import ImportModal       from './components/modals/ImportModal.jsx';
import ConfirmModal      from './components/modals/ConfirmModal.jsx';

import './index.css';

/* ════════════════════════════════════════════
   App — central state + logic container
   ════════════════════════════════════════════ */
export default function App() {

  /* ── Skins API ── */
  const [allSkins,    setAllSkins]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [cacheStatus, setCacheStatus] = useState('loading'); // 'loading' | 'live' | 'cached' | 'error'

  /* ── Cases ── */
  const [cases, setCasesRaw] = useState(() => {
    try {
      const saved = localStorage.getItem('case_creator_save');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [createDefaultCase(0)];
  });
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);

  /* ── Undo / Redo ── */
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  /* ── UI ── */
  const [appMode,         setAppMode]         = useState('editor');
  const [toast,           setToast]           = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [confirmModal,    setConfirmModal]    = useState(null);
  const [renamingTabId,   setRenamingTabId]   = useState(null);
  const [renameValue,     setRenameValue]     = useState('');

  /* ── Add-skin modal state (reset on open — bug fix) ── */
  const [skinToAdd, setSkinToAdd] = useState(null);
  const [addWear,   setAddWear]   = useState(0);
  const [addWeight, setAddWeight] = useState(10);

  const toastTimer     = useRef(null);
  const renameInputRef = useRef(null);

  const activeCase = cases[activeCaseIdx] ?? cases[0];

  /* ════════════════════════
     Helpers
     ════════════════════════ */

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const showConfirm = useCallback((cfg) => setConfirmModal(cfg),  []);
  const hideConfirm = useCallback(()    => setConfirmModal(null), []);

  /* ════════════════════════
     setCases (history-aware wrapper)
     ════════════════════════ */
  const setCases = useCallback((updater) => {
    setCasesRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      /* push snapshot to undo stack, clear redo */
      setUndoStack((s) => {
        const snap = snapshotCases(prev);
        const ns   = [...s, snap];
        return ns.length > 30 ? ns.slice(-30) : ns;
      });
      setRedoStack([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    setCasesRaw((prev) => {
      const snapshot = undoStack[undoStack.length - 1];
      setUndoStack((s) => s.slice(0, -1));
      setRedoStack((r) => [...r, snapshotCases(prev)]);
      return snapshot;
    });
    showToast('Undone');
  }, [undoStack, showToast]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    setCasesRaw((prev) => {
      const snapshot = redoStack[redoStack.length - 1];
      setRedoStack((s) => s.slice(0, -1));
      setUndoStack((r) => [...r, snapshotCases(prev)]);
      return snapshot;
    });
    showToast('Redone');
  }, [redoStack, showToast]);

  /* ════════════════════════
     Keyboard shortcuts
     ════════════════════════ */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  /* ════════════════════════
     localStorage persistence
     ════════════════════════ */
  useEffect(() => {
    const toSave = cases.map((c) => ({ ...c, caseImage: null, featuredImage: null }));
    localStorage.setItem('case_creator_save', JSON.stringify(toSave));
  }, [cases]);

  /* ════════════════════════
     Tab rename auto-focus
     ════════════════════════ */
  useEffect(() => {
    if (renamingTabId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingTabId]);

  /* ════════════════════════
     Skin API — with 24h localStorage cache
     ════════════════════════ */
  useEffect(() => {
    const processSkins = (raw) =>
      raw.filter((s) => s.weapon?.weapon_id && s.paint_index && s.image);

    try {
      const raw = localStorage.getItem(SKINS_CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < SKINS_CACHE_TTL) {
          setAllSkins(processSkins(data));
          setCacheStatus('cached');
          setLoading(false);
          return;
        }
      }
    } catch { /* corrupt cache — fall through to fetch */ }

    setLoading(true);
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        const filtered = processSkins(data);
        setAllSkins(filtered);
        setCacheStatus('live');
        setLoading(false);
        try {
          localStorage.setItem(SKINS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch { /* storage quota exceeded — silent */ }
      })
      .catch((err) => {
        setError(err.message);
        setCacheStatus('error');
        setLoading(false);
      });
  }, []);

  /* ════════════════════════
     Derived values
     ════════════════════════ */
  const folderName = useMemo(
    () => `CASE_${activeCase.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_+$/, '')}`,
    [activeCase.name],
  );

  /* ════════════════════════
     Case CRUD
     ════════════════════════ */
  const updateCase = useCallback(
    (key, value) => {
      setCases((prev) => {
        const next = [...prev];
        next[activeCaseIdx] = { ...next[activeCaseIdx], [key]: value };
        return next;
      });
    },
    [activeCaseIdx, setCases],
  );

  const updateItem = useCallback(
    (uid, key, value) => {
      setCases((prev) => {
        const next = [...prev];
        next[activeCaseIdx] = {
          ...next[activeCaseIdx],
          items: next[activeCaseIdx].items.map((i) =>
            i._uid === uid ? { ...i, [key]: value } : i,
          ),
        };
        return next;
      });
    },
    [activeCaseIdx, setCases],
  );

  const removeItem = useCallback(
    (uid) => {
      setCases((prev) => {
        const next = [...prev];
        next[activeCaseIdx] = {
          ...next[activeCaseIdx],
          items: next[activeCaseIdx].items.filter((i) => i._uid !== uid),
        };
        return next;
      });
    },
    [activeCaseIdx, setCases],
  );

  const reorderItems = useCallback(
    (fromUid, toUid) => {
      setCases((prev) => {
        const next  = [...prev];
        const items = [...next[activeCaseIdx].items];
        const fi    = items.findIndex((i) => i._uid === fromUid);
        const ti    = items.findIndex((i) => i._uid === toUid);
        if (fi === -1 || ti === -1) return prev;
        const [moved] = items.splice(fi, 1);
        items.splice(ti, 0, moved);
        next[activeCaseIdx] = { ...next[activeCaseIdx], items };
        return next;
      });
    },
    [activeCaseIdx, setCases],
  );

  const distributeWeights = useCallback(() => {
    setCases((prev) => {
      const next = [...prev];
      next[activeCaseIdx] = {
        ...next[activeCaseIdx],
        items: applyCS2Weights(next[activeCaseIdx].items),
      };
      return next;
    });
    showToast('CS2 drop rates applied!');
  }, [activeCaseIdx, setCases, showToast]);

  /* addCase — fixed stale-closure bug */
  const addCase = useCallback(() => {
    setActiveCaseIdx(cases.length); // correct index for the new case
    setCases((prev) => [...prev, createDefaultCase(prev.length)]);
  }, [cases.length, setCases]);

  /* deleteCase — fixed stale-index bug via functional updater */
  const deleteCase = useCallback(
    (idx) => {
      if (cases.length <= 1) return;
      showConfirm({
        title: `Delete "${cases[idx]?.name}"?`,
        message: 'This cannot be undone.',
        danger: true,
        confirmLabel: 'Delete',
        onConfirm: () => {
          setCases((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            setActiveCaseIdx((cur) => Math.min(cur, next.length - 1));
            return next;
          });
          hideConfirm();
        },
      });
    },
    [cases, setCases, showConfirm, hideConfirm],
  );

  const duplicateCase = useCallback(
    (idx) => {
      setCases((prev) => {
        const src = prev[idx];
        const dup = {
          ...src,
          id:           `${src.id}_copy_${Date.now()}`,
          name:         `${src.name} (Copy)`,
          caseImage:    null,
          featuredImage: null,
          items:        src.items.map((i) => ({ ...i, _uid: `${i._uid}_d${Math.random().toString(36).slice(2)}` })),
        };
        const next = [...prev, dup];
        setActiveCaseIdx(next.length - 1);
        return next;
      });
      showToast('Case duplicated!');
    },
    [setCases, showToast],
  );

  /* ════════════════════════
     Skin browser → add/remove
     ════════════════════════ */
  const handleSkinClick = useCallback(
    (skin, alreadyInCase) => {
      if (alreadyInCase) {
        /* direct remove — no modal */
        setCases((prev) => {
          const next = [...prev];
          next[activeCaseIdx] = {
            ...next[activeCaseIdx],
            items: next[activeCaseIdx].items.filter(
              (i) => !(i.weaponIndex === skin.weapon?.weapon_id && i.paintkitIndex === parseInt(skin.paint_index, 10)),
            ),
          };
          return next;
        });
        showToast(`Removed ${skin.name}`);
      } else {
        /* open add-skin modal — reset wear/weight (bug fix) */
        setAddWear(0);
        setAddWeight(10);
        setSkinToAdd(skin);
      }
    },
    [activeCaseIdx, setCases, showToast],
  );

  const confirmAddSkin = useCallback(() => {
    if (!skinToAdd) return;
    const rarityVal   = RARITY_MAP[skinToAdd.rarity?.id]?.value || 'mil-spec';
    const rarityColor = RARITY_MAP[skinToAdd.rarity?.id]?.color || '#4b69ff';
    const newItem     = {
      _uid:          `${skinToAdd.weapon.weapon_id}_${skinToAdd.paint_index}_${Date.now()}`,
      _name:         skinToAdd.name,
      _image:        skinToAdd.image,
      _rarityColor:  rarityColor,
      category:      'weapon',
      weaponIndex:   skinToAdd.weapon.weapon_id,
      paintkitIndex: parseInt(skinToAdd.paint_index, 10),
      wearTier:      addWear,
      rarity:        rarityVal,
      weight:        Number(addWeight) || 10,
    };
    setCases((prev) => {
      const next = [...prev];
      next[activeCaseIdx] = {
        ...next[activeCaseIdx],
        items: [...next[activeCaseIdx].items, newItem],
      };
      return next;
    });
    showToast(`Added ${skinToAdd.name}`);
    setSkinToAdd(null);
  }, [skinToAdd, addWear, addWeight, activeCaseIdx, setCases, showToast]);

  /* ════════════════════════
     Import / Export
     ════════════════════════ */
  const processImportData = useCallback(
    (parsed, mode) => {
      if (!parsed) { showToast('Invalid JSON'); return; }

      let importedCases = [];
      if (Array.isArray(parsed))                           importedCases = parsed;
      else if (parsed.cases && Array.isArray(parsed.cases)) importedCases = parsed.cases;
      else if (parsed.id   && Array.isArray(parsed.items)) importedCases = [parsed];

      if (importedCases.length === 0) { showToast('No cases found in import data'); return; }

      const newCases = importedCases.map((c) => {
        const items = (Array.isArray(c.items) ? c.items : []).map((item, idx) => {
          const skin   = allSkins.find((s) => s.weapon?.weapon_id == item.weaponIndex && s.paint_index == item.paintkitIndex);
          const rColor = skin ? (RARITY_MAP[skin.rarity?.id]?.color || skin.rarity?.color || '#94a3b8') : '#94a3b8';
          return {
            ...item,
            _uid:        `${item.weaponIndex}_${item.paintkitIndex}_${idx}_${Date.now()}`,
            _name:       skin ? skin.name : `Unknown ${item.weaponIndex}:${item.paintkitIndex}`,
            _image:      skin ? skin.image : '',
            _rarityColor: rColor,
          };
        });
        return {
          ...c,
          id:            c.id    || `case_${Date.now()}`,
          name:          c.name  || 'Imported Case',
          price:         c.price || 100,
          color:         c.color || '#FF7A00',
          rarityColor:   c.rarityColor || c.color || '#FF7A00',
          enabled:       c.enabled !== false,
          caseImage:     null,
          featuredImage: null,
          items,
        };
      });

      if (mode === 'merge') {
        setActiveCaseIdx(cases.length);
        setCases((prev) => [...prev, ...newCases]);
        showToast(`Merged ${newCases.length} case(s)!`);
        setShowImportModal(false);
      } else {
        showConfirm({
          title:        'Replace all cases?',
          message:      `Your ${cases.length} existing case(s) will be replaced by ${newCases.length} imported case(s).`,
          danger:       true,
          confirmLabel: 'Replace All',
          onConfirm:    () => {
            setCases(newCases);
            setActiveCaseIdx(0);
            showToast(`Imported ${newCases.length} case(s)!`);
            setShowImportModal(false);
            hideConfirm();
          },
        });
      }
    },
    [allSkins, cases.length, setCases, showToast, showConfirm, hideConfirm],
  );

  const exportFullProfile = useCallback(() => {
    const profile = {
      cases: cases.map((c) => {
        const out = { ...c };
        delete out.caseImage;
        delete out.featuredImage;
        delete out.rarityColor;
        out.color = (c.color || c.rarityColor || '#FF7A00').replace('#', '');
        out.items = c.items.map((i) => {
          const item = { ...i };
          delete item._uid; delete item._name; delete item._image; delete item._rarityColor;
          return item;
        });
        return out;
      }),
    };
    const blob = new Blob([JSON.stringify(profile, null, 4)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'cases.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported!');
  }, [cases, showToast]);

  const saveCase = useCallback(async () => {
    const c = activeCase;
    if (c.items.length === 0) { showToast('Add some skins first!'); return; }

    const zip    = new JSZip();
    const folder = zip.folder(folderName);
    folder.file('server.json', generateServerJSON(c));
    folder.file('site.php', `${generateSitePHP(c, activeCaseIdx)},\n`);

    if (c.caseImage) {
      const buf = await readFileAsArrayBuffer(c.caseImage);
      folder.file(`case_${c.id}.${c.caseImage.name?.split('.').pop() || 'png'}`, buf);
    }
    if (c.featuredImage) {
      const buf = await readFileAsArrayBuffer(c.featuredImage);
      folder.file(`featured_${c.id}.${c.featuredImage.name?.split('.').pop() || 'png'}`, buf);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${folderName}.zip`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Saved ${folderName}.zip`);
  }, [activeCase, activeCaseIdx, folderName, showToast]);

  const saveFullConfig = useCallback(async () => {
    if (cases.length === 0) { showToast('No cases to save!'); return; }

    const zip        = new JSZip();
    const mainFolder = zip.folder('FULL_CONFIG');
    mainFolder.file(
      'server.json',
      JSON.stringify({ cases: cases.map((c) => JSON.parse(generateServerJSON(c))) }, null, 4),
    );
    mainFolder.file('site.php', cases.map((c, i) => `${generateSitePHP(c, i)},`).join('\n'));

    const imgFolder = mainFolder.folder('cases');
    for (const c of cases) {
      if (c.caseImage)    { const buf = await readFileAsArrayBuffer(c.caseImage);    imgFolder.file(`case_${c.id}.${c.caseImage.name?.split('.').pop() || 'png'}`, buf); }
      if (c.featuredImage){ const buf = await readFileAsArrayBuffer(c.featuredImage); imgFolder.file(`featured_${c.id}.${c.featuredImage.name?.split('.').pop() || 'png'}`, buf); }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'FULL_CONFIG.zip'; a.click();
    URL.revokeObjectURL(url);
    showToast('Saved FULL_CONFIG.zip!');
  }, [cases, showToast]);

  /* ════════════════════════
     Tab rename commit
     ════════════════════════ */
  const commitRename = useCallback(() => {
    if (renameValue.trim()) updateCase('name', renameValue.trim());
    setRenamingTabId(null);
  }, [renameValue, updateCase]);

  /* ════════════════════════
     Render
     ════════════════════════ */
  return (
    <div className="platform-container">
      <div className="main-content">
        <main className="case-creator-page">
          <div className="case-creator-shell">

            {/* ── Hero ── */}
            <div className="case-creator-hero">
              <div>
                <span className="tool-studio-kicker">
                  <Package size={15} /> CS2 Case Creator
                </span>
                <h1>Case Creator</h1>
                <p>Browse all CS2 skins, build your case, and export server.json + site.php + images.</p>
              </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="cc-case-tabs">
              {cases.map((c, idx) => (
                <div key={c.id} className="cc-case-tab-wrapper">
                  <button
                    className={`cc-case-tab ${idx === activeCaseIdx ? 'active' : ''}`}
                    onClick={() => setActiveCaseIdx(idx)}
                    onDoubleClick={() => {
                      setActiveCaseIdx(idx);
                      setRenamingTabId(c.id);
                      setRenameValue(c.name);
                    }}
                    id={`tab-${c.id}`}
                  >
                    <Box size={13} />
                    {renamingTabId === c.id ? (
                      <input
                        ref={renameInputRef}
                        className="cc-tab-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')  commitRename();
                          if (e.key === 'Escape') setRenamingTabId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        id={`tab-rename-${c.id}`}
                      />
                    ) : (
                      c.name || `Case #${idx + 1}`
                    )}
                  </button>

                  {/* Duplicate button */}
                  <button
                    className="cc-tab-action-btn dupe"
                    onClick={(e) => { e.stopPropagation(); duplicateCase(idx); }}
                    title="Duplicate case"
                    id={`tab-dupe-${c.id}`}
                  >
                    <Copy size={10} />
                  </button>

                  {/* Delete button — only shown when >1 case */}
                  {cases.length > 1 && (
                    <button
                      className="cc-tab-action-btn del"
                      onClick={(e) => { e.stopPropagation(); deleteCase(idx); }}
                      title="Delete case"
                      id={`tab-del-${c.id}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {/* Add new case */}
              <button
                className="cc-case-tab-add"
                onClick={addCase}
                title="Add new case"
                id="add-case-btn"
                style={{ padding: '0 1rem', width: 'auto', fontSize: '0.85rem' }}
              >
                <Plus size={14} style={{ marginRight: '4px' }} /> New Case
              </button>

              <div style={{ flex: 1 }} />

              {/* Undo / Redo */}
              <button
                className="cc-action-btn"
                onClick={undo}
                disabled={undoStack.length === 0}
                title="Undo (Ctrl+Z)"
                id="undo-btn"
                style={{ opacity: undoStack.length === 0 ? 0.35 : 1 }}
              >
                <Undo2 size={14} />
              </button>
              <button
                className="cc-action-btn"
                onClick={redo}
                disabled={redoStack.length === 0}
                title="Redo (Ctrl+Y)"
                id="redo-btn"
                style={{ opacity: redoStack.length === 0 ? 0.35 : 1 }}
              >
                <Redo2 size={14} />
              </button>

              {/* Mode toggle */}
              <div className="cc-mode-toggle">
                <button className={appMode === 'editor'    ? 'active' : ''} onClick={() => setAppMode('editor')}    id="mode-editor-btn">Editor</button>
                <button className={appMode === 'simulator' ? 'active' : ''} onClick={() => setAppMode('simulator')} id="mode-sim-btn">Simulator</button>
              </div>

              {/* Global actions */}
              <button className="cc-action-btn" onClick={() => setShowImportModal(true)} title="Import full config" id="upload-config-btn">
                <Upload size={14} /> Upload Config
              </button>
              <button className="cc-action-btn primary" onClick={saveFullConfig} title="Download ZIP" id="export-full-btn">
                <Download size={14} /> Export All (ZIP)
              </button>
              <button className="cc-action-btn" onClick={exportFullProfile} title="Backup to JSON" style={{ opacity: 0.55 }} id="backup-btn">
                <Save size={14} /> Backup
              </button>
            </div>

            {/* ── Main content ── */}
            {appMode === 'editor' ? (
              <div className="case-creator-grid">
                {/* Left: Settings */}
                <CaseSettingsPanel
                  activeCase={activeCase}
                  activeCaseIdx={activeCaseIdx}
                  folderName={folderName}
                  updateCase={updateCase}
                  saveCase={saveCase}
                  showToast={showToast}
                />

                {/* Centre: Skin browser */}
                <SkinBrowser
                  allSkins={allSkins}
                  loading={loading}
                  error={error}
                  cacheStatus={cacheStatus}
                  activeCase={activeCase}
                  onSkinClick={handleSkinClick}
                />

                {/* Right: Case items */}
                <CaseItemsList
                  activeCase={activeCase}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  reorderItems={reorderItems}
                  distributeWeights={distributeWeights}
                />
              </div>
            ) : (
              <SimulatorView activeCase={activeCase} />
            )}

            {/* ── Footer ── */}
            <footer className="cc-footer">
              <p>Custom tool created for personal use on the <strong>Wildfire</strong> server.</p>
              <p style={{ opacity: 0.45, fontSize: '0.75rem' }}>
                Not affiliated with Valve. Counter-Strike and CS2 are trademarks of Valve Corporation.
              </p>
            </footer>

          </div>
        </main>
      </div>

      {/* ── Toast ── */}
      <div className={`cc-toast ${toast ? 'visible' : ''}`}>
        {toast}
      </div>

      {/* ── Modals ── */}
      <AddSkinModal
        skin={skinToAdd}
        wear={addWear}
        weight={addWeight}
        onWearChange={setAddWear}
        onWeightChange={setAddWeight}
        onAdd={confirmAddSkin}
        onClose={() => setSkinToAdd(null)}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={processImportData}
      />

      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title}
        message={confirmModal?.message}
        confirmLabel={confirmModal?.confirmLabel}
        danger={confirmModal?.danger}
        onConfirm={confirmModal?.onConfirm}
        onCancel={hideConfirm}
      />
    </div>
  );
}
