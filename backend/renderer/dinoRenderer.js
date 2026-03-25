/**
 * Dino color image renderer — uses the arkutils/species-images GitHub repo.
 *
 * Source: https://github.com/arkutils/species-images
 *  - Base silhouette: "{Species Name}_ASA.png"
 *  - Color mask:      "{Species Name}_ASA_m.png"
 *
 * The mask encodes all 6 paint regions in a single image:
 *  Region 0 → max(0, R - G - B)   (dominant red)
 *  Region 1 → max(0, G - R - B)   (dominant green)
 *  Region 2 → max(0, B - R - G)   (dominant blue)
 *  Region 3 → min(G, B)           (cyan)
 *  Region 4 → min(R, G)           (yellow)
 *  Region 5 → min(R, B)           (magenta)
 *
 * Colorization uses "grain merge" blend (same as GIMP/ARKStatsExtractor):
 *  mixed = clamp(base + color - 128, 0, 255)
 *  final = opacity * mixed + (1 - opacity) * base
 */

const fs   = require('fs');
const path = require('path');
const Jimp = require('jimp');
const _axiosModule = require('axios');
const axios = _axiosModule.default || _axiosModule;
const { getColor, hexToRgb } = require('../colorMap');

const ASB_BASE_URL = 'https://raw.githubusercontent.com/arkutils/species-images/main/images';

const CACHE_DIR  = path.join(__dirname, '..', '..', 'cache', 'asb-images');
const RENDER_DIR = path.join(__dirname, '..', '..', 'cache', 'rendered');

[CACHE_DIR, RENDER_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ---------------------------------------------------------------------------
// Species name → image filename candidates
// ---------------------------------------------------------------------------

/** Pre-built map: species name → ASB image stem (408 entries). */
let ASB_STEM_MAP = {};
try {
  ASB_STEM_MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'asbImageStemMap.json'), 'utf8'));
} catch {}
console.log(`[renderer] Loaded ${Object.keys(ASB_STEM_MAP).length} species→stem mappings`);

/**
 * Returns ordered list of image name stems to try for a given species.
 * Checks the pre-built map first, then falls back to rule-based generation.
 */
function imageNameCandidates(species) {
  const stems = [];

  // 1. Check pre-built map (exact match)
  if (ASB_STEM_MAP[species]) {
    stems.push(ASB_STEM_MAP[species]);
  }

  // 2. Rule-based fallbacks
  // Try the exact species name (both ASA and non-ASA)
  stems.push(species);

  // "Aberrant X" → also try "X" (and check map for "X")
  if (species.startsWith('Aberrant ')) {
    const base = species.slice('Aberrant '.length);
    if (ASB_STEM_MAP[base]) stems.push(ASB_STEM_MAP[base]);
    stems.push(base);
  }

  // "Young X" → also try "X"
  if (species.startsWith('Young ')) {
    const base = species.slice('Young '.length);
    if (ASB_STEM_MAP[base]) stems.push(ASB_STEM_MAP[base]);
    stems.push(base);
  }

  // "Tek X" → also try just "X"
  if (species.startsWith('Tek ')) {
    const base = species.slice('Tek '.length);
    if (ASB_STEM_MAP[base]) stems.push(ASB_STEM_MAP[base]);
    stems.push(base);
  }

  // "R-X" → try "X"
  if (species.startsWith('R-')) {
    stems.push(species.slice(2));
  }

  // "X (Variant)" → also try "X"
  const noParens = species.replace(/\s*\([^)]*\)/g, '').trim();
  if (noParens !== species) {
    if (ASB_STEM_MAP[noParens]) stems.push(ASB_STEM_MAP[noParens]);
    stems.push(noParens);
  }

  // 3. Build full candidate list: for each stem, try _ASA first then plain
  const candidates = [];
  for (const stem of [...new Set(stems)]) {
    if (stem.includes('_ASA') || stem.includes('_sf') || stem.includes('_v')) {
      candidates.push(stem); // Already a full stem (from map), use as-is
    } else {
      candidates.push(`${stem}_ASA`);
      candidates.push(stem);
    }
  }

  return [...new Set(candidates)];
}

// ---------------------------------------------------------------------------
// Image fetching with disk cache
// ---------------------------------------------------------------------------

/** Safe filename for caching (replaces problematic chars but keeps spaces). */
function safeCacheKey(name) {
  return name.replace(/[/\\:*?"<>|]/g, '_');
}

async function fetchImage(stem, suffix) {
  const filename = `${stem}${suffix}.png`;
  const cacheKey = safeCacheKey(filename);
  const cachePath = path.join(CACHE_DIR, cacheKey);

  if (fs.existsSync(cachePath)) {
    try { return fs.readFileSync(cachePath); } catch {}
  }

  const url = `${ASB_BASE_URL}/${encodeURIComponent(filename)}`;
  try {
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'image/png,image/*,*/*;q=0.8',
      },
    });
    if (resp.status === 200 && resp.data.byteLength > 200) {
      const buf = Buffer.from(resp.data);
      fs.writeFileSync(cachePath, buf);
      console.log(`[renderer] Cached: ${filename}`);
      return buf;
    }
  } catch (err) {
    // 404 or network error — not available
  }
  return null;
}

/**
 * Fetch base silhouette + color mask for a species.
 * Returns { baseBuf, maskBuf } — either may be null.
 */
async function fetchSpeciesImages(species) {
  const candidates = imageNameCandidates(species);

  for (const stem of candidates) {
    const baseBuf = await fetchImage(stem, '');
    if (!baseBuf) continue;

    const maskBuf = await fetchImage(stem, '_m');
    console.log(`[renderer] ${species} → "${stem}" (mask: ${maskBuf ? 'yes' : 'no'})`);
    return { baseBuf, maskBuf };
  }

  console.log(`[renderer] No image found for: ${species}`);
  return { baseBuf: null, maskBuf: null };
}

// ---------------------------------------------------------------------------
// Grain merge colorization — ported from ARKStatsExtractor CreatureColored.cs
// ---------------------------------------------------------------------------

/**
 * Apply region colors to the base image using grain merge blend.
 * regionColors: array[6] of {r,g,b} or null.
 * Modifies baseImg.bitmap.data in-place.
 */
function applyGrainMerge(baseImg, maskImg, regionColors) {
  const W = baseImg.bitmap.width;
  const H = baseImg.bitmap.height;

  // Resize mask to match base if needed
  if (maskImg.bitmap.width !== W || maskImg.bitmap.height !== H) {
    maskImg.resize(W, H, Jimp.RESIZE_BICUBIC);
  }

  const baseBuf = baseImg.bitmap.data;
  const maskBuf = maskImg.bitmap.data;

  for (let i = 0; i < W * H; i++) {
    const bi = i * 4; // RGBA

    // Skip transparent base pixels
    if (baseBuf[bi + 3] === 0) continue;

    const mr = maskBuf[bi];     // Red channel of mask
    const mg = maskBuf[bi + 1]; // Green channel
    const mb = maskBuf[bi + 2]; // Blue channel

    // Region opacities (0..1)
    const o = [
      Math.max(0, mr - mg - mb) / 255, // region 0: dominant red
      Math.max(0, mg - mr - mb) / 255, // region 1: dominant green
      Math.max(0, mb - mr - mg) / 255, // region 2: dominant blue
      Math.min(mg, mb)           / 255, // region 3: cyan
      Math.min(mr, mg)           / 255, // region 4: yellow
      Math.min(mr, mb)           / 255, // region 5: magenta
    ];

    let finalR = baseBuf[bi];
    let finalG = baseBuf[bi + 1];
    let finalB = baseBuf[bi + 2];

    for (let ri = 0; ri < 6; ri++) {
      if (o[ri] === 0) continue;
      const col = regionColors[ri];
      if (!col) continue;

      // Grain merge blend
      const rMix = Math.max(0, Math.min(255, finalR + col.r - 128));
      const gMix = Math.max(0, Math.min(255, finalG + col.g - 128));
      const bMix = Math.max(0, Math.min(255, finalB + col.b - 128));

      finalR = Math.round(o[ri] * rMix + (1 - o[ri]) * finalR);
      finalG = Math.round(o[ri] * gMix + (1 - o[ri]) * finalG);
      finalB = Math.round(o[ri] * bMix + (1 - o[ri]) * finalB);
    }

    baseBuf[bi]     = finalR;
    baseBuf[bi + 1] = finalG;
    baseBuf[bi + 2] = finalB;
  }
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

/**
 * Render a dino from its 6 color region IDs (and optional direct hex colors).
 * colorHex[] takes precedence when colorId is 0 or unset.
 * Returns a PNG Buffer.
 */
async function renderDino(species, colorIds, colorHex) {
  // Resolve effective hex for each region
  const effectiveHex = Array.from({ length: 6 }, (_, i) => {
    const id = colorIds?.[i] || 0;
    if (id !== 0) {
      const info = getColor(id);
      return info?.hex || null;
    }
    return colorHex?.[i] || null;
  });

  // Build render cache key
  const hexKey = effectiveHex.map(h => (h || 'none').replace('#', '')).join('-');
  const renderKey = `${safeCacheKey(species)}_${hexKey}`;
  const renderPath = path.join(RENDER_DIR, `${renderKey}.png`);

  if (fs.existsSync(renderPath)) {
    return fs.readFileSync(renderPath);
  }

  // Fetch base + mask images from GitHub
  const { baseBuf, maskBuf } = await fetchSpeciesImages(species);

  if (!baseBuf) {
    // No silhouette available — return color swatch placeholder
    return generatePlaceholder(species, effectiveHex);
  }

  try {
    const baseImg = await Jimp.read(baseBuf);

    // Convert effectiveHex to {r,g,b} objects (null if no color set)
    const regionColors = effectiveHex.map(hex => hex ? hexToRgb(hex) : null);

    if (maskBuf) {
      const maskImg = await Jimp.read(maskBuf);
      applyGrainMerge(baseImg, maskImg, regionColors);
    }
    // If no mask, render the base silhouette uncolored

    const rendered = await baseImg.getBufferAsync(Jimp.MIME_PNG);
    fs.writeFileSync(renderPath, rendered);
    return rendered;

  } catch (err) {
    console.error(`[renderer] Error rendering ${species}:`, err.message);
    return generatePlaceholder(species, effectiveHex);
  }
}

// ---------------------------------------------------------------------------
// Placeholder (color swatches) when no silhouette is available
// ---------------------------------------------------------------------------

async function generatePlaceholder(species, effectiveHex) {
  const W = 512, H = 256;
  const img = new Jimp(W, H, 0x0d0f1aff);

  const cols = 6, pad = 10, gap = 6;
  const swatchW = Math.floor((W - pad * 2 - gap * (cols - 1)) / cols);
  const swatchH = H - pad * 2;

  for (let i = 0; i < cols; i++) {
    const x0 = pad + i * (swatchW + gap);
    const hex = Array.isArray(effectiveHex) ? effectiveHex[i] : null;
    const { r, g, b } = hexToRgb(hex || '#000000');
    const hasColor = !!hex;

    const fillColor   = hasColor ? Jimp.rgbaToInt(r, g, b, 255) : Jimp.rgbaToInt(20, 22, 40, 255);
    const borderColor = hasColor ? Jimp.rgbaToInt(255, 255, 255, 120) : Jimp.rgbaToInt(60, 65, 90, 255);

    for (let px = x0; px < x0 + swatchW; px++) {
      for (let py = pad; py < pad + swatchH; py++) {
        img.setPixelColor(fillColor, px, py);
      }
    }

    for (let px = x0; px < x0 + swatchW; px++) {
      img.setPixelColor(borderColor, px, pad);
      img.setPixelColor(borderColor, px, pad + 1);
      img.setPixelColor(borderColor, px, pad + swatchH - 1);
      img.setPixelColor(borderColor, px, pad + swatchH - 2);
    }
    for (let py = pad; py < pad + swatchH; py++) {
      img.setPixelColor(borderColor, x0, py);
      img.setPixelColor(borderColor, x0 + 1, py);
      img.setPixelColor(borderColor, x0 + swatchW - 1, py);
      img.setPixelColor(borderColor, x0 + swatchW - 2, py);
    }

    if (!hasColor) {
      const xColor = Jimp.rgbaToInt(45, 50, 75, 255);
      for (let t = 4; t < swatchH - 4; t++) {
        const px1 = x0 + 4 + Math.round(t * (swatchW - 8) / (swatchH - 8));
        const px2 = x0 + swatchW - 5 - Math.round(t * (swatchW - 8) / (swatchH - 8));
        const py  = pad + t;
        if (px1 >= x0 && px1 < x0 + swatchW) img.setPixelColor(xColor, px1, py);
        if (px2 >= x0 && px2 < x0 + swatchW) img.setPixelColor(xColor, px2, py);
      }
    }

    if (hasColor) {
      const lR = Math.min(255, r + 80), lG = Math.min(255, g + 80), lB = Math.min(255, b + 80);
      const lightColor = Jimp.rgbaToInt(lR, lG, lB, 255);
      for (let px = x0 + 2; px < x0 + swatchW - 2; px++) {
        for (let py = pad + 2; py < pad + 20; py++) {
          img.setPixelColor(lightColor, px, py);
        }
      }
    }
  }

  return img.getBufferAsync(Jimp.MIME_PNG);
}

// ---------------------------------------------------------------------------
// Cache pre-warming
// ---------------------------------------------------------------------------

async function prewarmCache(speciesList) {
  for (const species of speciesList) {
    await fetchSpeciesImages(species).catch(() => {});
  }
}

module.exports = { renderDino, fetchSpeciesImages, generatePlaceholder, prewarmCache };
