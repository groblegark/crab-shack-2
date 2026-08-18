#!/usr/bin/env node
// Input regression test: runs the real game.js against stubbed browser APIs
// (same technique as headless.mjs) and synthesizes mouse event sequences.
//
// Guards against the "dead panel clicks after a drag" bug: mouseup must clear
// dragMoved (deferred, so the click that follows a real drag is still
// suppressed), otherwise every panel click after a world drag is swallowed.
//
//   node tools/test-input.mjs
import { readFileSync } from "fs";
import vm from "vm";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- browser stubs (headless.mjs style, plus listener capture) ----------
const noop = () => {};
const ctxStub = new Proxy({}, {
  get: (t, k) => {
    if (k === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
    if (k === "canvas") return { width: 0, height: 0 };
    return noop;
  },
  set: () => true,
});
const listeners = {};   // type -> [fn]  (canvas + window share one registry)
const capture = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };
const mkCanvas = () => ({ width: 0, height: 0, getContext: () => ctxStub,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 256, height: 240 }),
  addEventListener: noop });
const screenCv = { ...mkCanvas(), width: 256, height: 240, addEventListener: capture };
const sandbox = {
  document: { createElement: () => mkCanvas(), getElementById: () => screenCv, addEventListener: noop, hidden: false },
  location: { search: "?fresh" },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  Audio: class { constructor() { this.loop = false; this.volume = 0; } addEventListener() {} play() { return { then: () => ({ catch: noop }), catch: noop }; } pause() {} },
  AudioContext: undefined,
  addEventListener: capture,
  setTimeout, clearTimeout,
  console, Math, JSON,
};
sandbox.window = sandbox;
sandbox.requestAnimationFrame = noop;
sandbox.performance = { now: () => 0 };
const C = vm.createContext(sandbox);
for (const f of ["font.js", "ppu.js", "sprites.js", "crabs.js", "game.js"])
  vm.runInContext(readFileSync(join(root, f), "utf8"), C, { filename: f });
const G = (expr) => vm.runInContext(expr, C);

// ---- event synthesis ----------------------------------------------------
// Canvas is 256x240 CSS px at scale 1, so client coords == canvas coords.
const fire = (type, x, y) => { for (const fn of listeners[type] || []) fn({ clientX: x, clientY: y, preventDefault: noop }); };
const click = (x, y) => { fire("mousedown", x, y); fire("mouseup", x, y); fire("click", x, y); };
const drag = (x0, y0, x1, y1) => {
  fire("mousedown", x0, y0); fire("mousemove", x1, y1); fire("mouseup", x1, y1);
  fire("click", x1, y1);   // browsers fire a click after every mousedown/up pair
};

let fails = 0;
const check = (name, cond) => { console.log((cond ? "PASS" : "FAIL") + "  " + name); if (!cond) fails++; };

G('soundOn = false; musicOn = false; screen = "play";');

// 1) plain click with no drag switches a panel tab
click(88, 192);                                        // MENU tab (x 72-104, y 187-197)
check("plain click on MENU tab switches tab", G("tab") === "menu");
G('tab = "crew";');

// 2) regression: drag the world, then click a panel tab — must still work
drag(100, 100, 140, 100);                              // pan the world (y < PANEL_Y)
check("drag panned the camera", G("camX") !== 300);
check("the drag's own click did not switch tabs", G("tab") === "crew");
await sleep(80);                                       // > the 50ms deferred dragMoved clear
click(50, 192);                                        // SHOP tab (x 38-70, y 187-197)
check("panel click AFTER a drag switches to SHOP tab", G("tab") === "shop");

// 3) a real drag must not count as a click (crab follow)
G("camX = 0; followIdx = -1;");
const cx = G("crabs[0].x + 8 - camX");                 // crab 0 screen x, camX = 0
click(cx, 156);                                        // control: plain click follows the crab
check("control: plain click on a crab follows it", G("followIdx") === 0);
G("followIdx = -1;");
drag(cx, 156, cx + 10, 156);                           // drag ending on the crab, click fires at once
check("drag ending on a crab does NOT follow it", G("followIdx") === -1);
await sleep(80);
click(cx + 10 - G("camX"), 156);                       // and a later plain click still follows
check("follow-up plain click on the crab follows it", G("followIdx") === 0);

process.exit(fails ? 1 : 0);
