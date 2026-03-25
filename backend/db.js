/**
 * Simple JSON file-based data store.
 * Replaces better-sqlite3 to avoid native compilation requirements.
 * Data is kept in memory and flushed to disk on every write.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'dinos.json');

let store = { dinos: {} }; // id → dino object

function load() {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      store = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      if (!store.dinos) store.dinos = {};
    }
  } catch {
    store = { dinos: {} };
  }
}

function save() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}

// Load on require
load();

function upsertDinos(dinos) {
  for (const d of dinos) {
    store.dinos[d.id] = d;
  }
  save();
}

function clearDinos() {
  store.dinos = {};
  save();
}

function deleteDino(id) {
  delete store.dinos[id];
  save();
}

function getDinoById(id) {
  return store.dinos[id] || null;
}

function getDinos(filters = {}) {
  let list = Object.values(store.dinos);

  if (filters.map)     list = list.filter(d => d.map === filters.map);
  if (filters.species) list = list.filter(d => d.species?.toLowerCase().includes(filters.species.toLowerCase()));
  if (filters.search)  list = list.filter(d =>
    d.dinoName?.toLowerCase().includes(filters.search.toLowerCase()) ||
    d.species?.toLowerCase().includes(filters.search.toLowerCase())
  );
  if (filters.isFemale !== undefined && filters.isFemale !== '')
    list = list.filter(d => d.isFemale === (filters.isFemale === true || filters.isFemale === 'true'));
  if (filters.isCryopodded !== undefined && filters.isCryopodded !== '')
    list = list.filter(d => d.isCryopodded === (filters.isCryopodded === true || filters.isCryopodded === 'true'));
  if (filters.minMutations !== undefined)
    list = list.filter(d => (d.mutationsMale + d.mutationsFemale) >= Number(filters.minMutations));
  if (filters.maxMutations !== undefined)
    list = list.filter(d => (d.mutationsMale + d.mutationsFemale) <= Number(filters.maxMutations));
  if (filters.minImprint !== undefined)
    list = list.filter(d => d.imprint >= Number(filters.minImprint));

  // Sort
  const col = filters.sortBy || 'level';
  const dir = filters.sortDir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    let va, vb;
    switch (col) {
      case 'level':                va = a.level;                                      vb = b.level; break;
      case 'imprint':              va = a.imprint;                                    vb = b.imprint; break;
      case 'mutations_male':       va = a.mutationsMale + a.mutationsFemale;          vb = b.mutationsMale + b.mutationsFemale; break;
      case 'taming_effectiveness': va = a.tamingEffectiveness;                        vb = b.tamingEffectiveness; break;
      case 'stat_health':          va = a.stats?.health  || 0;                        vb = b.stats?.health  || 0; break;
      case 'stat_melee':           va = a.stats?.melee   || 0;                        vb = b.stats?.melee   || 0; break;
      case 'dino_name':            va = a.dinoName || '';                             vb = b.dinoName || ''; break;
      case 'species':              va = a.species  || '';                             vb = b.species  || ''; break;
      case 'map':                  va = a.map      || '';                             vb = b.map      || ''; break;
      default:                     va = a.level;                                      vb = b.level;
    }
    if (va < vb) return -1 * dir;
    if (va > vb) return  1 * dir;
    return 0;
  });

  return list;
}

function getDistinctMaps() {
  return [...new Set(Object.values(store.dinos).map(d => d.map).filter(Boolean))].sort();
}

function getDistinctSpecies() {
  return [...new Set(Object.values(store.dinos).map(d => d.species).filter(Boolean))].sort();
}

function getBestByStatPerMap() {
  const allDinos = Object.values(store.dinos);
  const stats = ['stat_health', 'stat_stamina', 'stat_melee', 'stat_weight', 'stat_speed'];
  const statKey = { stat_health: 'health', stat_stamina: 'stamina', stat_melee: 'melee', stat_weight: 'weight', stat_speed: 'speed' };
  const results = {};

  for (const stat of stats) {
    const key = statKey[stat];
    const byMap = {};
    for (const d of allDinos) {
      const val = d.stats?.[key] || 0;
      if (!byMap[d.map] || val > byMap[d.map].value) {
        byMap[d.map] = { map: d.map, id: d.id, dino_name: d.dinoName, species: d.species, level: d.level, value: val };
      }
    }
    results[stat] = Object.values(byMap);
  }
  return results;
}

module.exports = { upsertDinos, getDinos, getDinoById, deleteDino, clearDinos, getDistinctMaps, getDistinctSpecies, getBestByStatPerMap };
