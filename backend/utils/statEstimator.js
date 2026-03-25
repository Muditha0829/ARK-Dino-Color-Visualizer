/**
 * Estimates wild + tamed stat level points from a dino's final stat values.
 *
 * ARK stat formula (tamed dino):
 *   V = B × (1 + Lw × Iw) × (1 + Ta) × TBHM × (1 + IBM × IQ) × (1 + Tm × TE) × (1 + Im × Lt)
 *
 * Where:
 *   B    = base stat value (from values.json)
 *   Iw   = per-wild-level multiplier
 *   Im   = per-tamed-level multiplier
 *   Ta   = taming additive bonus (fraction, e.g. 0.35 = +35%)
 *   Tm   = taming multiplicative bonus
 *   TBHM = tamed base health multiplier (species-specific, default 1)
 *   IBM  = imprint bonus multiplier (0.2 standard)
 *   IQ   = imprint quality (0–1)
 *   TE   = taming effectiveness (0–1, default 1 since not in INI)
 *   Lw   = wild levels in this stat
 *   Lt   = tamed levels in this stat
 *
 * We know V, B, Iw, Im, Ta, Tm, TBHM, IQ from the data.
 * We iterate Lw from 0 upward, solve for Lt, and accept the best match.
 */

const fs   = require('fs');
const path = require('path');

let SPECIES_STATS = {};
try {
  const p = path.join(__dirname, '..', 'speciesBaseStats.json');
  if (fs.existsSync(p)) SPECIES_STATS = JSON.parse(fs.readFileSync(p, 'utf8'));
} catch {}

const IBM = 0.2; // standard imprint bonus multiplier in ARK
const TE_DEFAULT = 1.0;

// Map our stat keys to the order used in values.json
const STAT_KEYS = ['health', 'stamina', 'oxygen', 'food', 'weight', 'melee', 'speed', 'fortitude', 'crafting'];

/**
 * Estimate wild & tamed level points for one stat.
 * Returns { wild, tamed, estimated } or null if not computable.
 */
function estimateOneStat(V, statDef, IQ, TE) {
  if (!statDef || !statDef.B || !statDef.Iw) return null;
  if (V === 0 || V === null || V === undefined) return null;

  const { B, Iw, Im, Ta, Tm, TBHM = 1 } = statDef;

  // Combined multipliers that don't involve level points
  const taMultiplier = (1 + Ta) * TBHM;
  const iqMultiplier = (1 + IBM * IQ);
  const tmMultiplier = (1 + Tm * TE);
  const baseCoeff = B * taMultiplier * iqMultiplier * tmMultiplier;

  if (!baseCoeff || baseCoeff <= 0) return null;

  let bestLw = 0, bestLt = 0, bestDiff = Infinity;

  // Search Lw from 0 upward; wild levels are unlikely to exceed 300
  for (let Lw = 0; Lw <= 400; Lw++) {
    const wildStatPart = baseCoeff * (1 + Lw * Iw);

    if (wildStatPart > V * 3) break; // far over V, no tamed levels can fix this

    if (Im > 0) {
      // Solve for Lt: V = wildStatPart * (1 + Im * Lt)
      const LtFloat = (V / wildStatPart - 1) / Im;
      if (LtFloat < -0.1) continue; // negative tamed levels = this Lw is too high

      const Lt = Math.max(0, Math.round(LtFloat));
      const computed = wildStatPart * (1 + Im * Lt);
      const diff = Math.abs(computed - V) / V; // relative error

      if (diff < bestDiff) {
        bestDiff = diff;
        bestLw = Lw;
        bestLt = Lt;
      }
      if (diff < 0.001) break; // good enough
    } else {
      // No per-tamed-level multiplier (e.g. speed, oxygen sometimes)
      const diff = Math.abs(wildStatPart - V) / V;
      if (diff < bestDiff) {
        bestDiff = diff;
        bestLw = Lw;
        bestLt = 0;
      }
    }
  }

  if (bestDiff > 0.05) return null; // too inaccurate to show

  return {
    wild:  bestLw,
    tamed: bestLt,
    total: bestLw + bestLt,
  };
}

/**
 * Estimate all stat level points for a dino.
 *
 * @param {string} species   - Species name (must match speciesBaseStats.json key)
 * @param {object} stats     - Final stat values { health, stamina, … }
 * @param {number} imprint   - Imprint quality 0–1
 * @returns {object|null}    - { health: {wild,tamed,total}, stamina: … } or null
 */
function estimateStatPoints(species, stats, imprint = 0) {
  const speciesDef = SPECIES_STATS[species];
  if (!speciesDef) return null;

  const IQ = imprint ?? 0;
  const TE = TE_DEFAULT;

  const result = {};
  let anySuccess = false;

  for (const key of STAT_KEYS) {
    const V = stats?.[key];
    if (V === undefined || V === null) { result[key] = null; continue; }
    const statDef = speciesDef[key];
    const est = estimateOneStat(V, statDef, IQ, TE);
    result[key] = est;
    if (est) anySuccess = true;
  }

  return anySuccess ? result : null;
}

module.exports = { estimateStatPoints, SPECIES_STATS };
