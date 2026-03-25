const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDinos, getDinoById, deleteDino, getDistinctMaps, getDistinctSpecies, getBestByStatPerMap, upsertDinos, clearDinos } = require('../db');
const { parseAllArkFiles } = require('../parser/arkParser');
const { parseDinoIniFiles } = require('../parser/iniParser');
const { estimateStatPoints } = require('../utils/statEstimator');
const ARK_DINOEXPORTS_DIR = 'D:\\SteamLibrary\\steamapps\\common\\ARK Survival Ascended\\ShooterGame\\Saved\\DinoExports';

// Load species region names from extracted ASB data
let SPECIES_REGION_NAMES = {};
try {
  const rp = path.join(__dirname, '..', 'speciesRegionNames.json');
  if (fs.existsSync(rp)) SPECIES_REGION_NAMES = JSON.parse(fs.readFileSync(rp, 'utf8'));
} catch {}

function getRegionNames(species) {
  if (!species) return null;
  return SPECIES_REGION_NAMES[species]
    || SPECIES_REGION_NAMES[species.replace(/\s+/g, '_')]
    || null;
}

const SAVE_DIR = 'D:\\SteamLibrary\\steamapps\\common\\ARK Survival Ascended\\ShooterGame\\Saved\\SaveGames';

// GET /api/dinos — list all dinos with filters
router.get('/', (req, res) => {
  try {
    const filters = {
      map:          req.query.map || '',
      species:      req.query.species || '',
      search:       req.query.search || '',
      sortBy:       req.query.sortBy || 'level',
      sortDir:      req.query.sortDir || 'desc',
      isFemale:     req.query.gender === 'female' ? true : req.query.gender === 'male' ? false : undefined,
      isCryopodded: req.query.cryopodded === 'true' ? true : req.query.cryopodded === 'false' ? false : undefined,
      minMutations: req.query.minMutations ? Number(req.query.minMutations) : undefined,
      maxMutations: req.query.maxMutations ? Number(req.query.maxMutations) : undefined,
      minImprint:   req.query.minImprint   ? Number(req.query.minImprint)   : undefined,
    };

    // Remove undefined keys
    Object.keys(filters).forEach(k => filters[k] === undefined && delete filters[k]);

    const dinos = getDinos(filters);
    res.json({ dinos, total: dinos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dinos/meta — maps, species lists + region names for filter dropdowns
router.get('/meta', (req, res) => {
  try {
    res.json({
      maps: getDistinctMaps(),
      species: getDistinctSpecies(),
      regionNames: SPECIES_REGION_NAMES,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dinos/insights — cross-map best stats
router.get('/insights', (req, res) => {
  try {
    const best = getBestByStatPerMap();
    const allDinos = getDinos();

    // Breed pair suggestions: find high-melee male + high-HP female on different maps
    const suggestions = [];
    const malesByMelee = allDinos
      .filter(d => !d.isFemale && d.stats.melee > 3)
      .sort((a, b) => b.stats.melee - a.stats.melee)
      .slice(0, 5);

    const femalesByHP = allDinos
      .filter(d => d.isFemale && d.stats.health > 5000)
      .sort((a, b) => b.stats.health - a.stats.health)
      .slice(0, 5);

    for (const male of malesByMelee) {
      for (const female of femalesByHP) {
        if (male.species === female.species && male.map !== female.map) {
          suggestions.push({
            type: 'cross_map_breed',
            male: { id: male.id, name: male.dinoName, species: male.species, map: male.map, melee: male.stats.melee },
            female: { id: female.id, name: female.dinoName, species: female.species, map: female.map, health: female.stats.health },
            reason: `High melee male (${male.stats.melee.toFixed(1)}x) on ${male.map} + high HP female (${Math.round(female.stats.health).toLocaleString()} HP) on ${female.map}`,
          });
        }
      }
    }

    res.json({ best, suggestions: suggestions.slice(0, 6) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dinos/scan-exports — list all DinoExport .ini files in the ARK exports folder
router.get('/scan-exports', (req, res) => {
  try {
    if (!fs.existsSync(ARK_DINOEXPORTS_DIR)) {
      return res.json({ files: [], dir: ARK_DINOEXPORTS_DIR, exists: false });
    }
    const files = fs.readdirSync(ARK_DINOEXPORTS_DIR)
      .filter(f => f.endsWith('.ini'))
      .map(f => {
        const full = path.join(ARK_DINOEXPORTS_DIR, f);
        const stat = fs.statSync(full);
        return { name: f, path: full, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime); // newest first
    res.json({ files, dir: ARK_DINOEXPORTS_DIR, exists: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dinos/import-from-disk — import specific files by path from DinoExports
router.post('/import-from-disk', (req, res) => {
  try {
    const { paths } = req.body; // array of full file paths
    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'No file paths provided' });
    }
    const files = [];
    for (const p of paths) {
      // Security: only allow files from the ARK exports dir
      if (!p.startsWith(ARK_DINOEXPORTS_DIR)) continue;
      if (!fs.existsSync(p)) continue;
      files.push({ name: path.basename(p), content: fs.readFileSync(p, 'utf8') });
    }
    if (files.length === 0) return res.status(400).json({ error: 'No valid files found' });
    const dinos = parseDinoIniFiles(files);
    if (dinos.length === 0) return res.status(400).json({ error: 'No dinos could be parsed' });
    upsertDinos(dinos);
    res.json({ message: `Imported ${dinos.length} dino(s)`, count: dinos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dinos/:id — single dino detail (enriched with stat estimates)
router.get('/:id', (req, res) => {
  try {
    const dino = getDinoById(req.params.id);
    if (!dino) return res.status(404).json({ error: 'Dino not found' });
    const statLevels = estimateStatPoints(dino.species, dino.stats, dino.imprint);
    res.json({ ...dino, statLevels, regionNames: getRegionNames(dino.species) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dinos/:id — remove a dino from the database
router.delete('/:id', (req, res) => {
  try {
    const dino = getDinoById(req.params.id);
    if (!dino) return res.status(404).json({ error: 'Dino not found' });
    deleteDino(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dinos/import — import dinos from .ini file contents
router.post('/import', (req, res) => {
  try {
    const files = req.body.files; // [{ name, content }]
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    const dinos = parseDinoIniFiles(files);
    if (dinos.length === 0) {
      return res.status(400).json({ error: 'No dinos could be parsed from provided files' });
    }
    upsertDinos(dinos);
    res.json({ message: `Imported ${dinos.length} dino(s) from .ini files`, count: dinos.length, source: 'ini_import' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dinos/load-demo — load demo data
router.post('/load-demo', (req, res) => {
  try {
    clearDinos();
    upsertDinos(DEMO_DINOS);
    res.json({ message: `Loaded ${DEMO_DINOS.length} demo dinos`, count: DEMO_DINOS.length, source: 'demo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
