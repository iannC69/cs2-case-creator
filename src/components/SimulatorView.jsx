import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Package, RotateCcw, Clock, Coins, Trophy, Zap, List, Star } from 'lucide-react';
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
  contraband:  'Exceedingly Rare',
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
                  <div className="cc-visual-chance-badge">{Number(chance.toFixed(4))}%</div>
                  <div className="cc-visual-img-wrap">
                    <img src={item._image} alt={item._name} loading="lazy" />
                  </div>
                  <div className="cc-visual-info">
                    <div className="cc-visual-name" title={item._name}>
                      {weapon && (
                        <div className="cc-visual-weapon">
                          {isSpecial && <span className="cc-star" style={{display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginRight: '3px'}}><Star size={10} fill="currentColor" /></span>}
                          {weapon.replace('★ ', '')}
                        </div>
                      )}
                      <div className="cc-visual-skin" style={{ color: item._rarityColor || '#f1f5f9' }}>
                        {skin || item._name}
                      </div>
                    </div>
                    <div className="cc-visual-meta">
                      <div className="cc-visual-rarity">{rarityLabel}</div>
                      {wear && (
                        <div className="cc-visual-wear" style={{ color: wear.color }}>
                          {wear.label}
                        </div>
                      )}
                    </div>
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
