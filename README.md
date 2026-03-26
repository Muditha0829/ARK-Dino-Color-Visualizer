# ARK Dino Color Visualizer

A local web tool for ARK: Survival Evolved / Ascended players to visualize, analyze, and share their tamed dinosaur data. Import your dinos from a game `.ini` export file and get a rich visual breakdown of colors, stats, mutations, and breeding scores — all in one place.

---

## Features

- **Dino card grid** — browse all imported dinos with a live color-rendered preview of each creature
- **Color regions** — all 6 color regions displayed with ARK color ID, color name, and nearest-match swatch
- **Color combinations** — auto-detects community color combo names (Cotton Candy, Galaxy, Void, etc.) based on the dino's active colors; players can also enter a custom combo name
- **Stat breakdown** — view wild base / mutation / domestic levels per stat with visual progress bars
- **Mutation & imprint tracking** — mutations (♂/♀ split), imprint %, taming effectiveness, and a calculated breed score
- **Detail modal** — click any card for a full breakdown including badges, stat chips, color tiles, and combo selector
- **Export to JPG** — export individual dinos or batch-export multiple selected dinos as image cards
- **Multi-select mode** — checkbox UI for selecting and exporting multiple dinos at once
- **Live file watching** — backend watches the `.ini` file for changes and pushes updates instantly via WebSocket

---

## Data Sources

| Data | Source |
|---|---|
| ARK Color IDs & Names | [ARK Wiki — Color IDs](https://ark.wiki.gg/wiki/Color_IDs) (256 colors, IDs #1–229 mapped) |
| Dino species images | [ARK Wiki](https://ark.wiki.gg/) — fetched by species name |
| Color combo names | Community-sourced names (Cotton Candy, Galaxy, Void, Cyberpunk, etc.) curated by the ARK player community |
| Stat estimation formula | ARK Wiki stat calculation: `V = B × (1 + Lw×Iw) × (1 + Ta) × TBHM × (1 + Tm×TE) × (1 + Im×Lt)` |
| Dino data | Exported from the game via `.ini` config export (GameUserSettings / dino export format) |

---

## Tech Stack

**Frontend** — React 18, Vite, Tailwind CSS, html2canvas
**Backend** — Node.js, Express, Jimp (image processing), chokidar (file watching), WebSocket (`ws`)

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- npm (comes with Node.js)

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ark-dino-visualizer.git
cd ark-dino-visualizer
```

---

### 2. Install all dependencies

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

---

### 3. Start the app

```bash
npm run dev
```

This runs both the backend and frontend together in one terminal. You'll see color-coded output from each:

| Server | URL |
|---|---|
| Backend API | http://localhost:3000 |
| Frontend | http://localhost:5173 |

Open **http://localhost:5173** in your browser.

---

### 4. Import your dinos

1. In ARK, export your dino data to a `.ini` file using your preferred export tool
2. Place the file where the backend can watch it (configure the path in `backend/server.js` if needed)
3. The app will automatically detect the file and load your dinos

---

## Project Structure

```
ark-dino-visualizer/
├── backend/
│   ├── server.js          # Express API + WebSocket + file watcher
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── DinoCard.jsx       # Dino card with color preview
    │   │   ├── DinoDetail.jsx     # Full detail modal
    │   │   └── ExportCard.jsx     # JPG export card layout
    │   ├── colorData.js           # ARK color ID → name/hex map (256 colors)
    │   ├── colorCombos.js         # Community color combo definitions
    │   └── App.jsx
    └── package.json
```

---

## License

MIT
