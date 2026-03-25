/**
 * Parser for ARK Survival Ascended dino export .ini files.
 *
 * Real ASA export format (from "Export Dino" button in dino inventory):
 *
 *   ;METADATA=(Diff=true, UseCommands=true)
 *   [Dino Data]
 *   DinoID1=121554308
 *   DinoID2=414725177
 *   DinoClass=/Game/PrimalEarth/Dinos/Carcharodontosaurus/Carcha_Character_BP.Carcha_Character_BP_C
 *   DinoNameTag=Carcha
 *   bIsFemale=True
 *   TamedName=Maya Jama
 *   CharacterLevel=348
 *   DinoImprintingQuality=1
 *   RandomMutationsMale=0
 *   RandomMutationsFemale=0
 *
 *   [Colorization]
 *   ColorSet[0]=(R=0.005000,G=0.005000,B=0.005000,A=0.000000)
 *   ColorSet[1]=(R=0.000000,G=0.000000,B=0.000000,A=1.000000)
 *
 *   [Max Character Status Values]
 *   Health=34838.4062
 *   Stamina=716.160034
 *   Melee Damage=6.06000042
 *   Weight=2059.2002
 *   ...
 */

const path = require('path');
const fs = require('fs');

// Blueprint class → species name lookup built from ARKStatsExtractor data
let BLUEPRINT_SPECIES = {};
try {
  const bpFile = path.join(__dirname, '..', 'blueprintSpeciesMap.json');
  if (fs.existsSync(bpFile)) BLUEPRINT_SPECIES = JSON.parse(fs.readFileSync(bpFile, 'utf8'));
} catch {}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert a linear-space float RGB (0-1) to a sRGB hex color string.
 * ARK stores colors in linear space internally.
 */
function floatRgbToHex(r, g, b) {
  function toSrgb(c) {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308
      ? Math.round(c * 12.92 * 255)
      : Math.round((1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  }
  return '#' + [toSrgb(r), toSrgb(g), toSrgb(b)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse ColorSet value string: "(R=0.005000,G=0.005000,B=0.005000,A=0.000000)"
 * Returns { r, g, b, a } floats, or null if unparseable.
 */
function parseColorSet(val) {
  const m = val.match(/R=([\d.eE+-]+).*?G=([\d.eE+-]+).*?B=([\d.eE+-]+).*?A=([\d.eE+-]+)/i);
  if (!m) return null;
  return { r: parseFloat(m[1]), g: parseFloat(m[2]), b: parseFloat(m[3]), a: parseFloat(m[4]) };
}

/**
 * Extract a display species name from a blueprint class path.
 * Uses the ARKStatsExtractor blueprint→species map for accurate names.
 */
function speciesFromClass(classPath, nameTag) {
  if (!classPath) return nameTag || 'Unknown';

  // Try blueprint map first (most accurate)
  // classPath ends in e.g. .Carcha_Character_BP_C
  const tail = classPath.split('.').pop();
  if (tail && BLUEPRINT_SPECIES[tail]) return BLUEPRINT_SPECIES[tail];

  // Also try without _C suffix
  const tailNoC = tail.replace(/_C$/, '');
  if (tailNoC && BLUEPRINT_SPECIES[tailNoC]) return BLUEPRINT_SPECIES[tailNoC];

  // Fallback: folder name after /Dinos/
  const parts = classPath.split('/');
  const dinosIdx = parts.findIndex(p => p.toLowerCase() === 'dinos');
  if (dinosIdx !== -1 && parts[dinosIdx + 1]) {
    const folder = parts[dinosIdx + 1];
    if (folder && folder !== 'DinoCharacterStatusComponent_BP') {
      return folder.replace(/_/g, ' ');
    }
  }

  // Last resort: extract from _Character_BP pattern
  const match = classPath.match(/\/([^/]+)_Character_BP/i);
  if (match) return match[1].replace(/_/g, ' ');

  return nameTag || 'Unknown';
}

// ── Main parser ────────────────────────────────────────────────────────────────

/**
 * Parse a raw .ini text string into section→key→value maps.
 * Returns: { sections: { [sectionName]: { [key]: string | string[] } } }
 */
function parseIniSections(text) {
  const sections = { '': {} };
  let current = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      current = line.slice(1, -1).trim();
      if (!sections[current]) sections[current] = {};
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const rawKey = line.slice(0, eqIdx).trim();
    const value  = line.slice(eqIdx + 1).trim();

    // Array key: e.g. ColorSet[0]
    const arrMatch = rawKey.match(/^(.+?)\[(\d+)\]$/);
    if (arrMatch) {
      const [, key, idxStr] = arrMatch;
      if (!sections[current][key]) sections[current][key] = [];
      sections[current][key][Number(idxStr)] = value;
    } else {
      sections[current][rawKey] = value;
    }
  }

  return sections;
}

/**
 * Parse a single ARK dino export .ini file into a normalized dino object.
 */
function parseDinoIni(text, filename = 'unknown.ini') {
  const sections = parseIniSections(text);

  // Section aliases — try common names
  const dinoSec  = sections['Dino Data'] || sections['DinoData'] || sections[''] || {};
  const colorSec = sections['Colorization'] || sections['Colors'] || {};
  const statSec  = sections['Max Character Status Values']
                || sections['MaxCharacterStatusValues']
                || sections['Stats'] || {};

  const get = (sec, ...keys) => {
    for (const k of keys) {
      if (sec[k] !== undefined && sec[k] !== '') return sec[k];
    }
    return null;
  };

  // ── Colors ─────────────────────────────────────────────────────────────────
  // ColorSet[n] = (R=float, G=float, B=float, A=float) — ALL in linear RGB 0-1.
  // A=0 does NOT mean unset — vivid colors (e.g. pure green R=0,G=1,B=0) can have A=0.
  // Only treat as null if the ColorSet data is entirely missing for that index.
  const colorHex = [];
  const colorSetArr = colorSec['ColorSet'] || [];
  for (let i = 0; i < 6; i++) {
    const raw = colorSetArr[i];
    if (raw) {
      const c = parseColorSet(raw);
      colorHex.push(c ? floatRgbToHex(c.r, c.g, c.b) : null);
    } else {
      colorHex.push(null);
    }
  }

  // Keep a colors[] array of 0s for compatibility with existing color-ID system
  const colors = [0, 0, 0, 0, 0, 0];

  // ── Stats ──────────────────────────────────────────────────────────────────
  // [Max Character Status Values] uses human-readable names
  const hp      = parseFloat(get(statSec, 'Health')         ?? 0);
  const stamina = parseFloat(get(statSec, 'Stamina')        ?? 0);
  const oxygen  = parseFloat(get(statSec, 'Oxygen')         ?? 0);
  const food    = parseFloat(get(statSec, 'Food')           ?? 0);
  const weight  = parseFloat(get(statSec, 'Weight')         ?? 0);
  // "Melee Damage" is stored as a multiplier (e.g. 6.06 = 606%)
  const melee   = parseFloat(get(statSec, 'Melee Damage', 'MeleeDamage') ?? 1);
  const speed   = parseFloat(get(statSec, 'Movement Speed', 'MovementSpeed') ?? 1);
  const fortitude = parseFloat(get(statSec, 'Fortitude') ?? 0);
  const crafting  = parseFloat(get(statSec, 'Crafting Skill', 'CraftingSkill') ?? 0);

  const stats = { health: hp, stamina, oxygen, food, weight, melee, speed, fortitude, crafting };

  // ── Class & species ────────────────────────────────────────────────────────
  const dinoClass = get(dinoSec, 'DinoClass', 'Class') ?? '';
  const nameTag   = get(dinoSec, 'DinoNameTag') ?? '';
  const species   = speciesFromClass(dinoClass, nameTag) || path.basename(filename, '.ini');

  // ── Identity ───────────────────────────────────────────────────────────────
  const customName = get(dinoSec, 'TamedName', 'CustomName') ?? '';
  const isFemale   = (get(dinoSec, 'bIsFemale') ?? 'false').toLowerCase() === 'true';
  const level      = parseInt(get(dinoSec, 'CharacterLevel', 'BaseCharacterLevel', 'Level') ?? 1, 10);
  const isNeutered = (get(dinoSec, 'bNeutered') ?? 'false').toLowerCase() === 'true';

  // ── Breeding ───────────────────────────────────────────────────────────────
  const imprint         = parseFloat(get(dinoSec, 'DinoImprintingQuality') ?? 0);
  const mutationsMale   = parseInt(get(dinoSec, 'RandomMutationsMale', 'MutationCountMale') ?? 0, 10);
  const mutationsFemale = parseInt(get(dinoSec, 'RandomMutationsFemale', 'MutationCountFemale') ?? 0, 10);
  const babyAge         = parseFloat(get(dinoSec, 'BabyAge') ?? 1);

  // ── Tribe / owner ──────────────────────────────────────────────────────────
  const tribeName = get(dinoSec, 'TribeName') ?? '';
  const ownerName = get(dinoSec, 'TamerString', 'OwnerName') ?? '';
  const imprinterName = get(dinoSec, 'ImprinterName') ?? '';

  // ── Unique ID ──────────────────────────────────────────────────────────────
  const id1 = get(dinoSec, 'DinoID1', 'DinoId1');
  const id2 = get(dinoSec, 'DinoID2', 'DinoId2');
  const id  = id1 && id2
    ? `${id1}_${id2}`
    : `import_${Buffer.from(`${dinoClass}${customName}${level}`).toString('base64').slice(0, 12)}`;

  return {
    id,
    dinoName: customName,
    species,
    dinoClass,
    nameTag,
    isFemale,
    isNeutered,
    level,
    colors,     // color IDs (all 0 for ini imports — use colorHex instead)
    colorHex,   // actual hex colors parsed from RGB floats
    imprint,
    mutationsMale,
    mutationsFemale,
    babyAge,
    tamingEffectiveness: 1, // not in export file
    isCryopodded: false,
    tribeName,
    ownerName,
    imprinterName,
    map: 'Imported',
    stats,
    _source: 'ini_import',
  };
}

/**
 * Parse multiple .ini files at once.
 * @param {Array<{name: string, content: string}>} files
 * @returns {object[]}
 */
function parseDinoIniFiles(files) {
  const dinos = [];
  for (const { name, content } of files) {
    try {
      const dino = parseDinoIni(content, name);
      dinos.push(dino);
    } catch (err) {
      console.warn(`[iniParser] Failed to parse ${name}: ${err.message}`);
    }
  }
  return dinos;
}

module.exports = { parseDinoIni, parseDinoIniFiles, parseIniSections };
