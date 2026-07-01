import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Package, RotateCcw, Clock, Coins, Trophy, Zap, List } from 'lucide-react';
import { RARITY_MAP, RARITY_NUM, WEAR_TIERS } from '../constants.js';
import { weightedPick } from '../utils.js';

const REEL_ITEM_W  = 152;  // px per card (card width + gap)
const RESULT_IDX   = 14;   // position in reel where result lands
const REEL_COUNT   = 22;   // total cards in the strip
const SPIN_MS      = 2800; // animation duration

const RARITY_LABELS = {
  consumer:    'Consumer Grade',
  industrial:  'Industrial Grade',
  'mil-spec':  'Mil-Spec Grade',
  restricted:  'Restricted',
  classified:  'Classified',
  covert:      'Covert',
  contraband:  'Exceedingly Rare ★',
};

export default function SimulatorView({ activeCase }) {
  const [reel,       setReel]       = useState([]);
  const [spinning,   setSpinning]   = useState(false);
  const [result,     setResult]     = useState(null);
  const [quickOpen,  setQuickOpen]  = useState(false);
  const [showDrops,  setShowDrops]  = useState(true);
  const [simStats,   setSimStats]   = useState({ opened: 0, spent: 0, history: [], bestItem: null });

  const reelRef      = useRef(null);
  const containerRef = useRef(null);
  const spinTimer    = useRef(null);

  const items = activeCase.items;

  useEffect(() => () => clearTimeout(spinTimer.current), []);

  /* ── Initialize reel with random items so it's not a black void ── */
  useEffect(() => {
    if (items.length > 0 && reel.length === 0 && !spinning) {
      setReel(Array.from({ length: REEL_COUNT }, () => items[Math.floor(Math.random() * items.length)]));
    }
  }, [items, reel.length, spinning]);

  const totalWeight = useMemo(
    () => items.reduce((s, i) => s + (Number(i.weight) || 1), 0),
    [items],
  );

  /* ── Update stats helper ── */
  const updateStats = useCallback((picked, count) => {
    setSimStats((prev) => {
      const prevNum   = RARITY_NUM[prev.bestItem?.rarity] || 0;
      const pickedNum = RARITY_NUM[picked.rarity]         || 0;
      return {
        opened:   prev.opened + count,
        spent:    prev.spent + Number(activeCase.price) * count,
        history:  [picked, ...prev.history].slice(0, 50),
        bestItem: pickedNum >= prevNum ? picked : prev.bestItem,
      };
    });
  }, [activeCase.price]);

  /* ── Main open function ── */
  const openCase = useCallback((count = 1) => {
    if (spinning || items.length === 0) return;

    const results = Array.from({ length: count }, () => weightedPick(items));
    const picked  = results[0];

    /* Quick open — no animation */
    if (quickOpen) {
      setResult(picked);
      updateStats(picked, count);
      return;
    }

    /* Build reel strip */
    const strip = Array.from({ length: REEL_COUNT }, (_, i) =>
      i === RESULT_IDX ? picked : items[Math.floor(Math.random() * items.length)],
    );
    setReel(strip);
    setSpinning(true);
    setResult(null);

    /* Reset to x=0 (no transition) */
    if (reelRef.current) {
      reelRef.current.style.transition = 'none';
      reelRef.current.style.transform  = 'translateX(0px)';
    }

    /* Next frame: animate to result */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!reelRef.current || !containerRef.current) return;
      const cW          = containerRef.current.offsetWidth;
      const resultCX    = RESULT_IDX * REEL_ITEM_W + REEL_ITEM_W / 2;
      const targetX     = -(resultCX - cW / 2);
      reelRef.current.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.05, 0.85, 0.18, 1)`;
      reelRef.current.style.transform  = `translateX(${targetX}px)`;
    }));

    clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      setSpinning(false);
      setResult(picked);
      updateStats(picked, count);
    }, SPIN_MS + 80);
  }, [spinning, items, quickOpen, updateStats]);

  const resetStats = () => {
    setSimStats({ opened: 0, spent: 0, history: [], bestItem: null });
    setResult(null);
    setReel(items.length > 0 ? Array.from({ length: REEL_COUNT }, () => items[Math.floor(Math.random() * items.length)]) : []);
    if (reelRef.current) {
      reelRef.current.style.transition = 'none';
      reelRef.current.style.transform  = 'translateX(0)';
    }
  };

  /* ── Case image ── */
  const caseImgUrl = useMemo(
    () => (activeCase.caseImage ? URL.createObjectURL(activeCase.caseImage) : null),
    [activeCase.caseImage],
  );
  useEffect(() => () => { if (caseImgUrl) URL.revokeObjectURL(caseImgUrl); }, [caseImgUrl]);

  /* ── Split item name helper ── */
  const splitName = (name) => {
    if (!name) return { weapon: '', skin: '' };
    const parts = name.split(' | ');
    return parts.length >= 2
      ? { weapon: parts[0], skin: parts.slice(1).join(' | ') }
      : { weapon: '', skin: name };
  };

  return (
    <div className="cc-simulator-layout">
      <div className="cc-sim-hero">

        {/* Case image with glow */}
        <div className="cc-sim-case-img-wrap">
          <div className="cc-sim-case-glow" />
          <img
            src={caseImgUrl || '/open-case-fallback.png'}
            alt={activeCase.name}
            className="cc-sim-case-img"
            onError={(e) => { e.target.onerror = null; e.target.src = '/open-case-fallback.png'; }}
          />
        </div>

        {/* ─── Reel ─── */}
        {items.length > 0 ? (
          <div className="cc-reel-wrap">
            {/* Top triangle pointer */}
            <div className="cc-reel-ptr top" />

            <div className="cc-reel-container" ref={containerRef}>
              {/* Left/right fade */}
              <div className="cc-reel-fade left" />
              <div className="cc-reel-fade right" />

              {/* Scrolling strip */}
              <div className="cc-reel-strip" ref={reelRef}>
                {reel.map((item, i) => {
                  const isResult = !spinning && result && i === RESULT_IDX;
                  const { skin } = splitName(item?._name);
                  return (
                    <div
                      key={i}
                      className={`cc-reel-card${isResult ? ' result' : ''}`}
                      style={{ '--rarity-color': item?._rarityColor || '#94a3b8' }}
                    >
                      <img src={item?._image} alt={item?._name} />
                      <span className="cc-reel-card-name">{skin || item?._name}</span>
                    </div>
                  );
                })}
              </div>

              {/* Result glow at centre */}
              {!spinning && result && (
                <div
                  className="cc-reel-result-glow"
                  style={{ '--glow-color': result._rarityColor || '#ff7a00' }}
                />
              )}
            </div>

            {/* Bottom triangle pointer */}
            <div className="cc-reel-ptr bottom" />
          </div>
        ) : (
          <div className="cc-sim-empty">
            <Package size={28} />
            <p>Add skins in the Editor tab to simulate</p>
          </div>
        )}

        {/* ─── Open buttons ─── */}
        <div className="cc-sim-actions">
          <button
            className="cc-sim-btn-primary"
            onClick={() => openCase(1)}
            disabled={spinning || items.length === 0}
            id="open-case-1-btn"
          >
            <Package size={17} /> OPEN CASE
            <span className="cc-sim-price">
              <span className="cc-coin" />
              {Number(activeCase.price).toLocaleString()}
            </span>
          </button>

          <div className="cc-sim-btn-row">
            <button
              className="cc-sim-btn-outline"
              onClick={() => openCase(3)}
              disabled={spinning || items.length === 0}
              id="open-case-3-btn"
            >
              <span className="cc-sim-multi-label">OPEN ×3</span>
              <span className="cc-sim-price">
                <span className="cc-coin" />
                {(Number(activeCase.price) * 3).toLocaleString()}
              </span>
            </button>
            <button
              className="cc-sim-btn-outline red"
              onClick={() => openCase(5)}
              disabled={spinning || items.length === 0}
              id="open-case-5-btn"
            >
              <span className="cc-sim-multi-label">OPEN ×5</span>
              <span className="cc-sim-price">
                <span className="cc-coin" />
                {(Number(activeCase.price) * 5).toLocaleString()}
              </span>
            </button>
          </div>

          {/* Quick open + contents toggles */}
          <div className="cc-sim-toggles">
            <button
              className={`cc-sim-toggle-btn ${quickOpen ? 'active' : ''}`}
              onClick={() => setQuickOpen((v) => !v)}
              id="quick-open-btn"
            >
              <Zap size={13} />
              Quick Open {quickOpen ? 'ON' : 'OFF'}
            </button>
            <button
              className={`cc-sim-toggle-btn ${showDrops ? 'active' : ''}`}
              onClick={() => setShowDrops((v) => !v)}
              id="contents-btn"
            >
              <List size={13} />
              Contents
            </button>
          </div>
        </div>

        {/* ─── Stats bar ─── */}
        <div className="cc-sim-stats">
          <div className="cc-sim-stat">
            <Clock size={13} />
            Opened: <span>{simStats.opened}</span>
          </div>
          <div className="cc-sim-stat">
            <Coins size={13} />
            Spent: <span style={{ color: '#ff9900' }}>{simStats.spent.toLocaleString()}</span>
          </div>
          <div className="cc-sim-stat">
            <Trophy size={13} />
            Best:{' '}
            <span style={{ color: simStats.bestItem?._rarityColor || '#94a3b8' }}>
              {simStats.bestItem
                ? splitName(simStats.bestItem._name).skin || simStats.bestItem._name
                : '–'}
            </span>
          </div>
          {simStats.opened > 0 && (
            <button className="cc-sim-reset-btn" onClick={resetStats} id="reset-sim-btn" title="Reset stats">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── Possible drops grid ─── */}
      {showDrops && (
        <div className="cc-visual-preview" data-lenis-prevent>
          <div className="cc-visual-header">
            <Package size={14} />
            POSSIBLE DROPS ({items.length} ITEMS)
          </div>

          <div className="cc-visual-grid">
            {items.map((item) => {
              const chance = totalWeight > 0
                ? ((Number(item.weight) || 1) / totalWeight) * 100
                : 0;
              const { weapon, skin } = splitName(item._name);
              const wear = WEAR_TIERS.find((w) => w.value === item.wearTier);
              const rarityLabel = RARITY_LABELS[item.rarity] || item.rarity;
              const isSpecial = item.rarity === 'contraband' || item.rarity === 'covert';

              return (
                <div
                  key={item._uid}
                  className="cc-visual-card"
                  style={{ '--rarity-color': item._rarityColor || '#94a3b8' }}
                >
                  <div className="cc-visual-img-wrap">
                    <img src={item._image} alt={item._name} loading="lazy" />
                  </div>
                  <div className="cc-visual-info">
                    <div className="cc-visual-name" title={item._name}>
                      {isSpecial && <span className="cc-star">★ </span>}
                      {weapon && <span className="cc-visual-weapon">{weapon}</span>}
                      {weapon && ' | '}
                      <span className="cc-visual-skin">{skin || item._name}</span>
                    </div>
                    <div className="cc-visual-rarity" style={{ color: item._rarityColor }}>
                      {rarityLabel}
                    </div>
                    {wear && (
                      <div className="cc-visual-wear" style={{ color: wear.color }}>
                        {wear.label}
                      </div>
                    )}
                    <div className="cc-visual-chance">{chance.toFixed(chance < 0.01 ? 6 : 4)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
