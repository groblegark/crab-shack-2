// Crab personalities: names, traits, commute modes, and quips.

const CRAB_NAMES = [
  "PINCHY", "CLAWDIA", "SHELLDON", "SANDY", "BUBBLES", "SCUTTLE",
  "CORAL", "SNIPPY", "HERMIE", "SALTY", "MITTENS", "KELP",
];

const TRAITS = {
  speedy: {
    label: "SPEEDY", move: 1.4, work: 1.0, tip: 1.0,
    quips: {
      commute: ["GOTTA GO FAST", "ZOOM ZOOM", "NO TIME!"],
      work: ["ORDER UP!", "FASTER! FASTER!", "DONE ALREADY"],
      home: ["LAPS ON THE BEACH", "CAN'T SIT STILL"],
    },
  },
  lazy: {
    label: "LAZY", move: 0.85, work: 0.85, tip: 1.0, lateMin: 45,
    quips: {
      commute: ["5 MORE MINS...", "WHY SO EARLY", "YAWN"],
      work: ["BREAK TIME YET?", "SO MANY ORDERS", "UGH, TOURISTS"],
      home: ["NAP O'CLOCK", "ZZZ...", "COMFY SAND"],
    },
  },
  cheery: {
    label: "CHEERY", move: 1.0, work: 1.0, tip: 1.25,
    quips: {
      commute: ["WHAT A MORNING!", "HI SEAGULLS!", "LOVE THIS TOWN"],
      work: ["SERVICE W. A SMILE", "ENJOY!", "MY PLEASURE!"],
      home: ["BEST DAY EVER", "SUNSETS RULE"],
    },
  },
  grumpy: {
    label: "GRUMPY", move: 1.0, work: 1.15, tip: 0.9,
    quips: {
      commute: ["TRAFFIC. GREAT.", "SAND IN MY SHOES", "HMPH"],
      work: ["YES YES, TACO", "I'M CHOPPING OK", "TOURISTS..."],
      home: ["FINALLY. QUIET.", "DON'T KNOCK"],
    },
  },
  tidy: {
    label: "TIDY", move: 1.0, work: 1.1, tip: 1.05,
    quips: {
      commute: ["CLAWS WASHED", "EARLY IS ON TIME"],
      work: ["MISE EN PLACE", "CLEAN AS YOU GO", "SPOTLESS"],
      home: ["SWEEPING MY DUNE", "ALL SHIPSHAPE"],
    },
  },
  dreamy: {
    label: "DREAMY", move: 0.95, work: 0.9, tip: 1.15, pauses: true,
    quips: {
      commute: ["LOOK, A CLOUD...", "THE WAVES SING", "OOH SHINY SHELL"],
      work: ["WAIT, WHAT ORDER?", "THE GRILL DANCES", "PRETTY FLAMES"],
      home: ["COUNTING STARS", "THE SEA CALLS"],
    },
  },
};

const MODES = {
  walk:  { label: "WALKS",  speed: 30 },
  bike:  { label: "BIKES",  speed: 75 },
  bus:   { label: "RIDES THE BUS", speed: 30 },   // walking speed to/from stops
  buggy: { label: "DRIVES", speed: 115 },
};

const ACC_KEYS = ["cap", "bow", "shades", "flower", "none"];
const TRAIT_KEYS = Object.keys(TRAITS);
const MODE_KEYS = Object.keys(MODES);

function makeCrabPersona(i, rng) {
  rng = rng || Math.random;
  return {
    name: CRAB_NAMES[i % CRAB_NAMES.length],
    trait: TRAIT_KEYS[(rng() * TRAIT_KEYS.length) | 0],
    mode: MODE_KEYS[(rng() * MODE_KEYS.length) | 0],
    acc: ACC_KEYS[(rng() * ACC_KEYS.length) | 0],
    color: i % CRAB_COLORS.length,
    shift: i % 2 === 0 ? "M" : "E",   // alternate morning/evening
    house: i,
  };
}

const SHIFTS = {
  M: { label: "8-14", start: 8 * 60, end: 14 * 60 },
  E: { label: "14-20", start: 14 * 60, end: 20 * 60 },
};
