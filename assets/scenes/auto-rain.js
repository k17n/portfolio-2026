/*
 * auto rain: riding through Chennai in the rain from the back seat of an auto
 * rickshaw, wide, as if on an 18 mm lens. The black canopy and yellow pillars
 * frame the windshield, the driver sits a seat ahead, and a single wiper sweeps
 * back and forth. Drops gather on the glass and blur the street until the
 * wiper clears its arc. The auto is moving: lane marks rush in, shopfronts and
 * trees stream past and out the open sides, a car and a rider in a yellow
 * raincoat go ahead, and the rain comes down.
 *
 * Drawn for this site in the manner of the ascii.rest scenes by @bas3line (MIT):
 * every cell is shaded in colour, then drawn as a halftone, a dot whose size is
 * the cell's brightness, ordered-dithered, in the palette colour nearest its hue.
 */
export const meta = {
  name: "auto rain",
  category: "scenes",
  note: "a chennai street in the rain from the back seat of an auto, wiper going",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0b0b0d",
  palette: [
    // greys
    "#16171a", "#222429", "#30333a", "#41454d", "#565b64", "#6e747d", "#878d96", "#a2a8b0", "#bec3ca", "#d9dde2", "#f2f4f6", "#ffffff",
    // the pillars' yellow, the green trim
    "#6b4a0c", "#a0700f", "#d19a16", "#f2c02a", "#ffd95c",
    "#123d26", "#1d6a41", "#2f9a5f", "#5cc489",
    // trees outside
    "#2c4a2e", "#46704a", "#6a9a6c", "#93bf92",
    // the driver: hair, skin, shirt
    "#5a3a2b", "#7e5440", "#a3725a", "#c48e72", "#dcab8e",
    "#5d5a68", "#7f7c8c", "#a29fae", "#c4c1cf",
    // shop signs and tarps, the sticker
    "#1f4a8a", "#3569b8", "#5e90dc", "#9cc0f0",
    "#8e1f17", "#c23022", "#e8503a",
    // lights
    "#ff4a3a", "#ffd27a",
  ],
};

const W = 200, H = 100;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// the windshield, a rounded rectangle, and the pillars either side of it
const GX0 = 56, GX1 = 144, GY0 = 31, GY1 = 61, GR = 7;
const LP0 = 47, LP1 = 55.5, RP0 = 144.5, RP1 = 153;
// the wiper: pivot under the glass, length, the arc it sweeps, how fast
const PIV = [109, 62], WLEN = 31, WMID = Math.PI / 2, WAMP = 1.15, WSPEED = (2 * Math.PI) / 1.7;
const VX = 100, VY = 44; // where the street vanishes
const SPEED = 1.6; // how fast the street comes at us

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const frac = (v) => v - Math.floor(v);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function hash(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), u), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}
function fbm(x, y, octaves) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise(x * f + i * 17.3, y * f - i * 9.1);
    n += a, a *= 0.5, f *= 2;
  }
  return s / n;
}
function roundRect(x, y, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r - x, 0, x - (x1 - r)), cy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return Math.hypot(cx, cy) - r;
}

const GLASS = 1, OPEN = 2, MIRROR = 3, SOLID = 4;

export default function autoRain() {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out = new Array(N);

  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r, g, b) => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // --- the auto and the driver, which never change ---------------------------
  const mat = new Uint8Array(N);
  const SR = new Float32Array(N), SG = new Float32Array(N), SB = new Float32Array(N);
  const driver = new Uint8Array(N);
  const solid = (k, r, g, b) => ((mat[k] = SOLID), (SR[k] = r), (SG[k] = g), (SB[k] = b));

  for (let y = 0; y < H; y++) {
    const yc = y + 0.5;
    for (let x = 0; x < W; x++) {
      const k = y * W + x, xc = x + 0.5;
      const side = Math.max(0, Math.abs(xc - 100) - 48);
      const gd = roundRect(xc, yc, GX0, GY0, GX1, GY1, GR);
      const pil = (xc >= LP0 && xc < LP1) || (xc > RP0 && xc <= RP1);

      if (yc < 8 + side * 0.48) {
        // the black canopy overhead, coming down over the open sides; a seam
        // runs along it and a little light from outside catches its edge
        let l = 0.09 + 0.04 * noise(xc * 0.15, yc * 0.4);
        if (Math.abs(yc - (5 + side * 0.36)) < 0.5) l += 0.06;
        l += 0.1 * smooth(2.5, 0, 8 + side * 0.48 - yc) * (side > 0 ? 1 : 0);
        solid(k, l, l, l * 1.05);
      } else if (pil && yc >= 15) {
        // the yellow pillars, green at the foot, shaded on their inner edges
        const inner = xc < 100 ? smooth(LP0 + 4, LP1, xc) : smooth(RP1 - 4, RP0, xc);
        const l = 0.84 - 0.35 * inner;
        if (yc > 86) solid(k, l * 0.25, l * 0.68, l * 0.42);
        else solid(k, l, l * 0.74, l * 0.16);
      } else if (xc >= LP1 && xc <= RP0 && yc < GY0 + 2 && gd > 0) {
        // the roof lining and visor above the glass
        const l = 0.15 + 0.05 * noise(xc * 0.15, yc * 0.5) + 0.04 * smooth(18, GY0, yc);
        solid(k, l, l * 0.98, l * 1.02);
        if (xc > 116 && xc < 122 && yc > 24 && yc < 26.5) solid(k, 0.75, 0.25, 0.18); // a small red lamp
      } else if (gd <= 0) {
        mat[k] = GLASS;
      } else if (gd < 1.4 && xc >= LP1 && xc <= RP0) {
        solid(k, 0.07, 0.07, 0.08); // the rubber seal
      } else if (xc >= LP1 && xc <= RP0 && yc >= GY1) {
        // the dashboard, then the dark of the driver's compartment below
        if (yc < GY1 + 9) {
          let l = 0.36 + 0.06 * noise(xc * 0.2, yc * 0.3) - 0.1 * smooth(GY1 + 6, GY1 + 9, yc);
          if (Math.hypot(xc - 70, yc - (GY1 + 4.5)) < 3) l = 0.12; // the meter
          solid(k, l * 0.95, l * 0.92, l * 0.84);
        } else {
          const l = 0.1 + 0.04 * noise(xc * 0.1, yc * 0.2);
          solid(k, l, l, l * 1.04);
        }
      } else {
        mat[k] = OPEN;
      }
    }
  }

  // the mirrors on their stems, outside the pillars
  const MIRRORS = [[37, 37, 5], [163, 35, 5]];
  for (const [mx, my, mr] of MIRRORS) {
    for (let y = Math.floor(my - mr - 1); y <= my + mr + 1; y++) {
      for (let x = Math.floor(mx - mr - 1); x <= mx + mr + 1; x++) {
        const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
        const k = y * W + x;
        if (d < mr - 0.8) mat[k] = MIRROR;
        else if (d < mr + 0.4) solid(k, 0.12, 0.12, 0.13);
      }
    }
    const sx = mx < 100 ? 1 : -1;
    for (let i = 0; i < 7; i++) solid(Math.round(my + mr * 0.4 + i * 0.4) * W + Math.round(mx + sx * (mr + i)), 0.15, 0.15, 0.16);
  }

  // the sticker in the corner of the glass
  for (let y = 33; y < 38; y++) {
    for (let x = 60; x < 69; x++) {
      const text = (y === 34 || y === 36) && x > 60 && x < 68 && hash(x, y) < 0.7;
      solid(y * W + x, text ? 0.15 : 0.55, text ? 0.25 : 0.72, text ? 0.5 : 0.95);
    }
  }

  // the driver a seat ahead, from behind: head, ears, neck, shoulders
  const HX = 100, HY = 45, HRX = 6.2, HRY = 7.8;
  for (let y = 34; y < H; y++) {
    const yc = y + 0.5;
    for (let x = 60; x < 140; x++) {
      const xc = x + 0.5, k = y * W + x;
      const hd = ((xc - HX) / HRX) ** 2 + ((yc - HY) / HRY) ** 2;
      const ear = ((Math.abs(xc - HX) - 6.2) / 1.1) ** 2 + ((yc - 46.5) / 2) ** 2 < 1;
      const hw = yc < 53 ? 0 : Math.min(24, 8 + (yc - 53) * 2.4) - 2 * Math.exp(-(yc - 53) / 2);
      const shirt = yc >= 53 && Math.abs(xc - HX) < hw + 0.04 * (yc - 53);
      const neck = yc > 50 && yc < 54.5 && Math.abs(xc - HX) < 4;
      let r, g, b;
      if (shirt) {
        const fold = noise(xc * 0.25, yc * 0.15) - 0.5;
        const edge = smooth(hw - 6, hw, Math.abs(xc - HX));
        let l = 0.5 + 0.12 * fold - 0.16 * edge;
        if (yc < 55 && Math.abs(xc - HX) < 6.5) l *= 0.72; // the collar
        (r = l * 0.9), (g = l * 0.87), (b = l);
      } else if (hd < 1) {
        const low = smooth(0.35, 0.95, (yc - HY) / HRY);
        const l = 0.1 + 0.07 * noise(xc * 0.8, yc * 0.8);
        (r = mix(l, 0.42, low * 0.6)), (g = mix(l * 0.95, 0.27, low * 0.6)), (b = mix(l * 0.95, 0.2, low * 0.6));
      } else if (ear || neck) {
        (r = 0.42), (g = 0.27), (b = 0.2);
      } else continue;
      solid(k, r, g, b);
      driver[k] = 1;
    }
  }

  // drops on the glass: [x, y, when it lands in the cycle, size]
  const DROP_T = 2.2;
  const DROPS = Array.from({ length: 520 }, (_, i) => [GX0 + hash(i, 1) * (GX1 - GX0), GY0 + hash(i, 2) * (GY1 - GY0), hash(i, 3) * DROP_T, 0.5 + 0.5 * hash(i, 4)])
    .filter(([x, y]) => roundRect(x, y, GX0, GY0, GX1, GY1, GR) < -0.5);

  // when the wiper last passed a point at angle phi, before phase ph
  const lastWipe = (phi, ph) => {
    const q = (phi - WMID) / WAMP;
    if (q < -1 || q > 1) return -1e9;
    const a = Math.asin(q);
    let best = -1e9;
    for (const base of [a, Math.PI - a]) {
      const c = base + 2 * Math.PI * Math.floor((ph - base) / (2 * Math.PI));
      if (c > best) best = c;
    }
    return best / WSPEED;
  };

  // the street, coming at us. Above the horizon the shopfronts on each side
  // stream outward; below it the road's marks rush in.
  const street = (xc, yc, t) => {
    const bob = 0.3 * Math.sin(t * 8.3) + 0.18 * Math.sin(t * 13.1);
    const y = yc + bob, run = t * SPEED;
    const dx = xc - VX, ax = Math.abs(dx);
    let r, g, b;

    if (y < VY) {
      // grey sky, and the buildings: a side's height grows toward the edge
      const sl = 0.74 + 0.06 * (1 - y / VY);
      (r = sl * 0.95), (g = sl * 0.97), (b = sl);
      const top = VY - 3 - Math.max(0, ax - 6) * 0.62;
      if (ax > 6 && y > top) {
        // depth along the street: far near the middle, near at the edges
        const d = 28 / (ax - 2);
        const lot = Math.floor(d * 2.2 + run * 0.9 + (dx > 0 ? 50 : 0));
        const h0 = hash(lot, 11);
        let l = 0.5 + 0.25 * h0;
        let cr = l, cg = l * 0.97, cb = l * 0.93;
        // shop signs and tarps along the lower floors
        const low = y > VY - 2 - (ax - 6) * 0.22;
        if (low && h0 < 0.35) (cr = 0.75), (cg = 0.22), (cb = 0.16);
        else if (low && h0 > 0.75) (cr = 0.25), (cg = 0.45), (cb = 0.78);
        else if (low) (cr = l * 0.5), (cg = l * 0.5), (cb = l * 0.52); // shutters open, dark inside
        // windows up the floors
        const fl = frac((VY - y) / (1.2 + (ax - 6) * 0.14));
        if (!low && fl < 0.35 && frac(d * 2.2 * 4 + run * 3.6) < 0.5) (cr *= 0.55), (cg *= 0.55), (cb *= 0.6);
        // far buildings fade into the rain
        const fog = smooth(30, 6, ax) * 0.7;
        (r = mix(cr, r, fog)), (g = mix(cg, g, fog)), (b = mix(cb, b, fog));
        // trees on the left, between the lots
        if (dx < 0) {
          const tree = smooth(0.48, 0.56, fbm(d * 3 + run * 1.2, y * 0.12, 3)) * smooth(top + 6, top - 2, y + 4);
          if (tree) (r = mix(r, 0.32, tree)), (g = mix(g, 0.5, tree)), (b = mix(b, 0.32, tree));
        }
      }
    } else {
      // the wet road: depth z from the row, marks that come at us
      const p = Math.max(0.002, (y - VY) / (H - VY));
      const z = 1 / p;
      let l = mix(0.6, 0.34, Math.sqrt(p)) + 0.06 * (noise(xc * 0.06, z * 2 - run * 2) - 0.5);
      const edge = 150 * p; // the road's width at this row
      if (ax > edge) l = mix(0.62, 0.48, Math.sqrt(p)) + 0.04 * hash(Math.floor(z * 3 - run * 3), 9); // the kerb and footpath
      (r = l * 0.95), (g = l * 0.97), (b = l);
      // the lane line: we keep left, so it runs to our right; dashes rush in
      const lane = VX + 26 * p;
      if (Math.abs(xc - lane) < 0.5 + 1.4 * p && frac(z * 0.35 - run * 0.9) < 0.45) (r = 0.86), (g = 0.86), (b = 0.86);
      // the wet road mirrors the shopfronts and the signs, smeared
      if (ax > 8 && ax < edge) {
        const d = 28 / (Math.max(ax, 8) - 2);
        const h0 = hash(Math.floor(d * 2.2 + run * 0.9 + (dx > 0 ? 50 : 0)), 11);
        const a = 0.18 * smooth(0, 0.3, p) * (1 - smooth(0.4, 1, p)) * (0.5 + noise(xc * 0.5, z * 3 - run * 3));
        const c = h0 < 0.35 ? [0.75, 0.22, 0.16] : h0 > 0.75 ? [0.25, 0.45, 0.78] : [0.6, 0.6, 0.6];
        (r = mix(r, c[0], a)), (g = mix(g, c[1], a)), (b = mix(b, c[2], a));
      }
    }

    // the car ahead, keeping its distance
    const cx = 114 + 1.5 * Math.sin(t * 0.13), cy = 50;
    if (xc > cx - 8 && xc < cx + 8 && y > cy - 7 && y < cy + 3) {
      const win = y < cy - 3 && xc > cx - 6 && xc < cx + 6;
      const l = win ? 0.3 : 0.78;
      (r = l), (g = l), (b = l * 1.03);
      if (y > cy - 1.5 && y < cy + 0.5 && (Math.abs(xc - (cx - 6.5)) < 1.2 || Math.abs(xc - (cx + 6.5)) < 1.2)) (r = 1), (g = 0.3), (b = 0.24);
    }
    if (xc > cx - 7 && xc < cx + 7 && y >= cy + 3 && y < cy + 8) {
      const a = 0.3 * (1 - (y - cy - 3) / 5);
      (r = mix(r, 0.8, a)), (g = mix(g, 0.78, a)), (b = mix(b, 0.78, a));
    }
    // the rider in a yellow raincoat, weaving a little
    const rx = 86 + 2.5 * Math.sin(t * 0.21), ry = 50;
    if (((xc - rx) / 2.4) ** 2 + ((y - (ry - 3.6)) / 3.6) ** 2 < 1) (r = 0.95), (g = 0.78), (b = 0.18);
    if (((xc - rx) / 1.4) ** 2 + ((y - (ry - 8)) / 1.4) ** 2 < 1) (r = 0.18), (g = 0.18), (b = 0.2);
    if (Math.abs(xc - rx) < 0.9 && y > ry - 0.5 && y < ry + 3) (r = 0.15), (g = 0.15), (b = 0.17);
    if (Math.abs(xc - rx) < 0.8 && Math.abs(y - (ry + 0.5)) < 0.6) (r = 1), (g = 0.3), (b = 0.24);
    // alongside: a white car out the left, a green auto out the right
    const wl = 2 * Math.sin(t * 0.17);
    if (xc < 30 + wl && y > 47 && y < 68) {
      const win = y < 54 && xc > 4 && xc < 26 + wl;
      const l = win ? 0.32 : 0.86;
      (r = l), (g = l), (b = l * 1.02);
      if (y > 63 && (Math.abs(xc - 8) < 3.5 || Math.abs(xc - (24 + wl)) < 3.5)) (r = 0.1), (g = 0.1), (b = 0.11);
    }
    const wr = 1.5 * Math.sin(t * 0.23 + 1);
    if (xc > 172 + wr && y > 34 && y < 70) {
      const roof = y < 40;
      (r = roof ? 0.12 : 0.3), (g = roof ? 0.12 : 0.74), (b = roof ? 0.13 : 0.45);
      if (!roof && y < 46 && xc > 176 + wr) (r = 0.3), (g = 0.32), (b = 0.34); // its windshield
    }
    return [r, g, b];
  };

  // rain outside, in two depths: [count, rows a second, length, brightness, slant]
  const LAYERS = [[260, 50, 3, 0.18, 0.12], [110, 75, 5, 0.3, 0.16]];
  const streaks = LAYERS.map(([n], li) => Array.from({ length: n }, (_, i) => [hash(i, li * 101) * (W + 30) - 15, hash(i, li * 101 + 7)]));
  const rain = new Float32Array(N);
  const drop = new Float32Array(N);
  const wiperCell = new Uint8Array(N);

  return (t, { color } = {}) => {
    const ph = t * WSPEED;
    const ang = WMID + WAMP * Math.sin(ph);

    rain.fill(0);
    for (let li = 0; li < LAYERS.length; li++) {
      const [, speed, len, bright, sl] = LAYERS[li];
      const span = H + len + 12;
      for (const [x0, p0] of streaks[li]) {
        const head = ((p0 * span + t * speed) % span) - len;
        for (let i = 0; i < len; i++) {
          const y = head - i, r = Math.floor(y);
          if (r < 0 || r >= H) continue;
          const x = Math.floor(x0 + sl * y);
          if (x < 0 || x >= W) continue;
          const k = r * W + x, a = bright * (1 - (0.6 * i) / len);
          if (a > rain[k]) rain[k] = a;
        }
      }
    }

    // drops still on the glass: landed since the wiper last went by
    drop.fill(0);
    for (const [x, y, at, size] of DROPS) {
      const dist = Math.hypot(x - PIV[0], PIV[1] - y);
      const wiped = dist < WLEN ? lastWipe(Math.atan2(PIV[1] - y, x - PIV[0]), ph) : -1e9;
      const landed = t - ((((t - at) % DROP_T) + DROP_T) % DROP_T);
      if (landed < wiped) continue;
      const k = Math.floor(y) * W + Math.floor(x);
      drop[k] = Math.max(drop[k], size);
    }

    // the wiper, a blade two cells wide
    wiperCell.fill(0);
    const ux = Math.cos(ang), uy = -Math.sin(ang);
    for (let i = 1.5; i < WLEN; i += 0.4) {
      for (const o of [0, 0.8]) {
        const x = Math.floor(PIV[0] + ux * i - uy * o), y = Math.floor(PIV[1] + uy * i + ux * o);
        if (x >= 0 && x < W && y >= 0 && y < H) wiperCell[y * W + x] = 1;
      }
    }

    for (let y = 0; y < H; y++) {
      const yc = y + 0.5;
      for (let x = 0; x < W; x++) {
        const k = y * W + x, xc = x + 0.5;
        const m = mat[k];
        let r, g, b;

        if (m === SOLID) {
          r = SR[k], g = SG[k], b = SB[k];
          if (wiperCell[k] && !driver[k] && yc < GY1 + 1.5) (r = 0.05), (g = 0.05), (b = 0.06);
        } else if (m === GLASS) {
          [r, g, b] = street(xc, yc, t);
          const dist = Math.hypot(xc - PIV[0], PIV[1] - yc);
          const since = dist < WLEN ? t - lastWipe(Math.atan2(PIV[1] - yc, xc - PIV[0]), ph) : 9;
          const wet = clamp(since / 2.4) * 0.38 + 0.1;
          const soft = 0.55 + 0.08 * noise(xc * 0.06, yc * 0.06);
          r = mix(r, soft, wet), g = mix(g, soft * 1.01, wet), b = mix(b, soft * 1.03, wet);
          if (drop[k]) (r += 0.42 * drop[k]), (g += 0.43 * drop[k]), (b += 0.45 * drop[k]);
          if (wiperCell[k]) (r = 0.05), (g = 0.05), (b = 0.06);
        } else if (m === MIRROR) {
          const l = 0.4 + 0.25 * noise(xc * 0.4, yc * 0.4 + t * 2);
          (r = l * 0.95), (g = l * 0.97), (b = l);
          if (hash(k, Math.floor(t * 3)) < 0.12) (r += 0.25), (g += 0.25), (b += 0.26);
        } else {
          [r, g, b] = street(xc, yc, t);
          const rn = rain[k];
          if (rn) (r += rn * 0.6), (g += rn * 0.63), (b += rn * 0.68);
        }

        r = Math.max(0, r), g = Math.max(0, g), b = Math.max(0, b);
        const peak = Math.max(r, g, b, 1e-4);
        const level = clamp(Math.pow(peak, 0.72) * 1.02);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(y & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(r * s), clamp(g * s), clamp(b * s));
        }
      }
    }
    const lines = [];
    for (let y = 0; y < H; y++) lines.push(out.slice(y * W, (y + 1) * W).join(""));
    return lines.join("\n");
  };
}
