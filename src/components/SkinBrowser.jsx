import { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Crosshair, Check, Zap, Globe } from 'lucide-react';
import { RARITY_MAP, ITEMS_PER_PAGE } from '../constants.js';

export default function SkinBrowser({
  allSkins,
  loading,
  error,
  cacheStatus,
  activeCase,
  onSkinClick,
}) {
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [weaponFilter, setWeaponFilter] = useState('all');
  const [page, setPage] = useState(1);

  const isSkinInCase = (skin) =>
    activeCase.items.some(
      (i) =>
        i.weaponIndex === skin.weapon?.weapon_id &&
        i.paintkitIndex === parseInt(skin.paint_index, 10),
    );

  const getRarityColor = (skin) =>
    RARITY_MAP[skin.rarity?.id]?.color || skin.rarity?.color || '#94a3b8';
  const getRarityLabel = (skin) =>
    RARITY_MAP[skin.rarity?.id]?.label || skin.rarity?.name || 'Unknown';

  const categoryNames = useMemo(() => {
    const names = new Set();
    allSkins.forEach((s) => s.category?.name && names.add(s.category.name));
    return [...names].sort();
  }, [allSkins]);

  const weaponNames = useMemo(() => {
    const names = new Set();
    allSkins.forEach((s) => s.weapon?.name && names.add(s.weapon.name));
    return [...names].sort();
  }, [allSkins]);

  const filteredSkins = useMemo(() => {
    let result = allSkins;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.weapon?.name?.toLowerCase().includes(q) ||
          s.pattern?.name?.toLowerCase().includes(q),
      );
    }
    if (rarityFilter !== 'all')
      result = result.filter((s) => RARITY_MAP[s.rarity?.id]?.value === rarityFilter);
    if (categoryFilter !== 'all')
      result = result.filter((s) => s.category?.name === categoryFilter);
    if (weaponFilter !== 'all')
      result = result.filter((s) => s.weapon?.name === weaponFilter);
    return result;
  }, [allSkins, search, rarityFilter, categoryFilter, weaponFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSkins.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedSkins = filteredSkins.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset page when filters change
  useEffect(() => setPage(1), [search, rarityFilter, categoryFilter, weaponFilter]);

  return (
    <div className="cc-panel">
      <h2 className="cc-panel-title">
        <Crosshair size={16} /> Skin Browser
        <span className="cc-count-badge">{filteredSkins.length}</span>
        {cacheStatus !== 'loading' && (
          <span className={`cc-cache-badge ${cacheStatus}`} title={cacheStatus === 'cached' ? 'Loaded from local cache' : 'Loaded live from API'}>
            {cacheStatus === 'cached' ? (
              <><Zap size={10} style={{marginRight: '2px'}} /> Cached</>
            ) : (
              <><Globe size={10} style={{marginRight: '2px'}} /> Live</>
            )}
          </span>
        )}
      </h2>

      {/* Search + filters */}
      <div className="cc-browser-header">
        <input
          id="skin-search"
          className="cc-search"
          placeholder="Search skins…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          id="rarity-filter"
          className="cc-filter-select"
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
        >
          <option value="all">All Rarities</option>
          {Object.entries(RARITY_MAP)
            .filter(([id], i, arr) => arr.findIndex(([, r2]) => r2.label === RARITY_MAP[id].label) === i)
            .map(([id, r]) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
        </select>
        <select
          id="category-filter"
          className="cc-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          id="weapon-filter"
          className="cc-filter-select"
          value={weaponFilter}
          onChange={(e) => setWeaponFilter(e.target.value)}
        >
          <option value="all">All Weapons</option>
          {weaponNames.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {/* Skin grid */}
      {loading ? (
        <div className="cc-loading">
          <div className="cc-loading-spinner" />
          <p style={{ marginTop: '0.75rem' }}>Loading skins from API…</p>
        </div>
      ) : error ? (
        <div className="cc-empty">
          <p>Error: {error}</p>
          <button className="cc-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      ) : paginatedSkins.length === 0 ? (
        <div className="cc-empty">
          <Search size={32} />
          <p>No skins found matching your filters</p>
        </div>
      ) : (
        <>
          <div className="cc-skins-scroll">
            <div className="cc-skins-grid">
              {paginatedSkins.map((skin) => {
                const selected = isSkinInCase(skin);
                const rarityColor = getRarityColor(skin);
                return (
                  <div
                    key={skin.id}
                    id={`skin-card-${skin.id}`}
                    className={`cc-skin-card ${selected ? 'selected' : ''}`}
                    style={{ '--rarity-color': rarityColor }}
                    onClick={() => onSkinClick(skin, selected)}
                    title={selected ? `Remove ${skin.name}` : `Add ${skin.name}`}
                  >
                    {selected && (
                      <div className="cc-skin-selected-badge">
                        <Check size={13} color="#071008" strokeWidth={3} />
                      </div>
                    )}
                    <img className="cc-skin-img" src={skin.image} alt={skin.name} loading="lazy" />
                    <span className="cc-skin-name" title={skin.name}>
                      {skin.pattern?.name || skin.name}
                    </span>
                    <span className="cc-skin-weapon">
                      {skin.weapon?.name} • ID:{skin.weapon?.weapon_id} / PK:{skin.paint_index}
                    </span>
                    <span className="cc-skin-rarity-badge" style={{ '--rarity-color': rarityColor }}>
                      <span className="cc-skin-rarity-dot" />
                      {getRarityLabel(skin)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          <div className="cc-pagination">
            <button
              id="page-prev-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              id="page-next-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
