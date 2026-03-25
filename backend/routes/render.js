const express = require('express');
const router = express.Router();
const { renderDino } = require('../renderer/dinoRenderer');
const { getDinoById } = require('../db');
const { getColor } = require('../colorMap');

// GET /api/render/:id — render a dino image by its DB id
router.get('/:id', async (req, res) => {
  try {
    const dino = getDinoById(req.params.id);
    if (!dino) return res.status(404).json({ error: 'Dino not found' });

    const imgBuffer = await renderDino(dino.species, dino.colors, dino.colorHex);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache');
    res.send(imgBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/render/preview — render inline without saving
// Query: species=Rex&c0=28&c1=53&c2=2&c3=1&c4=108&c5=28
router.get('/preview', async (req, res) => {
  try {
    const species = req.query.species || 'Rex';
    const colors = [0, 1, 2, 3, 4, 5].map(i => Number(req.query[`c${i}`] || 0));
    const imgBuffer = await renderDino(species, colors);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache');
    res.send(imgBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/render/colors — get resolved hex colors for a set of IDs
router.get('/colors', (req, res) => {
  const colors = [0, 1, 2, 3, 4, 5].map(i => {
    const id = Number(req.query[`c${i}`] || 0);
    return { id, ...getColor(id) };
  });
  res.json({ colors });
});

module.exports = router;
