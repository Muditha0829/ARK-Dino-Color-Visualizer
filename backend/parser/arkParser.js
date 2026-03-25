/**
 * Native JavaScript parser for ARK Survival Ascended .ark save files.
 *
 * ARK save files use a custom binary format based on Unreal Engine serialization.
 * This parser targets the fields needed for the Dino Color Visualizer.
 *
 * Format overview:
 *   [Header] → [Name Table] → [Object Headers] → [Object Properties]
 *
 * If parsing fails or yields no dinos, fallback to demo data is handled by the caller.
 */

const fs = require('fs');
const path = require('path');
const BinaryReader = require('./binaryReader');

// Map filename → map display name
const MAP_NAMES = {
  'TheIsland_WP':    'The Island',
  'ScorchedEarth_WP':'Scorched Earth',
  'Aberration_WP':   'Aberration',
  'Extinction_WP':   'Extinction',
  'TheCenter_WP':    'The Center',
  'Fjordur_WP':      'Fjordur',
  'Ragnarok_WP':     'Ragnarok',
  'CrystalIsles_WP': 'Crystal Isles',
  'LostColony_WP':   'Lost Colony',
  // Common singles without _WP suffix
  'TheIsland':       'The Island',
  'ScorchedEarth':   'Scorched Earth',
  'Aberration':      'Aberration',
  'Extinction':      'Extinction',
  'TheCenter':       'The Center',
  'Fjordur':         'Fjordur',
  'Ragnarok':        'Ragnarok',
  'CrystalIsles':    'Crystal Isles',
};

/**
 * Detect map name from .ark filename.
 * @param {string} filePath
 * @returns {string}
 */
function detectMapName(filePath) {
  const base = path.basename(filePath, '.ark').replace(/\.ark$/, '');
  return MAP_NAMES[base] || base;
}

/**
 * Extract species short name from a blueprint class path.
 * e.g. "Blueprint'/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP_C'"
 *      → "Rex"
 * @param {string} classPath
 * @returns {string}
 */
function classToSpecies(classPath) {
  if (!classPath) return 'Unknown';
  // Try to find meaningful part
  const match = classPath.match(/\/([^/]+)_Character_BP/i);
  if (match) {
    return match[1].replace(/_/g, ' ');
  }
  // Fallback: last segment before _BP
  const seg = classPath.split('/').pop();
  return seg ? seg.replace(/_BP.*/, '').replace(/_/g, ' ') : 'Unknown';
}

/**
 * Parse the name table from an ARK file buffer.
 * @param {BinaryReader} r
 * @param {number} nameTableOffset
 * @returns {string[]}
 */
function parseNameTable(r, nameTableOffset) {
  r.seek(nameTableOffset);
  const count = r.readInt32();
  const names = [];
  for (let i = 0; i < count && r.remaining > 4; i++) {
    try {
      names.push(r.readFString());
    } catch {
      break;
    }
  }
  return names;
}

/**
 * Try to read a UE property value based on its type name.
 * Returns the parsed value or null on failure.
 */
function readPropertyValue(r, typeName, size, nameTable) {
  const start = r.offset;
  try {
    switch (typeName) {
      case 'IntProperty':
        return r.readInt32();
      case 'UInt32Property':
        return r.readUInt32();
      case 'Int8Property':
        return r.readInt8();
      case 'ByteProperty': {
        // Peek: if next 8 bytes look like an FName (two int32s), it's an enum byte property
        const enumName = r.readFString(); // enum type name
        if (enumName && enumName !== 'None') {
          return r.readFString(); // enum value name
        }
        return r.readUInt8();
      }
      case 'FloatProperty':
        return r.readFloat();
      case 'DoubleProperty':
        return r.readDouble();
      case 'BoolProperty':
        return r.readBool8();
      case 'StrProperty':
        return r.readFString();
      case 'NameProperty':
        return r.readFName(nameTable);
      case 'ObjectProperty':
        return r.readInt32(); // object index
      case 'SoftObjectProperty':
        return { asset: r.readFString(), subPath: r.readFString() };
      case 'ArrayProperty': {
        const innerType = r.readFName(nameTable);
        const count = r.readInt32();
        const arr = [];
        for (let i = 0; i < count; i++) {
          if (innerType === 'ByteProperty') arr.push(r.readUInt8());
          else if (innerType === 'IntProperty') arr.push(r.readInt32());
          else if (innerType === 'FloatProperty') arr.push(r.readFloat());
          else if (innerType === 'ObjectProperty') arr.push(r.readInt32());
          else if (innerType === 'StrProperty') arr.push(r.readFString());
          else {
            // Unknown array inner type; skip rest
            r.seek(start + size);
            return arr;
          }
        }
        return arr;
      }
      case 'StructProperty': {
        const structType = r.readFName(nameTable);
        r.skip(17); // guid + padding typical for structs
        if (structType === 'LinearColor') {
          return { r: r.readFloat(), g: r.readFloat(), b: r.readFloat(), a: r.readFloat() };
        }
        // Unknown struct — skip by size
        r.seek(start + size);
        return null;
      }
      default:
        r.seek(start + size);
        return null;
    }
  } catch {
    r.seek(start + size);
    return null;
  }
}

/**
 * Read all UE properties until "None" terminator.
 * Returns a flat { propertyName: value } object.
 */
function readProperties(r, nameTable, maxBytes = 65536) {
  const props = {};
  const endBound = r.offset + maxBytes;

  while (r.remaining > 8 && r.offset < endBound) {
    let propName;
    try {
      propName = r.readFName(nameTable);
    } catch {
      break;
    }
    if (!propName || propName === 'None') break;

    let propType;
    try {
      propType = r.readFName(nameTable);
    } catch {
      break;
    }

    const size = r.readInt32();
    const arrayIndex = r.readInt32();

    if (size < 0 || size > 1024 * 1024) break; // sanity check

    const value = readPropertyValue(r, propType, size, nameTable);
    if (value !== null && value !== undefined) {
      if (arrayIndex > 0) {
        if (!Array.isArray(props[propName])) props[propName] = [];
        props[propName][arrayIndex] = value;
      } else {
        props[propName] = value;
      }
    }
  }

  return props;
}

/**
 * Main entry: parse an .ark file and extract all tamed dinos.
 * @param {string} filePath - path to .ark file
 * @returns {object[]} array of dino objects
 */
function parseArkFile(filePath) {
  const mapName = detectMapName(filePath);
  const buffer = fs.readFileSync(filePath);
  const r = new BinaryReader(buffer);

  // ── Header ──────────────────────────────────────────────────────────────
  const saveVersion = r.readInt16();
  if (saveVersion < 1 || saveVersion > 20) {
    throw new Error(`Unexpected save version: ${saveVersion}`);
  }

  let nameTableOffset = 0;
  let propertiesBlockOffset = 0;

  if (saveVersion >= 5) {
    nameTableOffset = r.readInt32();
    propertiesBlockOffset = r.readInt32();
  }

  const gameTime = r.readFloat();

  // ── Name Table ──────────────────────────────────────────────────────────
  let nameTable = [];
  if (nameTableOffset > 0 && nameTableOffset < buffer.length) {
    try {
      nameTable = parseNameTable(r, nameTableOffset);
    } catch {
      // continue without name table
    }
  }

  // ── Scan for dino properties ─────────────────────────────────────────────
  // Rather than fully parsing the object structure, we use a heuristic scan:
  // search the buffer for "TamedName" or "ColorSetIndices" FString markers
  // and then back-parse the surrounding object.
  //
  // This approach is more robust against format variations between ASE/ASA.

  const dinos = [];
  const seen = new Set();

  // We'll do a full scan looking for dino character objects
  // Key indicator: blueprint paths containing "Dinos" and "Character_BP"
  const bufStr = buffer.toString('latin1');

  // Find all occurrences of "_Character_BP" to locate dino objects
  const markers = ['_Character_BP', 'DinoCharacter'];
  for (const marker of markers) {
    let searchStart = 0;
    while (searchStart < bufStr.length) {
      const idx = bufStr.indexOf(marker, searchStart);
      if (idx === -1) break;
      searchStart = idx + 1;

      // Try to extract dino properties from this region
      // Go back up to 512 bytes to find the start of this object's properties
      const scanStart = Math.max(0, idx - 512);
      r.seek(scanStart);

      try {
        const props = readProperties(r, nameTable, 4096);
        if (!props || Object.keys(props).length < 3) continue;

        // Must have color data to be interesting
        const colors = props['ColorSetIndices'] || props['BabyColorSetIndices'];
        if (!colors) continue;

        const key = `${props['DinoID1']}_${props['DinoID2']}`;
        if (seen.has(key) && props['DinoID1']) continue;
        if (props['DinoID1']) seen.add(key);

        const dino = buildDino(props, mapName, idx);
        if (dino) dinos.push(dino);
      } catch {
        // ignore parse errors for individual objects
      }
    }
    if (dinos.length > 0) break;
  }

  return dinos;
}

/**
 * Build a normalized dino object from raw properties.
 */
function buildDino(props, mapName, id) {
  const rawColors = props['ColorSetIndices'] || [];
  // Normalize to 6 elements
  const colors = Array.from({ length: 6 }, (_, i) => {
    const v = Array.isArray(rawColors) ? rawColors[i] : 0;
    return typeof v === 'number' ? v : 0;
  });

  const statusComp = props['MyCharacterStatusComponent'] || {};

  return {
    id: String(props['DinoID1'] || id),
    dinoName: props['TamedName'] || props['DinoName'] || '',
    dinoClass: props['DinoClass'] || props['CreatureClass'] || '',
    species: classToSpecies(props['DinoClass'] || props['CreatureClass'] || ''),
    isFemale: Boolean(props['bIsFemale']),
    level: Number(props['CharacterLevel'] || props['CurrentLevel'] || 1),
    colors, // [r0, r1, r2, r3, r4, r5] — ARK Color IDs
    imprint: Number(props['DinoImprintingQuality'] || 0),
    mutationsMale: Number(props['RandomMutationsFemale'] || props['MutationCountMale'] || 0),
    mutationsFemale: Number(props['RandomMutationsMale'] || props['MutationCountFemale'] || 0),
    tamingEffectiveness: Number(props['TamingEffectiveness'] || 0),
    isCryopodded: Boolean(props['bCryo'] || props['bCryopodded']),
    tribeName: props['TribeName'] || '',
    ownerName: props['OwnerName'] || '',
    tamedAtTime: props['TamedAtTime'] || null,
    map: mapName,
    stats: {
      health:     Number(props['MaxHealth'] || 0),
      stamina:    Number(props['MaxStamina'] || 0),
      oxygen:     Number(props['MaxOxygen'] || 0),
      food:       Number(props['MaxFood'] || 0),
      weight:     Number(props['MaxWeight'] || 0),
      melee:      Number(props['MeleeDamageMultiplier'] || 1),
      speed:      Number(props['RunningSpeedModifier'] || 1),
      crafting:   Number(props['CraftingSpeedMultiplier'] || 0),
      fortitude:  Number(props['Torpidity'] || 0),
    },
  };
}

/**
 * Parse all .ark files in a directory and merge results.
 * @param {string} saveDir
 * @returns {object[]}
 */
function parseAllArkFiles(saveDir) {
  const allDinos = [];

  let files;
  try {
    files = fs.readdirSync(saveDir).filter(f => f.endsWith('.ark'));
  } catch {
    return allDinos;
  }

  for (const file of files) {
    const filePath = path.join(saveDir, file);
    try {
      const dinos = parseArkFile(filePath);
      allDinos.push(...dinos);
      console.log(`[parser] ${file}: found ${dinos.length} dinos`);
    } catch (err) {
      console.warn(`[parser] Failed to parse ${file}: ${err.message}`);
    }
  }

  return allDinos;
}

module.exports = { parseArkFile, parseAllArkFiles, detectMapName };
