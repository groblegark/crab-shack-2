// CRAB SHACK 2 — a whole beachside town. Crabs have names, moods, shift
// schedules, and commutes: they walk, bike, ride the bus, or drive their
// beach buggy to work at the shack. Click a crab (or its portrait) to
// follow it around town.

"use strict";

const cv = document.getElementById("screen");
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ---------------------------------------------------------------- geometry
const WORLD_W = 1024;
const SKY_H = 58, SHORE_Y = 86, FLOOR_Y = 166, PANEL_Y = 176;
const ROAD_Y0 = 118, ROAD_Y1 = 140, ROAD_END = 610;
const HOUSE_XS = [30, 100, 170, 240, 310, 380].map(x => x);
const BUS_STOPS = [440, 560];
const BUS_TERMINUS = [340, 580];
const SHACK_X0 = 618, SHACK_X1 = 848, SHACK_DOOR = 645;
const STX = { crate: [630], board: [664, 685, 706], grill: [734, 756, 778], pass: [806] };
const STATION_BOTTOM = 152;
const QUEUE_X0 = 834, QUEUE_DX = 13, QUEUE_MAX = 4;
const PARK_X = 500, RACK_X = 596;
const SHELTER_X = 444, MOVE_IN_COST = 25;

// ---------------------------------------------------------------- clock
const TS = 4;                     // game minutes per real second
let day = 1, tmin = 7 * 60;      // start day 1, 7:00
function clockStr() {
  const h = (tmin / 60) | 0, m = tmin % 60 | 0;
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}
function shackOpen() { return tmin >= 8 * 60 && tmin < 20 * 60; }
function darkness() { // 0 = day, 1 = full night
  const t = tmin;
  if (t >= 5.5 * 60 && t < 7 * 60) return 1 - (t - 5.5 * 60) / 90;
  if (t >= 7 * 60 && t < 18.5 * 60) return 0;
  if (t >= 18.5 * 60 && t < 20.5 * 60) return (t - 18.5 * 60) / 120;
  return 1;
}

// ---------------------------------------------------------------- recipes
const INGREDIENT_COST = { fish_raw: 5, fruit: 3 };
const ITEM_NAMES = {
  fish_raw: "FISH", fish_cut: "CUT FISH", fruit: "FRUIT",
  taco: "FISH TACO", juice: "JUICE", plate_fish: "GRILL FISH",
};
const RECIPES = [
  { id: "taco", icon: "taco", pay: 14, raw: "fish_raw",
    steps: [["board", 3.0, "fish_cut"], ["grill", 4.0, "taco"]] },
  { id: "juice", icon: "juice", pay: 8, raw: "fruit",
    steps: [["board", 2.5, "juice"]] },
  { id: "fish", icon: "plate_fish", pay: 10, raw: "fish_raw",
    steps: [["grill", 5.0, "plate_fish"]] },
];

// ---------------------------------------------------------------- upgrades
const UPS = {
  chef:   { name: "HIRE CRAB", base: 80, mult: 2.4, max: 6, lvl: 2 },
  shoes:  { name: "SHOES",     base: 25, mult: 1.7, max: 8, lvl: 0 },
  knife:  { name: "KNIFE",     base: 30, mult: 1.7, max: 8, lvl: 0 },
  flame:  { name: "FLAME",     base: 30, mult: 1.7, max: 8, lvl: 0 },
  expand: { name: "EXPAND",    base: 90, mult: 2.6, max: 2, lvl: 0 },
  ads:    { name: "ADS",       base: 45, mult: 1.9, max: 8, lvl: 0 },
};
for (const k in UPS) UPS[k].key = k;
function upCost(u) { return Math.ceil(u.base * Math.pow(u.mult, u.key === "chef" ? u.lvl - 2 : u.lvl)); }
const chopMult = () => 1 / (1 + 0.22 * UPS.knife.lvl);
const cookMult = () => 1 / (1 + 0.22 * UPS.flame.lvl);
const stationCap = (k) => (k === "board" || k === "grill") ? 1 + UPS.expand.lvl : 1;
const spawnEvery = () => 7.5 / (1 + 0.35 * UPS.ads.lvl);
const shoesMult = () => 1 + 0.12 * UPS.shoes.lvl;

// ---------------------------------------------------------------- state
let coins = 0, lifetime = 0, time = 0;
let crabs = [], customers = [], floaters = [];
let spawnT = 3, toast = null, soundOn = true;
let camX = 300, followIdx = -1, tab = "crew";
let lastRentDay = 0, gameOver = false, newConfirmT = 0;
let screen = "title", hasSave = false, wiping = false;
function newGame() { wiping = true; localStorage.removeItem(SAVE_KEY); location.reload(); }
const CRAB_WAGE = 18, HOUSE_RENT = 8;
function rentAmount() { return day <= 1 ? 0 : 100 + 3 * (day - 2); }
function nightlyDue() { return rentAmount() + CRAB_WAGE * crabs.length; }
const busy = { board: [false, false, false], grill: [false, false, false] };
const bus = { x: 360, dir: 1, state: "drive", dwellT: 0, riders: [] };
let earnHist = [];

const CRAB_ARTS = CRAB_COLORS.map(c => crabArt(c[0], c[1]));
const TOURIST_ARTS = TOURIST_STYLES.map(touristArt);
const HOUSES = CRAB_COLORS.map(c => houseArt(c[0]));
const BUGGIES = CRAB_COLORS.map(c => buggyArt(c[0]));

function scale2(art) {
  const c = document.createElement("canvas");
  c.width = art.w * 2; c.height = art.h * 2;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  x.drawImage(art.cv, 0, 0, art.w * 2, art.h * 2);
  return { cv: c, fv: c, w: art.w * 2, h: art.h * 2 };
}
const HOUSES2 = HOUSES.map(scale2);
const SHELTER2 = scale2(SHELTER);
const BUS2 = scale2(BUS);
const BUGGIES2 = BUGGIES.map(scale2);

function homeX(c) {
  if (c.p.homeless) return SHELTER_X + 16 + (Math.max(0, crabs.indexOf(c)) % 3) * 12;
  return HOUSE_XS[c.p.house] + 28;
}

function newCrab(persona) {
  if (persona.wallet == null) persona.wallet = 10;
  return {
    p: persona,
    x: homeX({ p: persona }), flip: false, hidden: false, animT: Math.random() * 9,
    dayState: "home", cstate: "", target: 0, busStop: -1,
    duty: false, pendingOff: false, pauseT: 0,
    // kitchen fields
    kstate: "idle", cust: null, carrying: null, stepIdx: 0,
    workT: 0, workMax: 0, slot: -1, slotKind: null,
    quip: null, quipT: 8 + Math.random() * 15,
  };
}
function crabMove(c) {
  const t = TRAITS[c.p.trait];
  return 40 * t.move * shoesMult();
}
function crabWork(c) { return TRAITS[c.p.trait].work; }

// ---------------------------------------------------------------- sound (from CS1)
const PLAYLIST = [
  { src: "music/pixel-wave-waltz.mp3", name: "PIXEL WAVE WALTZ" },
  { src: "music/regalia-of-the-surf.mp3", name: "REGALIA OF THE SURF" },
  { src: "music/regalia-waltz.mp3", name: "REGALIA WALTZ" },
  { src: "music/butter-pow.mp3", name: "BUTTER POW" },
  { src: "music/carnival-of-the-glitch.mp3", name: "CARNIVAL OF THE GLITCH" },
];
let musicOn = true, music = null;
let trackIdx = (Math.random() * PLAYLIST.length) | 0;
function playTrack(i) {
  if (music) { music.pause(); music = null; }
  trackIdx = ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
  const t = PLAYLIST[trackIdx];
  music = new Audio(t.src);
  music.volume = 0.55;
  music.addEventListener("ended", () => { music = null; if (musicOn) playTrack(trackIdx + 1); });
  music.play().then(() => { toast = { text: "NOW PLAYING: " + t.name, t: 4 }; })
    .catch(() => { music = null; });
}
function startMusic() { if (!music && musicOn) playTrack(trackIdx); }
function toggleMusic() {
  musicOn = !musicOn;
  if (!musicOn && music) { music.pause(); music = null; } else if (musicOn) startMusic();
}
let AC = null;
function beep(freq, dur, type, vol, when) {
  if (!soundOn) return;
  if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const t = AC.currentTime + (when || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || "square"; o.frequency.value = freq;
  g.gain.setValueAtTime(vol || 0.04, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur);
}
const sfx = {
  coin: () => { beep(880, .08); beep(1320, .12, "square", .04, .07); },
  buy: () => { beep(520, .06); beep(700, .08, "square", .04, .05); },
  angry: () => { beep(220, .15, "sawtooth", .03); beep(160, .2, "sawtooth", .03, .12); },
  ding: () => beep(1560, .1, "triangle", .05),
  bus: () => beep(300, .2, "triangle", .04),
};

// ---------------------------------------------------------------- economy
function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function popText(txt, x, y, color) {
  floaters.push({ x, y, t: 1.6, text: txt, color: color || [255, 255, 255] });
}
function earn(amt, x, y) {
  coins += amt; lifetime += amt;
  earnHist.push({ t: time, amt });
  popText("+$" + Math.floor(amt), x, y, [255, 230, 120]);
  sfx.coin();
}
function expense(amt, x, y, label) {
  coins -= amt;
  earnHist.push({ t: time, amt: -amt });   // income rate is net
  popText("-$" + amt + (label ? " " + label : ""), x, y, [255, 120, 120]);
}
function incomeRate() {
  while (earnHist.length && earnHist[0].t < time - 60) earnHist.shift();
  if (!earnHist.length) return 0;
  return earnHist.reduce((s, e) => s + e.amt, 0) / Math.max(10, time - earnHist[0].t);
}

// ---------------------------------------------------------------- save
const SAVE_KEY = "crabshack2_v1";
const FRESH = location.search.includes("fresh");
const TURBO = Math.max(1, parseInt((location.search.match(/turbo=(\d+)/) || [0, 1])[1]) || 1);
function save() {
  if (FRESH || wiping) return;
  const lv = {}; for (const k in UPS) lv[k] = UPS[k].lvl;
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    coins, lifetime, lv, day, tmin, lastRentDay, rate: incomeRate(), t: Date.now(),
    personas: crabs.map(c => c.p),
  }));
}
function load() {
  if (FRESH) return false;
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  if (!s) return false;
  coins = s.coins || 0; lifetime = s.lifetime || 0;
  day = s.day || 1; tmin = s.tmin != null ? s.tmin : 7 * 60;
  lastRentDay = s.lastRentDay || 0;
  for (const k in UPS) if (s.lv && s.lv[k] != null) UPS[k].lvl = s.lv[k];
  if (s.personas) crabs = s.personas.map(newCrab);
  const away = (Date.now() - (s.t || Date.now())) / 1000;
  if (away > 60 && s.rate > 0) {
    const gain = Math.floor(s.rate * Math.min(away, 8 * 3600) * 0.5);
    if (gain > 0) { coins += gain; lifetime += gain; toast = { text: "WELCOME BACK! THE CRABS MADE $" + fmt(gain), t: 7 }; }
  }
  return true;
}

// ---------------------------------------------------------------- quips
function quipContext(c) {
  if (c.dayState === "working") return "work";
  if (c.dayState === "home") return "home";
  return "commute";
}
function maybeQuip(c, dt) {
  if (c.quip) { c.quip.t -= dt; if (c.quip.t <= 0) c.quip = null; }
  c.quipT -= dt;
  if (c.quipT <= 0 && !c.hidden) {
    const isNight = darkness() > 0.7 && c.dayState === "home";
    let lines = isNight ? ["ZZZ..."] : TRAITS[c.p.trait].quips[quipContext(c)];
    if (c.p.homeless && quipContext(c) === "home" && !isNight)
      lines = ["SAVING FOR A PLACE", "SHELTER SOUP AGAIN", "I'LL BOUNCE BACK"];
    c.quip = { text: lines[(Math.random() * lines.length) | 0], t: 2.6 };
    c.quipT = 14 + Math.random() * 18;
  }
}

// ---------------------------------------------------------------- commute
function nearestStop(x) { return Math.abs(x - BUS_STOPS[0]) < Math.abs(x - BUS_STOPS[1]) ? 0 : 1; }
function commuteGmin(c) {
  const dist = Math.abs(SHACK_DOOR - homeX(c));
  const m = c.p.mode;
  if (m === "bus") return 100;                       // walk + wait + ride, rough
  return dist / (MODES[m].speed * TRAITS[c.p.trait].move * shoesMult()) * TS + 12;
}
function leaveGmin(c) {
  const late = TRAITS[c.p.trait].lateMin || 0;
  return SHIFTS[c.p.shift].start - commuteGmin(c) - 20 + late;
}

function stepTo(c, target, speed, dt) {
  const d = target - c.x;
  if (Math.abs(d) <= 2) { c.x = target; return true; }
  c.flip = d < 0;
  c.x += Math.sign(d) * speed * dt;
  return false;
}

function startCommute(c, toWork) {
  c.dayState = toWork ? "toWork" : "toHome";
  const m = c.p.mode;
  if (m === "bus") { c.cstate = "walkToStop"; c.busStop = toWork ? 0 : 1; }
  else if (m === "walk") c.cstate = "travel";
  else c.cstate = toWork ? "drive" : "walkToVehicle";  // bike/buggy parked at work
}

function updateCommute(c, dt) {
  const toWork = c.dayState === "toWork";
  const dest = toWork ? SHACK_DOOR : homeX(c);
  const m = c.p.mode, tr = TRAITS[c.p.trait];
  const wspd = crabMove(c), vspd = MODES[m].speed * tr.move * shoesMult();

  if (tr.pauses && c.pauseT <= 0 && Math.random() < dt * 0.06) c.pauseT = 1.3;
  if (c.pauseT > 0) { c.pauseT -= dt; return; }

  if (c.cstate === "travel") {           // walking the whole way
    if (stepTo(c, dest, wspd, dt)) arriveCommute(c, toWork);
  } else if (c.cstate === "drive") {     // bike/buggy: ride to park spot, walk rest
    const park = toWork ? (m === "buggy" ? PARK_X + c.p.house * 18 : RACK_X + c.p.house * 7) : homeX(c);
    if (stepTo(c, park, vspd, dt)) {
      if (toWork) { c.cstate = "walkFromPark"; }
      else arriveCommute(c, false);
    }
  } else if (c.cstate === "walkFromPark") {
    if (stepTo(c, dest, wspd, dt)) arriveCommute(c, true);
  } else if (c.cstate === "walkToVehicle") {   // heading home: fetch parked ride
    const park = m === "buggy" ? PARK_X + c.p.house * 18 : RACK_X + c.p.house * 7;
    if (stepTo(c, park, wspd, dt)) c.cstate = "drive";
  } else if (c.cstate === "walkToStop") {
    if (stepTo(c, BUS_STOPS[c.busStop], wspd, dt)) c.cstate = "waitBus";
  } else if (c.cstate === "waitBus") {
    if (bus.state === "dwell" && Math.abs(bus.x + BUS2.w / 2 - BUS_STOPS[c.busStop]) < 6) {
      c.hidden = true; c.cstate = "onBus"; c.busStop = toWork ? 1 : 0; sfx.bus();
    }
  } else if (c.cstate === "onBus") {
    c.x = bus.x + BUS2.w / 2;
    if (bus.state === "dwell" && Math.abs(bus.x + BUS2.w / 2 - BUS_STOPS[c.busStop]) < 6) {
      c.hidden = false; c.x = BUS_STOPS[c.busStop]; c.cstate = "walkOff";
    }
  } else if (c.cstate === "walkOff") {
    if (stepTo(c, dest, wspd, dt)) arriveCommute(c, toWork);
  }
}

function arriveCommute(c, atWork) {
  if (atWork) { c.dayState = "working"; c.duty = true; c.kstate = "idle"; }
  else { c.dayState = "home"; }
}

function updateBus(dt) {
  if (bus.state === "dwell") {
    bus.dwellT -= dt;
    if (bus.dwellT <= 0) { bus.state = "drive"; bus.passed = false; }
    return;
  }
  bus.x += bus.dir * 100 * dt;
  const cx = bus.x + BUS2.w / 2;
  for (const s of BUS_STOPS) {
    if (Math.abs(cx - s) < 3 && bus.lastStop !== s) {
      bus.state = "dwell"; bus.dwellT = 2.0; bus.lastStop = s;
      bus.x = s - BUS2.w / 2;
      return;
    }
  }
  if (cx > BUS_TERMINUS[1] + 40) { bus.dir = -1; bus.lastStop = -1; }
  if (cx < BUS_TERMINUS[0] - 40) { bus.dir = 1; bus.lastStop = -1; }
}

// ---------------------------------------------------------------- day schedule
function updateSchedule(c) {
  const sh = SHIFTS[c.p.shift];
  if (c.dayState === "home" && tmin >= leaveGmin(c) && tmin < sh.end - 30 && shackNeeds(c)) {
    startCommute(c, true);
  }
  if (c.dayState === "working" && tmin >= sh.end) c.pendingOff = true;
  if (c.dayState === "working" && c.pendingOff && c.kstate === "idle") {
    c.duty = false; c.pendingOff = false;
    if (c.carrying) c.carrying = null;
    startCommute(c, false);
  }
}
function shackNeeds(c) { return true; }

// ---------------------------------------------------------------- kitchen (CS1 port)
function stationSlotX(kind, slot) { return (STX[kind][slot] != null ? STX[kind][slot] : STX[kind][0]) + 2; }
function tryAcquire(kind) {
  const cap = stationCap(kind);
  for (let i = 0; i < cap; i++) if (!busy[kind][i]) { busy[kind][i] = true; return i; }
  return -1;
}
function release(c) {
  if (c.slotKind && c.slot >= 0) busy[c.slotKind][c.slot] = false;
  c.slot = -1; c.slotKind = null;
}
function abortChef(c) {
  if (c.kstate === "work") release(c);
  c.kstate = "idle"; c.cust = null; c.carrying = null; c.stepIdx = 0;
}
function updateKitchen(c, dt) {
  if (c.cust && (c.cust.state === "leaving" || c.cust.served)) { abortChef(c); return; }
  const spd = crabMove(c) * 1.1;
  if (c.kstate === "idle") {
    if (!c.pendingOff) {
      const o = customers.find(k => k.state === "waiting" && !k.claimed && !k.served);
      if (o) { o.claimed = true; c.cust = o; c.stepIdx = -1; c.kstate = "walk"; c.target = stationSlotX("crate", 0); return; }
    }
    c.target = SHACK_DOOR + 4 + (crabs.indexOf(c) % 3) * 10;
    stepTo(c, c.target, spd, dt);
  } else if (c.kstate === "walk") {
    if (stepTo(c, c.target, spd, dt)) {
      if (c.stepIdx === -1) {
        if (coins < INGREDIENT_COST[c.cust.recipe.raw]) { c.kstate = "waitCash"; return; }
        c.kstate = "work"; c.workMax = c.workT = 0.6; c.slotKind = null; c.slot = -1;
      }
      else if (c.stepIdx >= c.cust.recipe.steps.length) serve(c);
      else {
        const [kind] = c.cust.recipe.steps[c.stepIdx];
        const s = tryAcquire(kind);
        if (s < 0) c.kstate = "waitSlot";
        else { c.slotKind = kind; c.slot = s; c.target = stationSlotX(kind, s); c.kstate = "toSlot"; }
      }
    }
  } else if (c.kstate === "waitCash") {
    if (coins >= INGREDIENT_COST[c.cust.recipe.raw]) { c.kstate = "work"; c.workMax = c.workT = 0.6; c.slotKind = null; c.slot = -1; }
  } else if (c.kstate === "waitSlot") {
    const kind = c.cust.recipe.steps[c.stepIdx][0];
    const s = tryAcquire(kind);
    if (s >= 0) { c.slotKind = kind; c.slot = s; c.target = stationSlotX(kind, s); c.kstate = "toSlot"; }
  } else if (c.kstate === "toSlot") {
    if (stepTo(c, c.target, spd, dt)) {
      const [, secs] = c.cust.recipe.steps[c.stepIdx];
      const mult = (c.slotKind === "board" ? chopMult() : cookMult()) / crabWork(c);
      c.workMax = c.workT = secs * mult;
      c.kstate = "work";
    }
  } else if (c.kstate === "work") {
    c.workT -= dt;
    if (c.workT <= 0) {
      if (c.stepIdx === -1) {
        c.carrying = c.cust.recipe.raw;
        expense(INGREDIENT_COST[c.carrying], c.x, FLOOR_Y - 40);
      }
      else { c.carrying = c.cust.recipe.steps[c.stepIdx][2]; release(c); }
      popText(ITEM_NAMES[c.carrying] + "!", c.x - 8, FLOOR_Y - 28, [255, 255, 255]);
      c.stepIdx++;
      if (c.stepIdx >= c.cust.recipe.steps.length) { c.target = stationSlotX("pass", 0); c.kstate = "walk"; }
      else { c.target = STX[c.cust.recipe.steps[c.stepIdx][0]][0] + 2; c.kstate = "walk"; }
    }
  }
}
function serve(c) {
  const cust = c.cust;
  if (cust && cust.state === "waiting") {
    const tipMult = TRAITS[c.p.trait].tip;
    const tip = cust.recipe.pay * 0.5 * (cust.patience / cust.maxPatience) * tipMult;
    earn(cust.recipe.pay + tip, cust.x, 126);
    popText(ITEM_NAMES[cust.recipe.icon], cust.x - 14, 116, [140, 255, 160]);
    cust.served = true; cust.state = "leaving"; cust.happy = true; sfx.ding();
  }
  c.cust = null; c.carrying = null; c.kstate = "idle"; c.stepIdx = 0;
}

// ---------------------------------------------------------------- customers
function newCustomer() {
  const r = RECIPES[(Math.random() * RECIPES.length) | 0];
  return { recipe: r, art: TOURIST_ARTS[(Math.random() * TOURIST_ARTS.length) | 0],
    x: WORLD_W + 10, state: "arriving", patience: 50, maxPatience: 50,
    claimed: false, served: false };
}
function updateCustomers(dt) {
  let qi = 0;
  for (const k of customers) {
    if (k.state === "arriving" || k.state === "waiting") {
      const slot = QUEUE_X0 + (qi++) * QUEUE_DX;
      if (k.state === "arriving") {
        k.x -= 45 * dt;
        if (k.x <= slot) {
          k.x = slot; k.state = "waiting";
          popText(ITEM_NAMES[k.recipe.icon] + "?", k.x - 10, FLOOR_Y - 42, [255, 255, 255]);
        }
      } else {
        if (k.x > slot) k.x = Math.max(slot, k.x - 45 * dt);
        k.patience -= dt;
        if (k.patience <= 0) {
          k.state = "leaving"; k.happy = false; k.claimed = false;
          popText("!!", k.x, 120, [255, 80, 80]); sfx.angry();
        }
      }
    } else if (k.state === "leaving") k.x += (k.happy ? 50 : 75) * dt;
  }
  customers = customers.filter(k => k.x < WORLD_W + 20);
  spawnT -= dt;
  const anyDuty = crabs.some(c => c.duty);
  const inQueue = customers.filter(k => k.state !== "leaving").length;
  if (spawnT <= 0 && shackOpen() && anyDuty && inQueue < QUEUE_MAX) {
    customers.push(newCustomer());
    spawnT = spawnEvery() * (0.7 + Math.random() * 0.6);
  }
}

// ---------------------------------------------------------------- status text
function crabStatus(c) {
  if (c.dayState === "home") {
    if (darkness() > 0.7) return c.p.homeless ? "SLEEPING AT THE SHELTER" : "SLEEPING";
    return c.p.homeless ? "AT THE SHELTER" : "CHILLING AT HOME";
  }
  if (c.dayState === "working") {
    if (c.kstate === "work" && c.slotKind === "board") return "CHOPPING";
    if (c.kstate === "work" && c.slotKind === "grill") return "GRILLING";
    if (c.kstate === "work") return "GRABBING FOOD";
    if (c.carrying) return "CARRYING " + ITEM_NAMES[c.carrying];
    if (c.kstate === "waitCash") return "SHORT ON CASH!";
    if (c.kstate === "waitSlot") return "WAITING FOR A SPOT";
    return "ON SHIFT";
  }
  const toWork = c.dayState === "toWork";
  if (c.cstate === "waitBus") return "WAITING FOR THE BUS";
  if (c.cstate === "onBus") return "RIDING THE BUS";
  if (c.cstate === "walkToStop") return "WALKING TO THE BUS";
  if (c.cstate === "drive") return (c.p.mode === "bike" ? "BIKING" : "DRIVING") + (toWork ? " TO WORK" : " HOME");
  return (toWork ? "WALKING TO WORK" : "HEADING HOME");
}

// ---------------------------------------------------------------- input
const BUTTONS = [];
{
  const keys = ["chef", "shoes", "knife", "flame", "expand", "ads"];
  for (let i = 0; i < 6; i++)
    BUTTONS.push({ key: keys[i], x: 4 + (i % 3) * 84, y: 199 + ((i / 3) | 0) * 20, w: 80, h: 18 });
}
function tryBuy(key) {
  const u = UPS[key];
  if (u.lvl >= u.max || coins < upCost(u)) return;
  coins -= upCost(u); u.lvl++;
  if (key === "chef") {
    const p2 = makeCrabPersona(crabs.length + ((Math.random() * 6) | 0));
    const used = new Set(crabs.filter(k => !k.p.homeless).map(k => k.p.house));
    p2.homeless = true;
    for (let h = 0; h < HOUSE_XS.length; h++) if (!used.has(h)) { p2.house = h; p2.homeless = false; break; }
    const c = newCrab(p2);
    c.x = homeX(c);
    crabs.push(c);
    popText(c.p.name + " JOINS THE CREW!", c.x - 20, FLOOR_Y - 30, [140, 255, 160]);
  }
  sfx.buy(); save();
}

let dragging = false, dragStartX = 0, dragCamX = 0, dragMoved = false;
cv.addEventListener("mousedown", (ev) => {
  const p = evPos(ev);
  if (p.y < PANEL_Y) { dragging = true; dragStartX = p.x; dragCamX = camX; dragMoved = false; }
});
addEventListener("mousemove", (ev) => {
  if (!dragging) return;
  const p = evPos(ev);
  if (Math.abs(p.x - dragStartX) > 4) { dragMoved = true; followIdx = -1; }
  if (dragMoved) camX = clampCam(dragCamX - (p.x - dragStartX));
});
addEventListener("mouseup", () => { dragging = false; });
function evPos(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * (cv.width / r.width), y: (ev.clientY - r.top) * (cv.height / r.height) };
}
function clampCam(x) { return Math.max(0, Math.min(WORLD_W - W, x)); }

cv.addEventListener("click", (ev) => {
  if (screen === "title") {
    const p = evPos(ev);
    const bx = W / 2 - 50;
    if (p.x >= bx && p.x < bx + 100) {
      if (hasSave && p.y >= 118 && p.y < 134) { screen = "play"; startMusic(); sfx.ding(); return; }
      const ny = hasSave ? 138 : 122;
      if (p.y >= ny && p.y < ny + 16) {
        if (!hasSave || newConfirmT > 0) { hasSave ? newGame() : (screen = "play", startMusic(), sfx.ding()); }
        else { newConfirmT = 3; sfx.buy(); }
        return;
      }
    }
    return;
  }
  if (gameOver) { newGame(); return; }
  startMusic();
  const p = evPos(ev);
  if (dragMoved) return;
  // panel
  if (p.y >= PANEL_Y) {
    if (p.x > 212 && p.y < 188) { soundOn = !soundOn; if (soundOn) sfx.ding(); return; }
    if (p.x > 168 && p.x <= 212 && p.y < 188) { toggleMusic(); return; }
    if (p.y >= 187 && p.y < 197) {
      if (p.x >= 4 && p.x < 36) { tab = "crew"; return; }
      if (p.x >= 38 && p.x < 70) { tab = "shop"; return; }
      if (p.x >= 128 && p.x < 158) {
        if (newConfirmT > 0) newGame();
        else { newConfirmT = 3; sfx.buy(); }
        return;
      }
    }
    if (tab === "shop") {
      for (const b of BUTTONS)
        if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) { tryBuy(b.key); return; }
    } else {
      for (let i = 0; i < crabs.length; i++) {
        const bx = 4 + i * 27;
        if (p.x >= bx && p.x < bx + 24 && p.y >= 199 && p.y < 223) {
          followIdx = followIdx === i ? -1 : i; return;
        }
      }
    }
    return;
  }
  // world: click a crab to follow it
  const wx = p.x + camX;
  for (let i = 0; i < crabs.length; i++) {
    const c = crabs[i];
    if (!c.hidden && Math.abs(wx - (c.x + 8)) < 12 && p.y > FLOOR_Y - 26 && p.y < FLOOR_Y + 4) {
      followIdx = i; return;
    }
  }
});
addEventListener("keydown", (e) => {
  if (e.key === "m") soundOn = !soundOn;
  if (e.key === "n") toggleMusic();
  if (e.key === "b" && musicOn) playTrack(trackIdx + 1);   // next track
  if (e.key === "ArrowLeft") { camX = clampCam(camX - 24); followIdx = -1; }
  if (e.key === "ArrowRight") { camX = clampCam(camX + 24); followIdx = -1; }
  if (e.key === "Escape") followIdx = -1;
});

// ---------------------------------------------------------------- drawing
const _bigCache = {};
function bigText(c2, s, x, y, color, scale, shadow) {
  const key = s + "#" + color.join() + "#" + scale;
  let cv2 = _bigCache[key];
  if (!cv2) {
    cv2 = document.createElement("canvas");
    cv2.width = textWidth(s) + 2; cv2.height = 9;
    const cx3 = cv2.getContext("2d");
    if (shadow) text(cx3, s, 1, 1, shadow);
    text(cx3, s, 0, 0, color);
    _bigCache[key] = cv2;
  }
  c2.imageSmoothingEnabled = false;
  c2.drawImage(cv2, x | 0, y | 0, cv2.width * scale, cv2.height * scale);
}
const SKY = [[110, 190, 255], [130, 200, 255], [160, 215, 255], [190, 230, 255]];
const STARS = [];
for (let i = 0; i < 40; i++) STARS.push([(i * 61 + 17) % 256, (i * 37 + 5) % 52]);

function wblit(art, wx, y, flip) {
  const x = wx - camX;
  if (x + art.w < 0 || x > W) return;
  blit(ctx, art, x, y, flip);
}
function wrect(wx, y, w, h, color) {
  rect(ctx, wx - camX, y, w, h, color);
}

function drawBG() {
  for (let i = 0; i < 4; i++) rect(ctx, 0, i * 15, W, 15, SKY[i]);
  const dark = darkness();
  // sun / moon (screen fixed)
  if (dark < 0.5) {
    rect(ctx, 16, 8, 14, 14, [255, 240, 160]); rect(ctx, 18, 6, 10, 18, [255, 240, 160]);
    rect(ctx, 14, 10, 18, 10, [255, 240, 160]); rect(ctx, 19, 9, 8, 12, [255, 255, 220]);
  } else {
    blit(ctx, MOON, 20, 8);
    for (const s of STARS) px(ctx, s[0], s[1], [220, 230, 255]);
  }
  // clouds (parallax)
  blit(ctx, CLOUD, ((time * 4 - camX * 0.4) % 320 + 320) % 320 - 30, 12);
  blit(ctx, CLOUD, ((time * 2.5 - camX * 0.3 + 160) % 320 + 320) % 320 - 30, 30);
  const gt = time % 24;
  if (gt < 12 && dark < 0.5) blit(ctx, GULL[((time * 4) | 0) % 2], 256 - gt * 24, 22 + Math.sin(time * 2) * 3);
  // ocean (screen fixed)
  rect(ctx, 0, SKY_H, W, SHORE_Y - SKY_H, [40, 140, 220]);
  for (let y = SKY_H + 2; y < SHORE_Y; y += 5)
    for (let x = -8; x < W; x += 24) {
      const off = ((Math.sin(time * 1.3 + y) * 8) | 0) + ((y * 7) % 13);
      rect(ctx, x + off, y, 10, 1, [96, 200, 255]);
    }
  const f = (Math.sin(time * 0.9) * 3) | 0;
  rect(ctx, 0, SHORE_Y - 3 + Math.max(0, f), W, 2, [230, 250, 255]);
  // sand (world)
  rect(ctx, 0, SHORE_Y, W, PANEL_Y - SHORE_Y, [246, 222, 170]);
  for (let i = 0; i < 90; i++) {
    const sx = (i * 47 + 13) % WORLD_W, sy = SHORE_Y + 4 + (i * 31) % (PANEL_Y - SHORE_Y - 10);
    if (sx - camX > -2 && sx - camX < W) px(ctx, sx - camX, sy, [226, 198, 140]);
  }
}

function drawTown() {
  // road
  wrect(0, ROAD_Y0, ROAD_END, ROAD_Y1 - ROAD_Y0, [120, 116, 130]);
  wrect(0, ROAD_Y0, ROAD_END, 2, [90, 86, 100]);
  wrect(0, ROAD_Y1 - 2, ROAD_END, 2, [90, 86, 100]);
  for (let x = 6; x < ROAD_END; x += 22) wrect(x, ROAD_Y0 + 10, 10, 2, [230, 220, 120]);
  // houses (owned ones get the owner's roof color; empty lots stay bare sand)
  for (const c of crabs)
    if (!c.p.homeless) wblit(HOUSES2[c.p.color % HOUSES2.length], HOUSE_XS[c.p.house], ROAD_Y0 - HOUSES2[0].h);
  // the crab shelter
  wblit(SHELTER2, SHELTER_X, ROAD_Y0 - SHELTER2.h);
  if (SHELTER_X - camX > -80 && SHELTER_X - camX < W)
    text(ctx, "SHELTER", SHELTER_X + 14 - camX, ROAD_Y0 - SHELTER2.h - 7, [230, 220, 200], 4);
  // bus stops
  for (const s of BUS_STOPS) wblit(BUS_STOP, s - 3, ROAD_Y1 + 2);
  // scenery
  wblit(PALM, 415, 96); wblit(PALM, 545, 92, true); wblit(PALM, 930, 96); wblit(PALM, 985, 100, true);
  wblit(UMBRELLA, 890, SHORE_Y - 4); wblit(UMBRELLA, 470, SHORE_Y - 2);
  // parked vehicles
  for (const c of crabs) {
    if (c.dayState !== "working") continue;
    if (c.p.mode === "buggy") wblit(BUGGIES2[c.p.color], PARK_X + c.p.house * 18, ROAD_Y1 - BUGGIES2[0].h);
    if (c.p.mode === "bike") wblit(BIKE, RACK_X + c.p.house * 7 - 4, FLOOR_Y - 10);
  }
  // shack: palapa roof + posts + sign
  wrect(SHACK_X0, 88, SHACK_X1 - SHACK_X0, 2, [246, 214, 140]);
  wrect(SHACK_X0, 90, SHACK_X1 - SHACK_X0, 6, [230, 190, 110]);
  wrect(SHACK_X0, 96, SHACK_X1 - SHACK_X0, 2, [200, 160, 90]);
  for (let x = SHACK_X0; x < SHACK_X1; x += 5) {
    wrect(x + 1, 92, 1, 4, [200, 160, 90]);
    wrect(x, 98, 3, 2 + ((x * 7) % 3), [230, 190, 110]);
  }
  wrect(SHACK_X0 + 2, 99, 3, 42, [140, 90, 50]);
  wrect(SHACK_X1 - 6, 99, 3, 42, [140, 90, 50]);
  const signX = (SHACK_X0 + SHACK_X1) / 2 - 43;
  wrect(signX, 76, 86, 11, [140, 90, 50]);
  wrect(signX + 1, 77, 84, 9, [190, 140, 80]);
  if (signX + 86 - camX > 0 && signX - camX < W)
    textShadow(ctx, "CRAB SHACK 2", signX + 7 - camX, 78, [255, 250, 240], [90, 50, 30]);
  if (!shackOpen()) {
    wrect(signX + 20, 104, 46, 11, [30, 20, 36]);
    if (signX - camX < W) text(ctx, "CLOSED", signX + 25 - camX, 106, [255, 120, 120]);
  }
  // stations
  wblit(CRATE, STX.crate[0], STATION_BOTTOM - CRATE.h);
  for (let i = 0; i < stationCap("board"); i++) wblit(BOARD, STX.board[i], STATION_BOTTOM - BOARD.h);
  for (let i = 0; i < stationCap("grill"); i++) {
    wblit(GRILL, STX.grill[i], STATION_BOTTOM - GRILL.h);
    if (busy.grill[i]) wblit(FLAME[((time * 8) | 0) % 2], STX.grill[i] + 6, STATION_BOTTOM - GRILL.h - 4);
  }
  wblit(PASS, STX.pass[0], STATION_BOTTOM - PASS.h);
}

function drawBus() {
  wblit(BUS2, bus.x, ROAD_Y1 - BUS2.h - 1, bus.dir < 0);
}

function drawCrab(c) {
  if (c.hidden) return;
  const arts = CRAB_ARTS[c.p.color];
  const riding = (c.cstate === "drive");
  if (riding && c.p.mode === "buggy") {
    wblit(BUGGIES2[c.p.color], c.x - 16, ROAD_Y1 - BUGGIES2[0].h, c.flip);
    return;
  }
  const working = c.kstate === "work" && c.dayState === "working";
  const moving = c.dayState !== "home" || Math.abs((c.target || c.x) - c.x) > 2;
  let art;
  if (working) art = ((c.animT * 6) | 0) % 2 ? arts.w : arts.a;
  else if (moving) art = ((c.animT * 8) | 0) % 2 ? arts.a : arts.b;
  else art = arts.a;
  const bob = working ? -(((c.animT * 6) | 0) % 2) : 0;
  let y = FLOOR_Y - 12 + bob;
  if (riding && c.p.mode === "bike") {
    wblit(BIKE, c.x - 2, ROAD_Y1 - 8, c.flip);
    y = ROAD_Y1 - 8 - 11;
    wblit(art, c.x, y, c.flip);
  } else {
    wblit(art, c.x, y, c.flip);
  }
  // hat: toque on duty, personal accessory otherwise
  const accKey = c.duty ? "toque" : c.p.acc;
  const acc = ACCESSORIES[accKey];
  if (acc) {
    const ax = c.flip ? 16 - acc.dx - acc.art.w : acc.dx;
    wblit(acc.art, c.x + ax, y + acc.dy, c.flip);
  }
  if (c.carrying) wblit(ITEMS[c.carrying], c.x + 4, y - 7);
  if (working && c.workMax > 0.7) {
    const frac = 1 - c.workT / c.workMax;
    wrect(c.x, y - 10, 16, 3, [30, 20, 36]);
    wrect(c.x + 1, y - 9, Math.round(14 * frac), 1, [96, 232, 120]);
  }
  // quip bubble
  if (c.quip) {
    const tw = textWidth(c.quip.text) + 6;
    let bx = c.x + 8 - tw / 2 - camX;
    bx = Math.max(1, Math.min(bx, W - tw - 1));
    const by = y - 22;
    rect(ctx, bx, by, tw, 11, [30, 20, 36]);
    rect(ctx, bx + 1, by + 1, tw - 2, 9, [255, 255, 255]);
    rect(ctx, c.x + 6 - camX, by + 11, 2, 2, [255, 255, 255]);
    text(ctx, c.quip.text, bx + 3, by + 2, [40, 30, 40]);
  }
}

function drawCustomers() {
  for (const k of customers) {
    wblit(k.art, k.x, FLOOR_Y - 19, k.state !== "leaving");
    if (k.state === "waiting" && !k.served) {
      const bx = k.x - camX - 1, by = FLOOR_Y - 36;
      if (bx > -16 && bx < W) {
        rect(ctx, bx, by, 14, 13, [30, 20, 36]);
        rect(ctx, bx + 1, by + 1, 12, 11, [255, 255, 255]);
        rect(ctx, bx + 5, by + 13, 2, 2, [255, 255, 255]);
        blit(ctx, ITEMS[k.recipe.icon], bx + 2, by + 2);
        const frac = k.patience / k.maxPatience;
        const col = frac > 0.5 ? [96, 232, 120] : frac > 0.25 ? [255, 216, 96] : [255, 80, 80];
        rect(ctx, bx, by - 4, 14, 3, [30, 20, 36]);
        rect(ctx, bx + 1, by - 3, Math.round(12 * frac), 1, col);
      }
    }
  }
}

function drawNight() {
  const dark = darkness();
  if (dark <= 0) return;
  ctx.fillStyle = `rgba(16,20,64,${0.45 * dark})`;
  ctx.fillRect(0, 0, W, PANEL_Y);
  // string lights on the shack at night
  if (dark > 0.4) {
    for (let x = SHACK_X0 + 4; x < SHACK_X1; x += 10) {
      const c = [[255, 120, 120], [255, 220, 120], [120, 255, 160], [130, 180, 255]][((x / 10) | 0) % 4];
      const sx = x - camX;
      if (sx > 0 && sx < W) rect(ctx, sx, 101 + ((x / 10) | 0) % 2, 2, 2, c);
    }
  }
}

function drawFollowCard() {
  if (followIdx < 0 || !crabs[followIdx]) return;
  const c = crabs[followIdx], p = c.p;
  const wcard = 128;
  rect(ctx, 2, 2, wcard, 34, [30, 20, 36]);
  rect(ctx, 3, 3, wcard - 2, 32, [255, 250, 235]);
  rect(ctx, 5, 6, 20, 26, [200, 230, 245]);
  blit(ctx, CRAB_ARTS[p.color].a, 7, 14);
  const acc = ACCESSORIES[c.duty ? "toque" : p.acc];
  if (acc) blit(ctx, acc.art, 7 + acc.dx, 14 + acc.dy);
  text(ctx, p.name, 29, 5, [40, 30, 40]);
  text(ctx, TRAITS[p.trait].label + " " + MODES[p.mode].label, 29, 13, [120, 90, 60], 5);
  text(ctx, crabStatus(c), 29, 21, [30, 110, 60], 5);
  text(ctx, "SHIFT " + SHIFTS[p.shift].label, 29, 28, [110, 110, 130], 4);
  const wTxt = "$" + fmt(Math.max(0, p.wallet));
  text(ctx, wTxt, 126 - textWidth(wTxt, 4), 28, p.homeless ? [190, 80, 80] : [140, 110, 40], 4);
}

function drawPanel() {
  rect(ctx, 0, PANEL_Y, W, H - PANEL_Y, [58, 42, 38]);
  rect(ctx, 0, PANEL_Y, W, 1, [120, 90, 70]);
  blit(ctx, COIN, 4, PANEL_Y + 2);
  textShadow(ctx, "$" + fmt(coins), 13, PANEL_Y + 2, [255, 230, 120], [30, 20, 20]);
  text(ctx, "D" + day + " " + clockStr(), 84, PANEL_Y + 2, [220, 210, 190]);
  text(ctx, "MUS", 169, PANEL_Y + 2, musicOn ? [140, 220, 140] : [140, 120, 110], 5);
  text(ctx, "SND", 213, PANEL_Y + 2, soundOn ? [140, 220, 140] : [140, 120, 110], 5);
  // tabs
  for (const [i, t] of [["crew", 0], ["shop", 1]].map((v, i) => [i, v[0]])) {
    const x = 4 + i * 34, active = tab === t;
    rect(ctx, x, 187, 32, 10, active ? [190, 140, 80] : [90, 70, 60]);
    text(ctx, t.toUpperCase(), x + 4, 189, active ? [40, 24, 16] : [160, 140, 130], 5);
  }
  const rate = incomeRate();
  text(ctx, "$" + rate.toFixed(1) + "/S", 84, 189, [170, 150, 135], 5);
  {
    const conf = newConfirmT > 0;
    rect(ctx, 128, 187, 30, 10, conf ? [140, 40, 40] : [90, 70, 60]);
    text(ctx, conf ? "SURE?" : "NEW", 128 + (conf ? 3 : 7), 189, conf ? [255, 200, 200] : [160, 140, 130], 5);
  }
  const due = nightlyDue();
  const rTxt = "DUE 20:00 $" + fmt(due);
  text(ctx, rTxt, 252 - textWidth(rTxt, 4), 189, coins < due ? [255, 120, 120] : [170, 150, 135], 4);

  if (tab === "shop") {
    for (const b of BUTTONS) {
      const u = UPS[b.key];
      const maxed = u.lvl >= u.max, cost = upCost(u);
      const afford = coins >= cost && !maxed;
      rect(ctx, b.x, b.y, b.w, b.h, [30, 20, 20]);
      rect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, afford ? [190, 140, 80] : [96, 78, 68]);
      const nameCol = afford ? [40, 24, 16] : [160, 145, 135];
      const lvl = b.key === "chef" ? String(u.lvl) : (u.lvl > 0 ? String(u.lvl) : "");
      text(ctx, u.name + (lvl ? " " + lvl : ""), b.x + 3, b.y + 2, nameCol, 5);
      text(ctx, maxed ? "MAX" : "$" + fmt(cost), b.x + 3, b.y + 10, maxed ? [160, 145, 135] : afford ? [80, 45, 20] : [140, 125, 115], 5);
    }
  } else {
    for (let i = 0; i < crabs.length; i++) {
      const c = crabs[i], bx = 4 + i * 27;
      const sel = followIdx === i;
      rect(ctx, bx, 199, 24, 24, sel ? [255, 230, 120] : [30, 20, 20]);
      rect(ctx, bx + 1, 200, 22, 22, [200, 230, 245]);
      blit(ctx, CRAB_ARTS[c.p.color].a, bx + 4, 206);
      const acc = ACCESSORIES[c.duty ? "toque" : c.p.acc];
      if (acc) blit(ctx, acc.art, bx + 4 + acc.dx, 206 + acc.dy);
      rect(ctx, bx + 18, 201, 4, 4, c.duty ? [96, 232, 120] : [150, 140, 140]);
      text(ctx, c.p.name.slice(0, 5), bx + 1, 224, [220, 210, 190], 5);
    }
    if (!crabs.length) text(ctx, "NO CREW YET", 8, 206, [190, 170, 150]);
  }
}

function drawFloaters(dt) {
  for (const f of floaters) {
    f.t -= dt; f.y -= 14 * dt;
    const fx = Math.max(2, Math.min(f.x - camX, W - textWidth(f.text) - 2));
    if (fx > -60 && fx < W) textShadow(ctx, f.text, fx, f.y, f.color, [30, 20, 36]);
  }
  floaters = floaters.filter(f => f.t > 0);
}
function drawTitle() {
  ctx.fillStyle = "rgba(16,20,50,0.35)";
  ctx.fillRect(0, 0, W, H);
  rect(ctx, 0, PANEL_Y, W, H - PANEL_Y, [58, 42, 38]);
  // logo card
  const lw = 168;
  rect(ctx, W / 2 - lw / 2 - 2, 26, lw + 4, 62, [30, 20, 36]);
  rect(ctx, W / 2 - lw / 2, 28, lw, 58, [255, 250, 235]);
  bigText(ctx, "CRAB SHACK", W / 2 - textWidth("CRAB SHACK"), 34, [230, 72, 88], 2, [120, 30, 40]);
  bigText(ctx, "2", W / 2 - 9, 54, [40, 140, 220], 3, [20, 70, 120]);
  blit(ctx, CRAB_ARTS[0].a, W / 2 - 60, 58);
  blit(ctx, ACCESSORIES.toque.art, W / 2 - 60 + 4, 54);
  blit(ctx, CRAB_ARTS[1].a, W / 2 + 44, 58, true);
  blit(ctx, ACCESSORIES.flower.art, W / 2 + 44, 55);
  text(ctx, "A TINY IDLE BEACH TOWN", W / 2 - 55, 76, [110, 90, 80], 5);
  // menu
  const bx = W / 2 - 50;
  if (hasSave) {
    rect(ctx, bx, 118, 100, 16, [30, 20, 36]);
    rect(ctx, bx + 1, 119, 98, 14, [190, 140, 80]);
    text(ctx, "CONTINUE", bx + 27, 123, [40, 24, 16]);
  }
  const ny = hasSave ? 138 : 122;
  const conf = newConfirmT > 0;
  rect(ctx, bx, ny, 100, 16, [30, 20, 36]);
  rect(ctx, bx + 1, ny + 1, 98, 14, conf ? [150, 60, 60] : [120, 100, 80]);
  text(ctx, conf ? "WIPE SAVE?" : "NEW GAME", bx + (conf ? 21 : 26), ny + 5, conf ? [255, 220, 220] : [235, 225, 210]);
  if (((time * 1.5) | 0) % 2) text(ctx, "CLICK TO PLAY", W / 2 - 38, 162, [255, 250, 235], 6);
  text(ctx, "MUSIC: PIXEL WAVE WALTZ - MATT CLANKER", 14, PANEL_Y + 8, [170, 150, 135], 5);
  text(ctx, "BUILT ON THE SNESCAT TOY PPU", 44, PANEL_Y + 20, [140, 120, 105], 5);
}
function drawGameOver() {
  ctx.fillStyle = "rgba(16,12,30,0.72)";
  ctx.fillRect(0, 0, W, H);
  const cx2 = W / 2;
  rect(ctx, cx2 - 88, 66, 176, 84, [30, 20, 36]);
  rect(ctx, cx2 - 86, 68, 172, 80, [255, 250, 235]);
  textShadow(ctx, "EVICTED!", cx2 - textWidth("EVICTED!") / 2, 76, [230, 60, 70], [120, 30, 40]);
  text(ctx, "THE LANDLORD CRAB TOOK", cx2 - 66, 92, [90, 60, 50], 6);
  text(ctx, "BACK THE SHACK", cx2 - 41, 101, [90, 60, 50], 6);
  text(ctx, "NIGHTLY RENT OWED $" + fmt(rentAmount()), cx2 - 66, 114, [140, 60, 60], 6);
  text(ctx, "SURVIVED " + day + " DAYS  EARNED $" + fmt(lifetime), cx2 - 78, 124, [90, 90, 110], 5);
  const bl = ((time * 2) | 0) % 2;
  if (bl) text(ctx, "CLICK TO START OVER", cx2 - 56, 137, [40, 110, 60], 6);
}
function drawToast() {
  if (!toast) return;
  const w2 = textWidth(toast.text) + 12;
  const x = ((W - w2) / 2) | 0, y = 62;
  rect(ctx, x, y, w2, 13, [30, 20, 36]);
  rect(ctx, x + 1, y + 1, w2 - 2, 11, [255, 250, 230]);
  text(ctx, toast.text, x + 6, y + 3, [90, 50, 30]);
}

// ---------------------------------------------------------------- main loop
let last = performance.now(), saveT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000) * TURBO;
  last = now; time += dt;
  if (!gameOver) tmin += dt * TS;
  if (tmin >= 1440) { tmin -= 1440; day++; }
  if (tmin >= 20 * 60 && lastRentDay !== day) {
    lastRentDay = day;
    (window.dayLog = window.dayLog || []).push({ day, close: Math.round(coins) });
    // 1. wages: pay every crab you can afford
    let wages = 0;
    for (const c of crabs) {
      if (coins >= CRAB_WAGE) { coins -= CRAB_WAGE; c.p.wallet += CRAB_WAGE; wages += CRAB_WAGE; }
      else popText("NO PAY?!", c.x, FLOOR_Y - 30, [255, 120, 120]);
    }
    if (wages > 0) earnHist.push({ t: time, amt: -wages });
    // 2. house rent from each crab's own wallet; broke crabs move to the shelter
    let evictedNames = [];
    for (const c of crabs) {
      if (c.p.homeless) {
        // shelter is free; move back into a free house once savings allow
        const used = new Set(crabs.filter(k => !k.p.homeless).map(k => k.p.house));
        let free = -1;
        for (let h = 0; h < HOUSE_XS.length; h++) if (!used.has(h)) { free = h; break; }
        if (free >= 0 && c.p.wallet >= MOVE_IN_COST + HOUSE_RENT) {
          c.p.wallet -= MOVE_IN_COST; c.p.house = free; c.p.homeless = false;
          toast = { text: c.p.name + " MOVED INTO A HOUSE!", t: 5 };
          popText("HOME SWEET HOME", HOUSE_XS[free] + 8, 100, [140, 255, 160]);
          sfx.ding();
        }
      } else if (c.p.wallet >= HOUSE_RENT) {
        c.p.wallet -= HOUSE_RENT;
      } else {
        c.p.homeless = true;
        evictedNames.push(c.p.name);
        popText(c.p.name + " LOST THEIR HOUSE", c.x - 12, FLOOR_Y - 34, [255, 120, 120]);
      }
    }
    if (evictedNames.length) {
      toast = { text: evictedNames.join(", ") + " MOVED TO THE SHELTER", t: 6 };
      sfx.angry();
    }
    // 3. shack rent: miss it and it's over
    const rent = rentAmount();
    if (coins >= rent) {
      coins -= rent;
      earnHist.push({ t: time, amt: -rent });
      if (!evictedNames.length && !toast) toast = { text: rent === 0
        ? "FIRST NIGHT FREE - WELCOME TO THE BOARDWALK!"
        : "PAID $" + fmt(wages) + " WAGES + $" + fmt(rent) + " RENT", t: 5 };
      popText("-$" + rent + " RENT", SHACK_DOOR, 110, [255, 120, 120]);
      sfx.buy(); save();
    } else {
      gameOver = true; toast = null; save();
      if (music) { music.pause(); music = null; }
      sfx.angry();
    }
  }

  if (screen === "title") {
    // attract mode: slow ping-pong pan across the town
    const span = WORLD_W - W, s = (time * 9) % (2 * span);
    camX = s < span ? s : 2 * span - s;
    updateBus(dt);
    for (const c of crabs) { c.animT += dt; maybeQuip(c, dt); }
    drawBG(); drawTown(); drawBus();
    for (const c of crabs) drawCrab(c);
    drawNight();
    drawTitle();
    requestAnimationFrame(frame);
    return;
  }
  if (!gameOver) {
  updateBus(dt);
  updateCustomers(dt);
  for (const c of crabs) {
    c.animT += dt;
    updateSchedule(c);
    if (c.dayState === "toWork" || c.dayState === "toHome") updateCommute(c, dt);
    else if (c.dayState === "working") updateKitchen(c, dt);
    maybeQuip(c, dt);
  }
  if (followIdx >= 0 && crabs[followIdx]) {
    const t = clampCam(crabs[followIdx].x - W / 2 + 8);
    camX += (t - camX) * Math.min(1, dt * 5);
  }
  if (newConfirmT > 0) newConfirmT -= dt;
  if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  }

  drawBG();
  drawTown();
  drawCustomers();
  drawBus();
  for (const c of crabs) drawCrab(c);
  drawFloaters(dt);
  drawNight();
  drawFollowCard();
  drawPanel();
  drawToast();
  if (gameOver) drawGameOver();
  requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => { if (document.hidden) save(); else last = performance.now(); });
addEventListener("beforeunload", save);

hasSave = load();
if (!hasSave) {
  crabs = [newCrab(makeCrabPersona(0)), newCrab(makeCrabPersona(1))];
  coins = 140;   // opening cash: ingredients + first rent buffer
}
requestAnimationFrame(frame);

// console cheat for tinkering: cheat(500)
window.cheat = (n) => { coins += n || 100; };
