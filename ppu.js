// A toy SNES PPU for the browser, ported from snescat/ppu.py.
// 256x240 framebuffer on a <canvas>, character-map sprite parsing,
// masked blits, and the snescat 5x7 bitmap font.

const W = 256, H = 240;

// Crush to 5 bits per channel like the SNES 15-bit BGR palette.
function q15(c) { return [c[0] & 0xF8, c[1] & 0xF8, c[2] & 0xF8]; }
function rgb(c) { const q = q15(c); return `rgb(${q[0]},${q[1]},${q[2]})`; }

// rows: list of equal-length strings; palette: char -> [r,g,b].
// '.' is transparent. Returns an offscreen canvas (and its mirror).
function parseArt(rows, palette) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const cx = cv.getContext("2d");
  const img = cx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`row ${y} width ${rows[y].length} != ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === ".") continue;
      const c = palette[ch];
      if (!c) throw new Error(`no palette entry for '${ch}'`);
      const p = q15(c), i = (y * w + x) * 4;
      img.data[i] = p[0]; img.data[i + 1] = p[1]; img.data[i + 2] = p[2]; img.data[i + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  // pre-baked horizontal mirror for flip blits
  const fv = document.createElement("canvas");
  fv.width = w; fv.height = h;
  const fx = fv.getContext("2d");
  fx.translate(w, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0);
  return { cv, fv, w, h };
}

function blit(ctx, art, x, y, flip) {
  ctx.drawImage(flip ? art.fv : art.cv, x | 0, y | 0);
}

// tinted copy of an art (for shadows / ghosts)
function tintArt(art, color) {
  const cv = document.createElement("canvas");
  cv.width = art.w; cv.height = art.h;
  const cx = cv.getContext("2d");
  cx.drawImage(art.cv, 0, 0);
  cx.globalCompositeOperation = "source-in";
  cx.fillStyle = rgb(color);
  cx.fillRect(0, 0, art.w, art.h);
  return { cv, fv: cv, w: art.w, h: art.h };
}

function rect(ctx, x0, y0, w, h, color) {
  ctx.fillStyle = rgb(color);
  ctx.fillRect(x0 | 0, y0 | 0, w | 0, h | 0);
}

function px(ctx, x, y, color) { rect(ctx, x, y, 1, 1, color); }

// ---- snescat 5x7 font ----
const _glyphCache = {};
function glyph(ch, color) {
  const key = ch + "#" + color.join(",");
  let g = _glyphCache[key];
  if (g) return g;
  const rows = FONT[ch] || FONT["?"];
  const cv = document.createElement("canvas");
  cv.width = 5; cv.height = 7;
  const cx = cv.getContext("2d");
  cx.fillStyle = rgb(color);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 5; x++)
      if (rows[y][x] === "1") cx.fillRect(x, y, 1, 1);
  g = _glyphCache[key] = cv;
  return g;
}

function text(ctx, s, x, y, color, spacing = 6) {
  s = String(s).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== " ") ctx.drawImage(glyph(ch, color), (x + i * spacing) | 0, y | 0);
  }
  return x + s.length * spacing;
}

function textShadow(ctx, s, x, y, color, shadow, spacing = 6) {
  text(ctx, s, x + 1, y + 1, shadow, spacing);
  text(ctx, s, x, y, color, spacing);
}

function textWidth(s, spacing = 6) { return String(s).length * spacing - 1; }
