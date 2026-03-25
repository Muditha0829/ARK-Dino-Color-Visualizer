/**
 * Color combination names for ARK dino color patterns.
 * Community-sourced names for recognizable color combos.
 */

export const COLOR_COMBOS = {
  classic: [
    { colors: ['red', 'black'],          name: 'Deadpool' },
    { colors: ['red', 'blue', 'yellow'], name: 'Lego' },
    { colors: ['blue', 'red', 'white'],  name: 'Captain America' },
    { colors: ['green', 'purple'],       name: 'Joker' },
    { colors: ['black', 'red'],          name: 'Nightmare' },
    { colors: ['purple', 'blue', 'pink'],name: 'Galaxy' },
  ],
  cute_fun: [
    { colors: ['pink', 'cyan'],          name: 'Cotton Candy' },
    { colors: ['pink', 'white'],         name: 'Bubblegum' },
    { colors: ['cyan', 'white'],         name: 'Ice Cream' },
    { colors: ['lavender', 'mint'],      name: 'Pastel Dream' },
    { colors: ['peach', 'cream'],        name: 'Soft Serve' },
  ],
  nature: [
    { colors: ['yellow', 'black'],       name: 'Bumble Bee' },
    { colors: ['green', 'brown'],        name: 'Jungle' },
    { colors: ['blue', 'white'],         name: 'Glacier' },
    { colors: ['orange', 'brown'],       name: 'Autumn' },
    { colors: ['green', 'yellow'],       name: 'Toxic' },
  ],
  dark_evil: [
    { colors: ['black', 'purple'],       name: 'Void' },
    { colors: ['black', 'crimson'],      name: 'Blood Moon' },
    { colors: ['black', 'green'],        name: 'Venom' },
    { colors: ['black', 'gray'],         name: 'Ash' },
    { colors: ['black', 'blue'],         name: 'Abyss' },
  ],
  bright_flashy: [
    { colors: ['neon green', 'black'],   name: 'Radioactive' },
    { colors: ['cyan', 'purple'],        name: 'Cyberpunk' },
    { colors: ['yellow', 'pink'],        name: 'Highlighter' },
    { colors: ['red', 'yellow'],         name: 'Inferno' },
    { colors: ['blue', 'cyan'],          name: 'Electric' },
  ],
  royal_legendary: [
    { colors: ['purple', 'gold'],        name: 'Royalty' },
    { colors: ['black', 'gold'],         name: 'Pharaoh' },
    { colors: ['white', 'gold'],         name: 'Divine' },
    { colors: ['blue', 'gold'],          name: 'Imperial' },
    { colors: ['crimson', 'gold'],       name: 'Blood King' },
  ],
};

export const CATEGORY_ICONS = {
  classic:        '🎭',
  cute_fun:       '🍬',
  nature:         '🌿',
  dark_evil:      '💀',
  bright_flashy:  '⚡',
  royal_legendary:'👑',
};

export const CATEGORY_LABELS = {
  classic:        'Classic',
  cute_fun:       'Cute & Fun',
  nature:         'Nature',
  dark_evil:      'Dark & Evil',
  bright_flashy:  'Bright & Flashy',
  royal_legendary:'Royal & Legendary',
};

/**
 * Maps every ARK color name (lowercase) → generic color keywords.
 * A color can map to multiple keywords so it matches several combos.
 */
const ARK_TO_KEYWORDS = {
  // ── Basic palette ──────────────────────────────────────────────────
  'red':                 ['red'],
  'blue':                ['blue'],
  'green':               ['green'],
  'yellow':              ['yellow'],
  'cyan':                ['cyan'],
  'magenta':             ['purple', 'pink'],
  'light gray':          ['gray', 'white'],
  'dark gray':           ['gray', 'black'],
  'dark red':            ['red', 'black'],
  'dark blue':           ['blue', 'black'],
  'dark green':          ['green', 'black'],
  'dark yellow':         ['yellow', 'brown'],
  'dark cyan':           ['cyan', 'blue'],
  'dark magenta':        ['purple'],
  'brown':               ['brown'],
  'orange':              ['orange'],
  'sky blue':            ['blue', 'cyan'],
  'burnt sienna':        ['brown', 'orange'],
  'vermillion':          ['red', 'orange'],
  'white':               ['white'],
  'black':               ['black'],
  // ── Dino dark shades ───────────────────────────────────────────────
  'dino dark red':       ['red', 'black'],
  'dino dark orange':    ['orange', 'brown'],
  'dino dark yellow':    ['yellow'],
  'dino dark green':     ['green', 'black'],
  'dino dark cyan':      ['cyan', 'blue'],
  'dino dark blue':      ['blue', 'black'],
  // ── Dino light shades ──────────────────────────────────────────────
  'dino light red':      ['red', 'pink'],
  'dino light orange':   ['orange'],
  'dino light yellow':   ['yellow'],
  'dino light green':    ['green', 'mint'],
  'dino light cyan':     ['cyan'],
  'dino light blue':     ['blue', 'cyan'],
  // ── Dino medium shades ─────────────────────────────────────────────
  'dino medium red':     ['red'],
  'dino medium orange':  ['orange'],
  'dino medium yellow':  ['yellow'],
  'dino medium green':   ['green'],
  'dino medium cyan':    ['cyan'],
  'dino medium blue':    ['blue'],
  // ── Purples ────────────────────────────────────────────────────────
  'dino dark purple':    ['purple', 'black'],
  'dino medium purple':  ['purple'],
  'dino light purple':   ['purple', 'pink'],
  'dino indigo':         ['purple', 'blue'],
  'dino violet':         ['purple'],
  'dino lavender':       ['lavender', 'purple'],
  'dino orchid':         ['purple', 'pink'],
  'dino plum':           ['purple'],
  'dino grape':          ['purple'],
  'dino amethyst':       ['purple'],
  'dino heliotrope':     ['purple', 'pink'],
  'dino fuchsia':        ['pink', 'purple'],
  'fjordur purple':      ['purple'],
  'drake purple':        ['purple'],
  'aberrant violet':     ['purple', 'pink'],
  // ── Pinks ──────────────────────────────────────────────────────────
  'dino dark pink':      ['pink', 'purple'],
  'dino medium pink':    ['pink'],
  'dino light pink':     ['pink'],
  'dino rose':           ['pink', 'red'],
  'dino salmon':         ['pink', 'orange'],
  'dino coral':          ['orange', 'pink'],
  'dino peach':          ['peach', 'pink'],
  'dino apricot':        ['peach', 'orange'],
  'dino cherry':         ['pink', 'red'],
  'dino hot pink':       ['pink'],
  'dino neon pink':      ['neon pink', 'pink'],
  'glowtail pink':       ['pink', 'cyan'],
  // ── Reds / Crimsons ────────────────────────────────────────────────
  'dino scarlet':        ['red', 'crimson'],
  'dino crimson':        ['crimson', 'red'],
  'dino rust':           ['red', 'orange', 'brown'],
  'dino wine':           ['red', 'purple'],
  'dino burgundy':       ['crimson', 'red', 'purple'],
  'dino maroon':         ['red', 'brown'],
  'dino mahogany':       ['brown', 'red'],
  'dino chestnut':       ['brown', 'red'],
  'wyvern fire red':     ['red', 'orange'],
  'giga dark red':       ['red', 'black'],
  'drake red':           ['red'],
  'dino neon red':       ['neon red', 'red'],
  // ── Oranges ────────────────────────────────────────────────────────
  'dino pumpkin':        ['orange'],
  'dino copper':         ['orange', 'brown'],
  'dino amber':          ['orange', 'yellow', 'gold'],
  'dino honey':          ['yellow', 'orange'],
  'dino butterscotch':   ['orange', 'brown'],
  'giga orange':         ['orange'],
  'extinction copper':   ['orange', 'brown'],
  'dino neon orange':    ['neon orange', 'orange'],
  // ── Yellows / Golds ────────────────────────────────────────────────
  'dino lemon':          ['yellow'],
  'dino pale yellow':    ['yellow'],
  'dino tan':            ['yellow', 'brown'],
  'dino sand':           ['yellow', 'brown'],
  'dino wheat':          ['cream', 'yellow'],
  'dino chartreuse':     ['green', 'yellow'],
  'dino lime':           ['green', 'yellow'],
  'dino neon yellow':    ['yellow', 'neon green'],
  'dino gold':           ['gold', 'yellow'],
  'dino dark gold':      ['gold', 'brown'],
  'dino bronze':         ['gold', 'brown'],
  'featherlight gold':   ['gold', 'yellow'],
  'aberrant yellow':     ['yellow'],
  // ── Greens ─────────────────────────────────────────────────────────
  'dino pale green':     ['green', 'mint'],
  'dino mint':           ['mint', 'green', 'cyan'],
  'dino sage':           ['green', 'gray'],
  'dino olive':          ['green', 'brown'],
  'dino olive drab':     ['green', 'brown'],
  'dino moss':           ['green', 'brown'],
  'dino fern':           ['green'],
  'dino hunter green':   ['green', 'black'],
  'dino emerald':        ['green'],
  'dino jade':           ['green', 'cyan'],
  'dino forest green':   ['green'],
  'dino khaki':          ['green', 'brown'],
  'dino neon green':     ['neon green', 'green'],
  'wyvern poison green': ['green'],
  'aberrant teal':       ['cyan', 'green'],
  'drake green':         ['green'],
  // ── Cyans / Teals ──────────────────────────────────────────────────
  'dino teal':           ['cyan', 'green'],
  'dino aqua':           ['cyan', 'blue'],
  'dino turquoise':      ['cyan', 'green'],
  'dino electric blue':  ['cyan', 'blue'],
  'dino ice blue':       ['blue', 'cyan', 'white'],
  'dino powder blue':    ['blue', 'cyan'],
  'dino neon cyan':      ['neon cyan', 'cyan'],
  'bulbdog blue':        ['blue', 'cyan'],
  'wyvern ice blue':     ['blue', 'cyan', 'white'],
  // ── Blues ──────────────────────────────────────────────────────────
  'dino navy blue':      ['blue', 'black'],
  'dino midnight blue':  ['blue', 'black'],
  'dino cobalt':         ['blue'],
  'dino royal blue':     ['blue'],
  'dino cornflower':     ['blue'],
  'dino steel blue':     ['blue'],
  'dino dusty blue':     ['blue', 'gray'],
  'dino pale blue':      ['blue'],
  'dino azure':          ['blue', 'cyan', 'white'],
  'dino neon purple':    ['neon purple', 'purple'],
  'slate':               ['gray', 'blue'],
  'wyvern lightning':    ['blue', 'purple', 'white'],
  'drake blue':          ['blue'],
  // ── Whites / Creams ────────────────────────────────────────────────
  'dino snow':           ['white'],
  'dino ivory':          ['white', 'cream'],
  'dino bone':           ['white', 'cream'],
  'dino cream':          ['cream', 'white'],
  'dino beige':          ['cream', 'brown'],
  'dino platinum':       ['white', 'gray'],
  // ── Grays / Blacks ─────────────────────────────────────────────────
  'dino silver':         ['gray', 'white'],
  'dino ash':            ['gray', 'black'],
  'dino charcoal':       ['black', 'gray'],
  // ── Browns ─────────────────────────────────────────────────────────
  'dino dark brown':     ['brown', 'black'],
  'dino medium brown':   ['brown'],
  'dino light brown':    ['brown', 'orange'],
  'dino sepia':          ['brown'],
  'dino taupe':          ['brown', 'gray'],
  'dino umber':          ['brown'],
  'dino caramel':        ['brown', 'orange'],
  'dino peanut':         ['brown'],
  'ragnarok brown':      ['brown'],
};

/**
 * Given a list of ARK color names, returns a Set of all generic keywords.
 */
export function getDinoColorKeywords(arkColorNames) {
  const kws = new Set();
  for (const name of arkColorNames) {
    const mapped = ARK_TO_KEYWORDS[name.toLowerCase().trim()];
    if (mapped) mapped.forEach(k => kws.add(k));
  }
  return kws;
}

/**
 * Returns matching color combos sorted by specificity (most colors matched first).
 * @param {string[]} activeArkColorNames - ARK color names from non-unused regions
 */
export function matchColorCombos(activeArkColorNames) {
  if (!activeArkColorNames || activeArkColorNames.length === 0) return [];
  const kws = getDinoColorKeywords(activeArkColorNames);
  const results = [];

  for (const [category, combos] of Object.entries(COLOR_COMBOS)) {
    for (const combo of combos) {
      if (combo.colors.every(c => kws.has(c))) {
        results.push({
          ...combo,
          category,
          categoryLabel: CATEGORY_LABELS[category] || category,
          specificity: combo.colors.length,
        });
      }
    }
  }

  return results.sort((a, b) => b.specificity - a.specificity);
}
