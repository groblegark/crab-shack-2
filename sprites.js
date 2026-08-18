// All pixel art hand-drawn as character maps, snescat style. '.' = transparent.

const PAL = {
  K: [30, 20, 36],     // outline
  L: [250, 250, 255],  // bright white (toque, glints)
  W: [255, 255, 255],  // eye white
  B: [30, 20, 36],     // pupil
  M: [204, 208, 220],  // metal grey
  A: [255, 216, 96],   // amber / coin gold
  O: [255, 150, 60],   // orange
  D: [140, 90, 50],    // wood dark
  E: [190, 140, 80],   // wood light
  S: [255, 205, 160],  // skin
  G: [90, 200, 110],   // green
  C: [96, 200, 255],   // cyan / water
  P: [255, 150, 170],  // pink
  Y: [255, 230, 120],  // pale yellow
  R: [230, 72, 88],    // red
  T: [170, 42, 62],    // dark red shade
  N: [70, 60, 90],     // dark slate (grill iron)
  U: [120, 110, 140],  // slate light
  F: [255, 100, 40],   // flame orange
  Z: [90, 170, 90],    // palm green dark
  J: [130, 210, 120],  // palm green light
  Q: [255, 170, 60],   // cheese / taco shell
  V: [120, 220, 190],  // seafoam
  I: [255, 240, 200],  // sand light
};

function swap(pal, from, to) {
  const p = Object.assign({}, pal);
  for (const k in from) p[k] = from[k];
  return p;
}

// ---------------------------------------------------------------- crab chef
// 16 wide; toque between eyestalks; body color R/T swaps per chef.
const _CRAB_TOP = [
  "..KK........KK..",
  ".KWBK......KBWK.",
  ".KWWK......KWWK.",
  "..KK........KK..",
  "..KRRRRRRRRRRK..",
  ".KRTRRRRRRRRTRK.",
  "KRRRRKRRRRKRRRRK",
  "KRRRRRRRRRRRRRRK",
  ".KRRTRRRRRRTRRK.",
];
const _CRAB_LEGS_A = [
  "KRRK.KRK..KRK...",
  "KRRK..KR..RK....",
  ".KK...K....K....",
];
const _CRAB_LEGS_B = [
  "KRRK..KR..RK....",
  "KRRK.KR....RK...",
  ".KK..K......K...",
];
// claw raised (work pose)
const _CRAB_LEGS_W = [
  "KRRK..KRRK......",
  "KRRK...KK.......",
  ".KK.............",
];
function crabArt(bodyCol, shadeCol) {
  const p = swap(PAL, { R: bodyCol, T: shadeCol });
  return {
    a: parseArt(_CRAB_TOP.concat(_CRAB_LEGS_A), p),
    b: parseArt(_CRAB_TOP.concat(_CRAB_LEGS_B), p),
    w: parseArt(_CRAB_TOP.concat(_CRAB_LEGS_W), p),
  };
}
const CRAB_COLORS = [
  [[230, 72, 88], [170, 42, 62]],    // red
  [[96, 150, 255], [60, 95, 190]],   // blue
  [[90, 200, 110], [50, 140, 80]],   // green
  [[200, 120, 255], [140, 70, 190]], // purple
  [[255, 150, 60], [190, 100, 30]],  // orange
  [[255, 130, 190], [190, 80, 140]], // pink
];

// ---------------------------------------------------------------- tourists
// 12x19, faces left toward the pass window. H hair, T shirt are swapped.
const _TOURIST = [
  "...KKKKKK...",
  "..KHHHHHHK..",
  ".KHHHHHHHHK.",
  ".KHSSSSSSHK.",
  ".KSBSSSBSSK.",
  ".KSSSSSSSSK.",
  ".KSSPSSSSSK.",
  "..KSSSSSSK..",
  "...KKKKKK...",
  "..KTTTTTTK..",
  ".KTSTTTTSTK.",
  ".KTKTTTTKTK.",
  ".KSKTTTTKSK.",
  "...KTTTTK...",
  "...KNNNNK...",
  "...KNKKNK...",
  "...KSKKSK...",
  "...KSKKSK...",
  "..KKKKKKKK..",
];
const TOURIST_STYLES = [
  { H: [90, 60, 40], T: [96, 200, 255] },
  { H: [250, 220, 100], T: [255, 130, 190] },
  { H: [40, 40, 50], T: [90, 200, 110] },
  { H: [220, 120, 60], T: [255, 230, 120] },
  { H: [120, 80, 160], T: [255, 150, 60] },
];
function touristArt(style) { return parseArt(_TOURIST, swap(PAL, style)); }

// ---------------------------------------------------------------- items 9x7
const ITEMS = {};
function defItem(name, rows) { ITEMS[name] = parseArt(rows, PAL); }
defItem("fish_raw", [
  ".........",
  ".KKK.....",
  "KCCKKKKK.",
  "KCCCCCWBK",
  "KCCKKKKK.",
  ".KKK.....",
  ".........",
]);
defItem("fish_cut", [
  ".........",
  ".KK.KK...",
  "KPPKPPKK.",
  "KPPKPPKPK",
  "KPPKPPKK.",
  ".KK.KK...",
  ".........",
]);
defItem("fish_hot", [
  ".........",
  ".KKK.....",
  "KOOKKKKK.",
  "KOOOOOWBK",
  "KOOKKKKK.",
  ".KKK.....",
  ".........",
]);
defItem("taco", [
  ".........",
  "..KGKPK..",
  ".KGPKGPK.",
  "KQQGQPQK.",
  "KQQQQQQK.",
  ".KQQQQK..",
  "..KKKK...",
]);
defItem("fruit", [
  "....KZ...",
  "...KZK...",
  ".KKOKK...",
  "KOOOOK...",
  "KOOOOK...",
  "KOOOOK...",
  ".KKKK....",
]);
defItem("juice", [
  "..K.K....",
  ".KKZK....",
  "KYYKYK...",
  "KYYYYK...",
  ".KYYK....",
  ".KYYK....",
  ".KKKK....",
]);
defItem("plate_fish", [
  ".........",
  ".KKK.....",
  "KOOKKKKK.",
  "KOOOOOWBK",
  "KOOKKKKK.",
  "KLLLLLLLK",
  ".KKKKKKK.",
]);

// ---------------------------------------------------------------- stations
const CRATE = parseArt([
  "KKKKKKKKKKKKKKKKKKKK",
  "KEEEEEEEEEEEEEEEEEEK",
  "KEDDDDDDDDDDDDDDDDEK",
  "KEDCCKKCCCKKCCKKKDEK",
  "KEDCCCCCCWBCCCCKKDEK",
  "KEDCCKKCCCKKCCKKKDEK",
  "KEDDDDDDDDDDDDDDDDEK",
  "KEEEEEEEEEEEEEEEEEEK",
  "KDEEDDEEEEDDEEEEDDEK",
  "KDEEDDEEEEDDEEEEDDEK",
  "KEEEEEEEEEEEEEEEEEEK",
  "KKKKKKKKKKKKKKKKKKKK",
], PAL);
const BOARD = parseArt([
  "....................",
  "..KKKKKKKKK...KKK...",
  "..KLLLLLLLK..KMMK...",
  "..KLLLLLLLK.KMMK....",
  "..KKKKKKKKK.KDDK....",
  "KKKKKKKKKKKKKKKKKKKK",
  "KEEEEEEEEEEEEEEEEEEK",
  "KEDEEEEDEEEEDEEEEDEK",
  "KKKKKKKKKKKKKKKKKKKK",
  ".KDDK..........KDDK.",
  ".KDDK..........KDDK.",
  ".KDDK..........KDDK.",
], PAL);
const GRILL = parseArt([
  "..KKKKKKKKKKKKKK..",
  ".KNUUUUUUUUUUUUNK.",
  "KNUNKNKNKNKNKNKUNK",
  "KNNNNNNNNNNNNNNNNK",
  ".KNNNNNNNNNNNNNK..",
  "..KNNK......KNNK..",
  "..KNNK......KNNK..",
  "..KKKK......KKKK..",
], PAL);
const FLAME = [
  parseArt(["...F..", ".F.FF.", ".FFOF.", "FOOOF.", ".FAF..", ], PAL),
  parseArt(["..F...", ".FF.F.", ".FOFF.", ".FOOOF", "..FAF.", ], PAL),
];
// pass window: counter + bell + awning handled in bg draw
const PASS = parseArt([
  "........KAAK........",
  ".......KAAAAK.......",
  ".......KAAAAK.......",
  "......KKKKKKKK......",
  "KKKKKKKKKKKKKKKKKKKK",
  "KEEEEEEEEEEEEEEEEEEK",
  "KEDEEEEDEEEEDEEEEDEK",
  "KKKKKKKKKKKKKKKKKKKK",
  ".KDDK..........KDDK.",
  ".KDDK..........KDDK.",
  ".KDDK..........KDDK.",
], PAL);

// ---------------------------------------------------------------- scenery
const PALM = parseArt([
  "....JJJ....JJJ......",
  "..JJZZZJJ.JZZZJJ....",
  ".JZZJJJZZJZZJJZZJ...",
  "JZZJ..JJZZZJJ.JZZJ..",
  "JZJ..JZZZZZZZJ.JZJ..",
  ".J..JZZJKKJZZZJ..J..",
  "....JZJKDDKJZZZJ....",
  ".....J.KDDK.JZJ.....",
  ".......KDKDK.J......",
  ".......KDDK.........",
  "......KDKDK.........",
  "......KDDDK.........",
  ".....KDDKDK.........",
  ".....KDDDDK.........",
  "....KDKDDDK.........",
  "....KDDDDKK.........",
  "...KDDDKDDK.........",
  "...KDDDDDDK.........",
], PAL);
const UMBRELLA = parseArt([
  ".....KKKKK......",
  "...KKRRLRRKK....",
  "..KRRLRRRLRRK...",
  ".KRRLRRKRRLRRK..",
  "KKKKKKKKKKKKKKK.",
  ".......KDK......",
  ".......KDK......",
  ".......KDK......",
  ".......KDK......",
  ".......KDK......",
], PAL);
const CLOUD = parseArt([
  "....LLLL........",
  "..LLLLLLLL.LLL..",
  ".LLLLLLLLLLLLLL.",
  "LLLLLLLLLLLLLLLL",
  ".LLLL..LLLLLLL..",
], PAL);
const GULL = [
  parseArt(["KK.....KK", ".KK...KK.", "..KLKLK..", "....K...."], PAL),
  parseArt([".........", "..K...K..", ".KKLKLKK.", "....K...."], PAL),
];
const COIN = parseArt([
  ".KKKK.",
  "KAALAK",
  "KALAAK",
  "KAAAAK",
  "KAAAAK",
  ".KKKK.",
], PAL);
const BELL = parseArt([
  "..KK..",
  ".KAAK.",
  "KAAAAK",
  "KKKKKK",
  "..KK..",
], PAL);

// ================================================================ CS2 art
// accessories, drawn as overlays at the crab's head (origin = crab blit pos)
const ACCESSORIES = {
  toque: { dx: 4, dy: -4, art: parseArt([
    ".KLLLLK.",
    "KLLLLLLK",
    "KLLLLLLK",
    "KKKKKKKK",
  ], PAL) },
  cap: { dx: 3, dy: -3, art: parseArt([
    ".KRRRRK...",
    "KRRRRRRK..",
    "KKKKKKKKKK",
  ], swap(PAL, { R: [96, 150, 255] })) },
  bow: { dx: 9, dy: -4, art: parseArt([
    "KPK.KPK",
    "KPPKPPK",
    "KPK.KPK",
  ], PAL) },
  shades: { dx: 1, dy: 1, art: parseArt([
    "KNNK......KNNK",
    "KNNKKKKKKKKNNK",
  ], PAL) },
  flower: { dx: 0, dy: -3, art: parseArt([
    ".KPK.",
    "KPAPK",
    ".KPK.",
  ], PAL) },
  none: null,
};

// beach hut, roof color-swapped per crab; door at bottom center
function houseArt(roofCol) {
  const p = swap(PAL, { R: roofCol });
  return parseArt([
    "..........KKKKKKKK..........",
    ".......KKKRRRRRRRRKKK.......",
    "....KKKRRRRRRRRRRRRRRKKK....",
    ".KKKRRRRRRRRRRRRRRRRRRRRKKK.",
    "KRRRRRRRRRRRRRRRRRRRRRRRRRRK",
    "KKKKKKKKKKKKKKKKKKKKKKKKKKKK",
    ".KIIIIIIIIIIIIIIIIIIIIIIII K".replace(" ", "I"),
    ".KIIKCCCCKIIIIIIIIKDDDDKIIK.",
    ".KIIKCCCCKIIIIIIIIKDEEDKIIK.",
    ".KIIKCCCCKIIIIIIIIKDEEDKIIK.",
    ".KIIKKKKKKIIIIIIIIKDEADKIIK.",
    ".KIIIIIIIIIIIIIIIIKDEEDKIIK.",
    ".KIIIIIIIIIIIIIIIIKDDDDKIIK.",
    ".KKKKKKKKKKKKKKKKKKKKKKKKKK.",
    "..KDDK................KDDK..",
    "..KDDK................KDDK..",
  ], p);
}

const BUS = parseArt([
  ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
  "KAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK",
  "KAKCCCCKAKCCCCKAKCCCCKAKCCCCKAKCCCCKAAAK",
  "KAKCCCCKAKCCCCKAKCCCCKAKCCCCKAKCCCCKAAAK",
  "KAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK",
  "KOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOK",
  ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
  "....KNKK....................KNKK........",
  "...KNNNNK..................KNNNNK.......",
  "....KKKK....................KKKK........",
], PAL);

function buggyArt(col) {
  const p = swap(PAL, { R: col });
  return parseArt([
    "......KCCK......",
    ".....KCCCCK.....",
    ".KKKKKKKKKKKKK..",
    "KRRRRRRRRRRRRRK.",
    "KRRKRRRRRRRKRRK.",
    ".KKNKKKKKKKNKK..",
    ".KNNNK...KNNNK..",
    "..KKK.....KKK...",
  ], p);
}

const BIKE = parseArt([
  ".....KK....KK...",
  "..KKKKKKKKKK....",
  ".KNK..KK..KNK...",
  "KN.NK.KK.KN.NK..",
  "KN.NKKKKKKN.NK..",
  ".KNK......KNK...",
  "..K........K....",
], PAL);

const BUS_STOP = parseArt([
  "KKKKKKK",
  "KAAAAAK",
  "KAKKKAK",
  "KAKAKAK",
  "KAKKKAK",
  "KAAAAAK",
  "KKKKKKK",
  "..KMK..",
  "..KMK..",
  "..KMK..",
  "..KMK..",
  "..KMK..",
  "..KMK..",
], PAL);

const MOON = parseArt([
  "...KKKK...",
  ".KKLLLLKK.",
  ".KLLLLMLK.",
  "KLLMLLLLLK",
  "KLLLLLLMLK",
  "KLMLLLLLLK",
  "KLLLLMLLLK",
  ".KLLLLLLK.",
  ".KKLLLLKK.",
  "...KKKK...",
], PAL);

// tiny Zzz + music note + grump cloud for mood bubbles are drawn as text

// community crab shelter: driftwood, wide doorway, patched roof
const SHELTER = parseArt([
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  "KMMMMMMMMUUMMMMMMMMMMUUMMMMK",
  "KMMUUMMMMMMMMMMMUUMMMMMMMMMK",
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  ".KEEEEEEEEEEEEEEEEEEEEEEEE K".replace(" ", "E"),
  ".KEEDDEEEEEEEEEEEEEEEEDDEEK.",
  ".KEEDDEEEKKKKKKKKKKEEEDDEEK.",
  ".KEEEEEEEKDDDDDDDDKEEEEEEEK.",
  ".KEEKCCKEKDDDDDDDDKEKCCKEEK.",
  ".KEEKCCKEKDDADDDDDKEKCCKEEK.",
  ".KEEKKKKEKDDDDDDDDKEKKKKEEK.",
  ".KEEEEEEEKDDDDDDDDKEEEEEEEK.",
  ".KKKKKKKKKKKKKKKKKKKKKKKKKK.",
  "..KDDK................KDDK..",
], PAL);
