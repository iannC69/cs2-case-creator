import { RARITY_NUM, CS2_RARITY_WEIGHTS } from './constants.js';

/* ── File reader helper ── */
export const readFileAsArrayBuffer = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsArrayBuffer(file);
  });

/* ── Generate server JSON (Trapi format) ── */
export const generateServerJSON = (c) => {
  const clean = {
    id: c.id,
    name: c.name,
    price: Number(c.price),
    color: (c.color || '#ccff00').replace('#', ''),
    enabled: c.enabled,
    cooldownSeconds: Number(c.cooldownSeconds),
    maxOpensPerRound: Number(c.maxOpensPerRound),
    items: c.items.map((item) => ({
      category: item.category,
      weaponIndex: Number(item.weaponIndex),
      paintkitIndex: Number(item.paintkitIndex),
      wearTier: Number(item.wearTier),
      rarity: item.rarity,
      weight: Number(item.weight),
    })),
  };
  return JSON.stringify(clean, null, 4);
};

/* ── Generate site PHP array entry ── */
export const generateSitePHP = (c, cIdx) => {
  const caseImgPath = `/cases/case_${c.id}.png`;
  const featPath = `/cases/featured_${c.id}.png`;
  const rawColor = c.rarityColor || c.color || '#ccff00';
  const colorHex = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;

  const lines = [];
  lines.push(`        [`);
  lines.push(`            'id' => ${cIdx + 1},`);
  lines.push(`            'name' => '${c.name.replace(/'/g, "\\'")}',`);
  lines.push(`            'description' => '${(c.description || '').replace(/'/g, "\\'")}',`);
  lines.push(`            'price' => ${Number(c.price)},`);
  lines.push(`            'image' => '${caseImgPath}',`);
  lines.push(`            'rarity_color' => '${colorHex}',`);
  lines.push(`            'featured_weapon' => '${featPath}',`);
  lines.push(`            'contents' => [`);

  const rarityGroups = {};
  c.items.forEach((item) => {
    const r = item.rarity || 'mil-spec';
    if (!rarityGroups[r]) rarityGroups[r] = [];
    rarityGroups[r].push(item);
  });

  const rarityOrder = ['consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'contraband'];
  const rarityComments = {
    consumer:    'Consumer Grade',
    industrial:  'Industrial Grade',
    'mil-spec':  'Mil-Spec Blue',
    restricted:  'Restricted Purple',
    classified:  'Classified Pink',
    covert:      'Covert Red',
    contraband:  'Contraband / Exceedingly Rare Gold',
  };

  rarityOrder.forEach((rarity) => {
    const items = rarityGroups[rarity];
    if (!items || items.length === 0) return;
    const rarityNum = RARITY_NUM[rarity] || 3;
    lines.push(`                // ${rarityComments[rarity] || rarity}`);
    items.forEach((item) => {
      const label = (item._name || `Weapon ${item.weaponIndex} | Paint ${item.paintkitIndex}`).replace(/'/g, "\\'");
      lines.push(`                ['weapon_defindex' => ${Number(item.weaponIndex)}, 'paintkit_index' => ${Number(item.paintkitIndex)}, 'wear_tier' => ${Number(item.wearTier)}, 'rarity' => ${rarityNum}, 'weight' => ${Number(item.weight)}, 'label' => '${label}'],`);
    });
  });

  lines.push(`            ],`);
  lines.push(`        ]`);
  return lines.join('\n');
};

/**
 * Weighted random pick from an items array using their .weight property.
 */
export const weightedPick = (items) => {
  if (!items || items.length === 0) return null;
  const total = items.reduce((s, i) => s + (Number(i.weight) || 1), 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= Number(item.weight) || 1;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
};

/**
 * Snapshot cases array for undo history.
 * Strips File objects (caseImage, featuredImage) which can't be serialised.
 */
export const snapshotCases = (cases) =>
  cases.map((c) => ({ ...c, caseImage: null, featuredImage: null }));

/**
 * Re-weight case items using CS2 vanilla drop-rate ratios.
 * Items within the same rarity tier share their tier's budget equally.
 */
export const applyCS2Weights = (items) => {
  // Count items per rarity
  const counts = {};
  items.forEach((item) => {
    const r = item.rarity || 'mil-spec';
    counts[r] = (counts[r] || 0) + 1;
  });

  return items.map((item) => {
    const r = item.rarity || 'mil-spec';
    const budget = CS2_RARITY_WEIGHTS[r] ?? 1;
    const share = budget / (counts[r] || 1);
    return { ...item, weight: Math.round(share * 1000) / 1000 };
  });
};
