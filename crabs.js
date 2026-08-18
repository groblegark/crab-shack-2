// Crab personalities: names, traits, commute modes, and quips.

const CRAB_NAMES = [
  "PINCHY", "CLAWDIA", "SHELLDON", "SANDY", "BUBBLES", "SCUTTLE",
  "CORAL", "SNIPPY", "HERMIE", "SALTY", "MITTENS", "KELP",
];

const TRAITS = {
  speedy: {
    label: "SPEEDY", move: 1.4, work: 1.0, tip: 1.0,
    quips: {
      commute: ["GOTTA GO FAST", "ZOOM ZOOM", "NO TIME!", "RACE YA THERE", "WIND IN MY STALKS", "LAST ONE IN COOKS"],
      work: ["ORDER UP!", "FASTER! FASTER!", "DONE ALREADY", "TWO AT A TIME!", "BLINK AND ITS PLATED", "CHOP CHOP CHOP"],
      home: ["LAPS ON THE BEACH", "CAN'T SIT STILL", "SPRINTS AT SUNSET", "REST IS FOR BARNACLES"],
    },
  },
  lazy: {
    label: "LAZY", move: 0.85, work: 0.85, tip: 1.0, lateMin: 45,
    quips: {
      commute: ["5 MORE MINS...", "WHY SO EARLY", "YAWN", "CARRY ME?", "IS IT SUNDAY YET", "SLOW LANE PLEASE"],
      work: ["BREAK TIME YET?", "SO MANY ORDERS", "UGH, TOURISTS", "MY CLAWS ACHE", "CAN THE FISH COOK ITSELF", "SNOOZE BUTTON WHERE"],
      home: ["NAP O'CLOCK", "ZZZ...", "COMFY SAND", "HAMMOCK TIME", "DO NOT DISTURB"],
    },
  },
  cheery: {
    label: "CHEERY", move: 1.0, work: 1.0, tip: 1.25,
    quips: {
      commute: ["WHAT A MORNING!", "HI SEAGULLS!", "LOVE THIS TOWN", "BEST COMMUTE EVER", "SMELL THAT SEA AIR", "WAVING AT THE BUS"],
      work: ["SERVICE W. A SMILE", "ENJOY!", "MY PLEASURE!", "YOU CAME BACK!", "EXTRA NAPKINS ON ME", "TIPS? OH YOU!"],
      home: ["BEST DAY EVER", "SUNSETS RULE", "TOMORROW'S BRIGHTER", "GRATEFUL LIL CRAB"],
    },
  },
  grumpy: {
    label: "GRUMPY", move: 1.0, work: 1.15, tip: 0.9,
    quips: {
      commute: ["TRAFFIC. GREAT.", "SAND IN MY SHOES", "HMPH", "WHO SCHEDULED THIS", "BUS SEAT WAS WARM. GROSS", "MORNINGS. WHY."],
      work: ["YES YES, TACO", "I'M CHOPPING OK", "TOURISTS...", "NO SUBSTITUTIONS", "THE GRILL AND I ARE FEUDING", "TIP JAR'S THAT WAY"],
      home: ["FINALLY. QUIET.", "DON'T KNOCK", "MY DUNE. MINE.", "SUNSET'S FINE I GUESS"],
    },
  },
  tidy: {
    label: "TIDY", move: 1.0, work: 1.1, tip: 1.05,
    quips: {
      commute: ["CLAWS WASHED", "EARLY IS ON TIME", "APRON: PRESSED", "CHECKLIST: DONE", "SPOTLESS COMMUTE", "SHELLS SHINED"],
      work: ["MISE EN PLACE", "CLEAN AS YOU GO", "SPOTLESS", "STRAIGHTEN THAT PLATE", "SANITIZED!", "LABEL YOUR FISH"],
      home: ["SWEEPING MY DUNE", "ALL SHIPSHAPE", "ALPHABETIZED SHELLS", "EVEN THE SAND IS SORTED"],
    },
  },
  dreamy: {
    label: "DREAMY", move: 0.95, work: 0.9, tip: 1.15, pauses: true,
    quips: {
      commute: ["LOOK, A CLOUD...", "THE WAVES SING", "OOH SHINY SHELL", "WAS I GOING SOMEWHERE", "THE SUN FOLLOWED ME", "SEA GLASS!!"],
      work: ["WAIT, WHAT ORDER?", "THE GRILL DANCES", "PRETTY FLAMES", "THIS TACO HAS A SOUL", "LOST IN THE STEAM", "OCEAN'S HUMMING AGAIN"],
      home: ["COUNTING STARS", "THE SEA CALLS", "MOON'S OUT EARLY", "DREAMT OF BIG TIDES"],
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

// the two founders are always the same, so every new game opens fair;
// hires are the gacha
const FOUNDERS = [
  { name: "PINCHY", trait: "speedy", mode: "walk", acc: "none" },
  { name: "CLAWDIA", trait: "tidy", mode: "bike", acc: "flower" },
];
function makeCrabPersona(i, rng) {
  rng = rng || Math.random;
  if (FOUNDERS[i]) return Object.assign({
    color: i, shift: i % 2 === 0 ? "M" : "E", house: i, wallet: 10,
  }, FOUNDERS[i]);
  return {
    name: CRAB_NAMES[i % CRAB_NAMES.length],
    trait: TRAIT_KEYS[(rng() * TRAIT_KEYS.length) | 0],
    mode: MODE_KEYS[(rng() * MODE_KEYS.length) | 0],
    acc: ACC_KEYS[(rng() * ACC_KEYS.length) | 0],
    color: i % CRAB_COLORS.length,
    shift: i % 2 === 0 ? "M" : "E",   // alternate morning/evening
    wallet: 10,
    house: i,
  };
}

const SHIFTS = {
  M: { label: "8-14", start: 8 * 60, end: 14 * 60 },
  E: { label: "14-20", start: 14 * 60, end: 20 * 60 },
};

// rare townwide lines any crab might say
const TOWN_QUIPS = {
  commute: ["NICE DAY IN CRAB COVE", "THAT LANDLORD CRAB...", "HEARD RENT'S $120. OOF", "THE BUS SMELLS LIKE KELP"],
  work: ["RENT'S DUE TONIGHT", "ANOTHER DAY ANOTHER CLAW", "THE LANDLORD WAS LURKING", "SHACK SWEET SHACK"],
  home: ["CRAB COVE FOREVER", "SUNSET'S FREE AT LEAST", "HEARD THE SHELTER GOT NEW SOUP", "TIDE'S COMING IN"],
};

// walk-in customers are crabs too, and everybody has a name
const CUSTOMER_NAMES = [
  "GARY", "SHELLY", "EBB", "FLO", "BARNABY", "PEARL", "SANDRO", "MISTY",
  "CLACKERS", "NIPPY", "BRINY", "KRILL BILL", "ANEMONE", "WAVY DAVE",
  "MOLT", "SCAMPI", "ROE", "MAUDE", "SNAPPY", "BUOY", "SALTINE", "DIP",
  "TIDEPOOL TIM", "SURF MOM", "PLANKTON PETE", "BIG PALP",
];
