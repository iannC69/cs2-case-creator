import { useState, useMemo } from 'react';
import { ListChecks, Trash2, GripVertical, ChevronDown, ChevronUp, BarChart2, Package } from 'lucide-react';
import { WEAR_TIERS, RARITY_MAP, RARITY_NUM } from '../constants.js';

export default function CaseItemsList({ activeCase, updateItem, removeItem, reorderItems, distributeWeights }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [showProb, setShowProb] = useState(false);

  const totalWeight = useMemo(
    () => activeCase.items.reduce((s, i) => s + (Number(i.weight) || 0), 0),
    [activeCase.items],
  );

  const rarityStats = useMemo(() => {
    const groups = {};
    activeCase.items.forEach((item) => {
      const r = item.rarity || 'mil-spec';
      if (!groups[r]) {
        const mapEntry = Object.values(RARITY_MAP).find((m) => m.value === r);
        groups[r] = { weight: 0, count: 0, color: mapEntry?.color || '#94a3b8', num: mapEntry?.num || 3 };
      }
      groups[r].weight += Number(item.weight) || 0;
      groups[r].count++;
    });
    return Object.entries(groups)
      .map(([rarity, data]) => ({
        rarity,
        ...data,
        pct: totalWeight > 0 ? (data.weight / totalWeight) * 100 : 0,
      }))
      .sort((a, b) => a.num - b.num);
  }, [activeCase.items, totalWeight]);

  /* ── Drag-to-reorder handlers ── */
  const handleDragStart = (e, uid) => {
    setDragId(uid);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, uid) => {
    e.preventDefault();
    if (uid !== dragId) setDragOverId(uid);
  };

  const handleDrop = (e, uid) => {
    e.preventDefault();
    if (dragId && dragId !== uid) reorderItems(dragId, uid);
    setDragId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <div className="cc-panel">
      <h2 className="cc-panel-title">
        <ListChecks size={16} /> Case Items
        <span className="cc-count-badge">{activeCase.items.length}</span>
      </h2>

      {activeCase.items.length > 0 && (
        <div className="cc-stats">
          <div className="cc-stat">
            <span className="cc-stat-value">{activeCase.items.length}</span>
            <span className="cc-stat-label">Items</span>
          </div>
          <div className="cc-stat">
            <span className="cc-stat-value">{totalWeight.toFixed(1)}</span>
            <span className="cc-stat-label">Total Weight</span>
          </div>
          <div className="cc-stat">
            <span className="cc-stat-value">{[...new Set(activeCase.items.map((i) => i.rarity))].length}</span>
            <span className="cc-stat-label">Rarities</span>
          </div>
          <button
            className="cc-btn cc-cs2-weights-btn"
            onClick={distributeWeights}
            title="Apply CS2 vanilla drop rates"
            id="distribute-weights-btn"
          >
            <BarChart2 size={13} /> CS2 Rates
          </button>
        </div>
      )}

      {activeCase.items.length === 0 ? (
        <div className="cc-empty">
          <Package size={32} />
          <p>No items yet.<br />Click skins in the browser to add them.</p>
        </div>
      ) : (
        <div className="cc-case-items-scroll">
          {activeCase.items.map((item) => (
            <div
              key={item._uid}
              className={`cc-case-item ${dragOverId === item._uid ? 'drag-over' : ''} ${dragId === item._uid ? 'dragging' : ''}`}
              style={{ '--rarity-color': item._rarityColor || '#94a3b8' }}
              draggable
              onDragStart={(e) => handleDragStart(e, item._uid)}
              onDragOver={(e) => handleDragOver(e, item._uid)}
              onDrop={(e) => handleDrop(e, item._uid)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              <div className="cc-drag-handle" title="Drag to reorder">
                <GripVertical size={14} />
              </div>

              {/* Thumbnail */}
              <img className="cc-case-item-img" src={item._image} alt={item._name} loading="lazy" />

              {/* Info */}
              <div className="cc-case-item-info">
                <strong title={item._name}>{item._name?.split('|').pop()?.trim() || item._name}</strong>
                <span>WI:{item.weaponIndex} / PK:{item.paintkitIndex}</span>
              </div>

              {/* Controls */}
              <div className="cc-case-item-controls">
                <select
                  className="cc-wear-select"
                  value={item.wearTier}
                  onChange={(e) => updateItem(item._uid, 'wearTier', parseInt(e.target.value, 10))}
                  style={{ color: WEAR_TIERS.find((w) => w.value === item.wearTier)?.color || '#fff' }}
                  id={`wear-${item._uid}`}
                >
                  {WEAR_TIERS.map((w) => (
                    <option key={w.value} value={w.value} style={{ color: w.color, background: '#0f172a' }}>
                      {w.label}
                    </option>
                  ))}
                </select>

                <div className="cc-weight-control" title="Drop chance weight">
                  <label>W</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.weight}
                    onChange={(e) => updateItem(item._uid, 'weight', parseFloat(e.target.value) || 1)}
                    id={`weight-${item._uid}`}
                  />
                </div>

                <button className="cc-remove-btn" onClick={() => removeItem(item._uid)} title="Remove" id={`remove-${item._uid}`}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rarity probability calculator ── */}
      {activeCase.items.length > 0 && (
        <div className="cc-prob-section">
          <button className="cc-prob-toggle" onClick={() => setShowProb((p) => !p)} id="prob-toggle-btn">
            <BarChart2 size={13} />
            Drop Probabilities
            {showProb ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showProb && (
            <div className="cc-prob-table">
              {rarityStats.map(({ rarity, count, pct, color }) => (
                <div key={rarity} className="cc-prob-row">
                  <span className="cc-prob-rarity" style={{ color }}>
                    {rarity}
                  </span>
                  <span className="cc-prob-count">{count}×</span>
                  <div className="cc-prob-bar-wrap">
                    <div
                      className="cc-prob-bar"
                      style={{ width: `${Math.min(pct, 100)}%`, background: color }}
                    />
                  </div>
                  <span className="cc-prob-pct">{pct.toFixed(pct < 0.01 ? 6 : pct < 1 ? 4 : 2)}%</span>
                </div>
              ))}
              <div className="cc-prob-note">
                Percentages are based on relative weights. Actual server drop rates may differ.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
