#!/usr/bin/env node
// Headless inner simulation: runs the real game.js against stubbed browser
// APIs with a synthetic clock. Used for balance tuning.
//
//   node tools/headless.mjs --days 14
//   node tools/headless.mjs --days 30 --buy knife,flame,ads   (greedy buys, in priority order)
//   node tools/headless.mjs --days 30 --set ads=3,chef=4
import { readFileSync } from "fs";
import vm from "vm";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const DAYS = parseInt(opt("days", "14"));
const BUY = (opt("buy", "") || "").split(",").filter(Boolean);
const SET = (opt("set", "") || "").split(",").filter(Boolean);
const STEP = parseFloat(opt("step", "0.05"));   // sim timestep, seconds
const QUIET = args.includes("--quiet");
const SEEDS = parseInt(opt("seeds", "1"));

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- browser stubs ------------------------------------------------------
const noop = () => {};
const ctxStub = new Proxy({}, {
  get: (t, k) => {
    if (k === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
    if (k === "canvas") return { width: 0, height: 0 };
    return noop;
  },
  set: () => true,
});
const mkCanvas = () => ({ width: 0, height: 0, getContext: () => ctxStub,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 256, height: 240 }),
  addEventListener: noop });
function runOnce(seed) {
const seededMath = Object.create(Math);
seededMath.random = mulberry32(seed);
const sandbox = {
  document: { createElement: () => mkCanvas(), getElementById: () => mkCanvas(), addEventListener: noop, hidden: false },
  location: { search: "?fresh" },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  Audio: class { constructor() { this.loop = false; this.volume = 0; } play() { return { catch: noop }; } pause() {} },
  AudioContext: undefined,
  addEventListener: noop,
  console,
  Math: seededMath, JSON,
  rafCb: null,
  simNow: 0,
};
sandbox.window = sandbox;
sandbox.requestAnimationFrame = (cb) => { sandbox.rafCb = cb; };
sandbox.performance = { now: () => sandbox.simNow };
const C = vm.createContext(sandbox);

// ---- load the real game (context shares one global lexical env, like <script> tags)
for (const f of ["font.js", "ppu.js", "sprites.js", "crabs.js", "game.js"]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), C, { filename: f });
}
const G = (expr) => vm.runInContext(expr, C);

// apply --set overrides (e.g. ads=3,chef=4; chef also hires crabs)
for (const kv of SET) {
  const [k, v] = kv.split("=");
  G(`UPS[${JSON.stringify(k)}].lvl = ${parseInt(v)};
     if (${JSON.stringify(k)} === "chef") while (crabs.length < UPS.chef.lvl) crabs.push(newCrab(makeCrabPersona(crabs.length)));`);
}

// ---- run ----------------------------------------------------------------
G("soundOn = false; musicOn = false;");
const stepScript = new vm.Script(`simNow += ${STEP * 1000}; rafCb(simNow);`);
const buyScript = BUY.length ? new vm.Script(`
  if (Math.abs(tmin - 12 * 60) < ${STEP} * TS) {
    for (const k of ${JSON.stringify(BUY)}) {
      const u = UPS[k];
      if (u.lvl < u.max && coins >= upCost(u) + nightlyDue() + 30) tryBuy(k);
    }
  }`) : null;
const dayRows = [];
let lastDay = G("day");
const t0 = Date.now();
while (G("day") <= DAYS && !G("gameOver")) {
  stepScript.runInContext(C);
  if (buyScript) buyScript.runInContext(C);
  const d = G("day");
  if (d !== lastDay) {
    dayRows.push({ day: lastDay, endBalance: G("Math.round(coins)"), lifetime: G("Math.round(lifetime)") });
    lastDay = d;
  }
}
const wall = Date.now() - t0;
return { dayRows, wall,
  over: G("gameOver"), day: G("day"), rent: G("rentAmount()"),
  coins: G("Math.round(coins)"), ups: G(`Object.keys(UPS).map(k => k + ":" + UPS[k].lvl).join(" ")`) };
}

const results = [];
for (let s = 1; s <= SEEDS; s++) results.push(runOnce(s * 1337));
const r0 = results[0];
if (!QUIET && SEEDS === 1) {
  console.log("day  end$   lifetime$  (settlement at 20:00 included)");
  for (const r of r0.dayRows) console.log(String(r.day).padStart(3), String(r.endBalance).padStart(6), String(r.lifetime).padStart(9));
}
for (const r of results) {
  console.log(r.over
    ? `EVICTED day ${r.day} (rent $${r.rent}, had $${r.coins}) — ${r.ups}`
    : `SURVIVED ${DAYS}d, $${r.coins} — ${r.ups}`);
}
if (SEEDS > 1) {
  const evictDays = results.map(r => r.over ? r.day : DAYS + 1).sort((a, b) => a - b);
  const surv = results.filter(r => !r.over).length;
  console.log(`>> survived ${surv}/${SEEDS}; eviction days: ${evictDays.join(",")} (median ${evictDays[SEEDS >> 1]})`);
}
console.log(`(${results.reduce((s, r) => s + r.wall, 0)}ms total)`);
