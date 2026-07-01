export const RARITY_MAP = {
  rarity_common_weapon:    { label: 'Consumer',    value: 'consumer',    color: '#b0c3d9', num: 1 },
  rarity_uncommon_weapon:  { label: 'Industrial',  value: 'industrial',  color: '#5e98d9', num: 2 },
  rarity_rare_weapon:      { label: 'Mil-Spec',    value: 'mil-spec',    color: '#4b69ff', num: 3 },
  rarity_mythical_weapon:  { label: 'Restricted',  value: 'restricted',  color: '#8847ff', num: 4 },
  rarity_legendary_weapon: { label: 'Classified',  value: 'classified',  color: '#d32ce6', num: 5 },
  rarity_ancient_weapon:   { label: 'Covert',      value: 'covert',      color: '#eb4b4b', num: 6 },
  rarity_contraband_weapon:{ label: 'Contraband',  value: 'contraband',  color: '#e4ae39', num: 7 },
  rarity_contraband:       { label: 'Contraband',  value: 'contraband',  color: '#e4ae39', num: 7 },
  rarity_ancient:          { label: 'Covert',      value: 'covert',      color: '#eb4b4b', num: 6 },
  rarity_legendary:        { label: 'Classified',  value: 'classified',  color: '#d32ce6', num: 5 },
  rarity_mythical:         { label: 'Restricted',  value: 'restricted',  color: '#8847ff', num: 4 },
  rarity_rare:             { label: 'Mil-Spec',    value: 'mil-spec',    color: '#4b69ff', num: 3 },
  rarity_uncommon:         { label: 'Industrial',  value: 'industrial',  color: '#5e98d9', num: 2 },
  rarity_common:           { label: 'Consumer',    value: 'consumer',    color: '#b0c3d9', num: 1 },
};

export const RARITY_NUM = {
  consumer: 1, industrial: 2, 'mil-spec': 3,
  restricted: 4, classified: 5, covert: 6, contraband: 7,
};

export const RARITY_OPTIONS = [
  'consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'contraband',
];

export const WEAR_TIERS = [
  { value: 0, label: 'Factory New',    color: '#00cc66' },
  { value: 1, label: 'Minimal Wear',   color: '#99ff33' },
  { value: 2, label: 'Field-Tested',   color: '#ffcc00' },
  { value: 3, label: 'Well-Worn',      color: '#ff9933' },
  { value: 4, label: 'Battle-Scarred', color: '#ff3300' },
];

export const ITEMS_PER_PAGE = 60;
export const API_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

export const SKINS_CACHE_KEY = 'cs2cc_skins_v1';
export const SKINS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * CS2 approximate vanilla drop-rate budgets.
 * These are relative weights per rarity tier that match real CS2 probability ratios.
 */
export const CS2_RARITY_WEIGHTS = {
  consumer:    799.2,
  industrial:  159.8,
  'mil-spec':   32.0,
  restricted:    6.4,
  classified:    1.28,
  covert:        0.256,
  contraband:    0.004,
};

export const createDefaultCase = (index = 0) => ({
  id: `new_case_${Date.now()}_${index}`,
  name: `New Case #${index + 1}`,
  price: 100,
  color: '#FF7A00',
  enabled: true,
  cooldownSeconds: 30,
  maxOpensPerRound: 3,
  description: '',
  rarityColor: '#FF7A00',
  caseImage: null,
  featuredImage: null,
  items: [],
});
