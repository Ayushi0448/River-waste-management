/**
 * wasteCategories.js — SINGLE SOURCE OF TRUTH for the waste taxonomy.
 *
 * ───────────────────────────────────────────────────────────────────────────
 *  HOW TO ADD A NEW WASTE CATEGORY (no other file needs to change):
 *    1. Add one entry to WASTE_CATEGORIES below.
 *    2. List any raw detector labels that should map to it under `aliases`.
 *  Every downstream feature (summary, impact, risk, report, chatbot, charts)
 *  reads from this file, so a single edit propagates everywhere.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `normalizeCategory()` maps the backend's raw class strings
 * (e.g. "Foam / Styrofoam", "Metal / Can", "Plastic Litter") onto these
 * canonical categories so the whole UI speaks one consistent vocabulary.
 */

export const WASTE_CATEGORIES = {
  'Plastic Bottle': {
    label: 'Plastic Bottle',
    color: '#3b82f6',
    decomposition: 'up to 450 years',
    impact:
      'Plastic bottles have a very long decomposition period (up to 450 years) and steadily fragment into microplastics that are harmful to aquatic life.',
    riskWeight: 1.0,
    aliases: ['bottle', 'plastic bottle', 'plastic bottles'],
  },
  'Plastic Bag': {
    label: 'Plastic Bag',
    color: '#ef4444',
    decomposition: '10–20 years',
    impact:
      'Plastic bags can block water flow and are easily mistaken for food by wildlife, causing fatal blockages and entanglement.',
    riskWeight: 0.9,
    aliases: ['plastic bag', 'plastic bags', 'bag', 'plastic wrapper', 'wrapper', 'film'],
  },
  'Foam Waste': {
    label: 'Foam Waste',
    color: '#10b981',
    decomposition: '500+ years',
    impact:
      'Foam and styrofoam break apart easily into tiny buoyant beads (microplastics) that spread widely and are ingested by fish and birds.',
    riskWeight: 0.85,
    aliases: ['foam', 'styrofoam', 'foam / styrofoam', 'foam waste', 'polystyrene'],
  },
  'Metal Scrap': {
    label: 'Metal Scrap',
    color: '#06b6d4',
    decomposition: '50–200 years',
    impact:
      'Metal scrap can rust and leach heavy metals into the water, and its sharp edges pose a physical hazard to aquatic animals.',
    riskWeight: 0.95,
    aliases: ['metal', 'can', 'metal / can', 'metal scrap', 'tin', 'aluminium', 'aluminum'],
  },
  'Debris': {
    label: 'Debris',
    color: '#6366f1',
    decomposition: 'varies',
    impact:
      'Miscellaneous debris contributes to ecosystem disruption, degrades water quality, and accumulates to obstruct the natural flow of the river.',
    riskWeight: 0.7,
    aliases: ['debris', 'misc', 'other'],
  },
  // Generic fallback bucket. The trained river-litter model frequently returns
  // an unspecified "litter" class; we surface it honestly here rather than
  // fabricating a specific type the detector did not actually identify.
  'Plastic Litter': {
    label: 'Plastic Litter',
    color: '#8b5cf6',
    decomposition: 'centuries',
    impact:
      'General plastic litter persists in the environment for centuries and is a major contributor to the global microplastic crisis.',
    riskWeight: 0.8,
    aliases: ['plastic litter', 'litter', 'plastic', 'trash', 'waste'],
  },
};

/** Category used when a raw label cannot be matched to anything more specific. */
export const FALLBACK_CATEGORY = 'Plastic Litter';

/** Ordered list of canonical category keys (insertion order of the config). */
export const CATEGORY_ORDER = Object.keys(WASTE_CATEGORIES);

// Flat lookup: any known label / alias (lower-cased) → canonical key.
const ALIAS_LOOKUP = (() => {
  const map = {};
  for (const [key, meta] of Object.entries(WASTE_CATEGORIES)) {
    map[key.toLowerCase()] = key;
    (meta.aliases || []).forEach((a) => {
      map[String(a).toLowerCase()] = key;
    });
  }
  return map;
})();

/** Map a raw detector label onto a canonical category key. */
export function normalizeCategory(rawLabel) {
  if (!rawLabel) return FALLBACK_CATEGORY;
  const key = String(rawLabel).trim().toLowerCase();
  if (ALIAS_LOOKUP[key]) return ALIAS_LOOKUP[key];
  // Loose contains-match so e.g. "clear plastic bottle" still resolves.
  for (const alias of Object.keys(ALIAS_LOOKUP)) {
    if (key.includes(alias)) return ALIAS_LOOKUP[alias];
  }
  return FALLBACK_CATEGORY;
}

/** Get the full metadata object for a canonical key (falls back gracefully). */
export function getCategoryMeta(canonicalKey) {
  return WASTE_CATEGORIES[canonicalKey] || WASTE_CATEGORIES[FALLBACK_CATEGORY];
}

/** Convenience: colour for a raw OR canonical label. */
export function categoryColor(label) {
  const key = WASTE_CATEGORIES[label] ? label : normalizeCategory(label);
  return getCategoryMeta(key).color;
}
