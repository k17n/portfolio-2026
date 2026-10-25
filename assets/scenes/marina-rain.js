/*
 * marina rain: Chennai's Marina on a monsoon day, seen from high up beside the
 * lighthouse. The red and white banded tower stands close on the left over its
 * beige harbour building, its lamp flashing twice every ten seconds. The wet
 * beach road runs away north under a line of trees, traffic crawling along it,
 * street lamps down the promenade, and the wide brown sand stretches out to a
 * thin strip of sea and its surf under heavy grey cloud. A drizzle falls.
 *
 * Drawn for this site in the manner of the ascii.rest scenes by @bas3line (MIT):
 * every cell is shaded in colour, then drawn as a halftone, a dot whose size is
 * the cell's brightness, ordered-dithered, in the palette colour nearest its hue.
 */
export const meta = {
  name: "marina rain",
  category: "scenes",
  note: "chennai's marina lighthouse and beach road on a monsoon day",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#0b0d11",
  palette: [
    // cloud, haze and road greys
    "#1c2027", "#272c35", "#343a45", "#444b57", "#57606d", "#6c7582", "#848d99", "#9ea6b1", "#b9c0c9", "#d4d9df", "#eef1f4", "#ffffff",
    // sea
    "#3a5258", "#55717a", "#7c979e", "#9fbac0", "#c3d8dc",
    // sand, red brown
    "#3a2418", "#53301d", "#6e3f26", "#8a4f31", "#a0603e", "#b4714b", "#c98559", "#dc9a6d", "#ecb28a",
    // trees
    "#16211a", "#1f2e23", "#2b3f2f", "#3b523e", "#4f6950", "#62805f", "#7a9877", "#93b38d", "#adcaa5",
    // the tower's red, the harbour building's beige
    "#5a1712", "#86231a", "#b33325", "#d94a36",
    "#6e5845", "#9a7d62", "#c4a283", "#e2c3a3",
    // cars: red, yellow, blue
    "#a3221c", "#e0b324", "#2f5fa8",
    // lamps
    "#ffd27a", "#ff5a4a",
  ],
};

const W = 200, H = 100;
const HZ = 57; // the horizon
const VX = 108; // where the road vanishes
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// the lighthouse: its centre, the near corner of its triangle, the lamp
const CX = 28, CORNER = 21.5;
const LAMP = [28, 19.5];

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
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

// perspective down the road: p is 0 at the horizon and 1 at the bottom row
const depth = (y) => (y - HZ) / (H - HZ);
const roadL = (y) => VX - 78 * depth(y);
const roadR = (y) => VX - 22 * depth(y);
const walkR = (y) => roadR(y) + 1 + 3 * depth(y);
// the shore: the sea lies beyond it, a strip out to the right
const shoreX = (y) => 134 + (y - HZ) * 7.5;

// the two flashes every ten seconds
function flash(t) {
  const tt = t % 10;
  return Math.exp(-(((tt - 0.4) / 0.16) ** 2)) + Math.exp(-(((tt - 1.6) / 0.16) ** 2));
}

const SKY = 0, SEA = 1, SAND = 2, ROAD = 3, WALK = 4, FIXED = 5;

export default function marinaRain() {
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

  // --- the layout: what every cell is, and the colour of what never changes --
  const mat = new Uint8Array(N);
  const FR = new Float32Array(N), FG = new Float32Array(N), FB = new Float32Array(N);
  const fog = new Float32Array(N); // how much of the rain haze lies over it
  const fix = (x, y, r, g, b, f = 0) => {
    x = Math.round(x), y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const k = y * W + x;
    mat[k] = FIXED, FR[k] = r, FG[k] = g, FB[k] = b, fog[k] = f;
  };

  for (let y = 0; y < H; y++) {
    const yc = y + 0.5;
    for (let x = 0; x < W; x++) {
      const k = y * W + x, xc = x + 0.5;
      if (yc < HZ) mat[k] = SKY;
      else if (xc < roadL(yc)) mat[k] = FIXED; // trees, set below
      else if (xc < roadR(yc)) mat[k] = ROAD;
      else if (xc < walkR(yc)) mat[k] = WALK;
      else if (xc > shoreX(yc)) mat[k] = SEA;
      else mat[k] = SAND;
      fog[k] = yc < HZ ? 0 : 0.35 * (1 - depth(yc)) ** 3;
    }
  }

  // white buildings low along the horizon past the trees
  for (let x = 30; x < 106; x++) {
    const block = Math.floor(x / 5);
    const h = 1 + Math.floor(hash(block, 2) * 3) + (x > 34 && x < 64 ? 1 : 0);
    const l = x > 34 && x < 64 ? 0.78 : 0.55;
    for (let y = HZ - h - 2; y < HZ; y++) fix(x, y, l, l * 1.01, l * 1.03, 0.25);
  }
  // the trees along the road, a dark green line closing toward the horizon
  for (let x = 0; x < VX; x++) {
    const top = HZ - 1 - 2.6 * fbm(x * 0.18, 4, 2) - (x < 40 ? 1.5 : 0);
    for (let y = Math.floor(top); y < H; y++) {
      const yc = y + 0.5;
      if (yc >= HZ && x + 0.5 >= roadL(yc)) break;
      const c = fbm(x * 0.35, y * 0.5, 3);
      const l = 0.3 + 0.3 * c + 0.06 * (yc < HZ ? 1 : 0);
      fix(x, y, l * 0.55, l * 1.0, l * 0.5, yc < HZ ? 0.2 : 0.25 * (1 - depth(yc)) ** 2);
    }
  }
  // a lattice radio mast behind the harbour building
  for (let y = 41; y < 60; y++) {
    const hw = mix(0.5, 2, (y - 41) / 19);
    for (let x = Math.round(11 - hw); x <= Math.round(11 + hw); x++) {
      if (x === Math.round(11 - hw) || x === Math.round(11 + hw) || (x + y) % 3 === 0) fix(x, y, 0.32, 0.33, 0.36, 0.35);
    }
  }

  // the tower: a triangle in plan, its near corner toward us; the right face
  // takes the brighter sky. Bands from the top: red, white, red, white.
  const BANDS = [[25.5, 31.5, 1], [31.5, 43.7, 0], [43.7, 54.6, 1], [54.6, 64, 0]];
  for (let y = 25; y < 64; y++) {
    const v = (y - 25) / 39;
    const hw = mix(9.4, 10.2, v);
    const band = BANDS.find(([a, b]) => y + 0.5 >= a && y + 0.5 < b) || BANDS[0];
    const red = band[2] === 1;
    for (let x = Math.ceil(CX - hw); x <= Math.floor(CX + hw); x++) {
      const right = x > CORNER;
      const s = (right ? 0.98 : 0.66) * (0.95 + 0.05 * hash(x, y));
      let r = red ? 0.8 : 0.93, g = red ? 0.21 : 0.93, b = red ? 0.16 : 0.92;
      // windows: a column down the left face, small ones on the right
      if (!right && x === Math.round(CX - hw + 2) && y % 3 === 1) (r = 0.25), (g = 0.26), (b = 0.3);
      fix(x, y, r * s, g * s, b * s, 0.04);
    }
  }
  // the head: a white block banded red, with a gallery rail top and bottom
  for (let y = 18; y < 26; y++) {
    for (let x = 18; x <= 39; x++) {
      const right = x > CORNER - 1;
      const s = right ? 1 : 0.68;
      let r = 0.93, g = 0.93, b = 0.92;
      if (y >= 22 && y <= 24) (r = 0.8), (g = 0.21), (b = 0.16);
      if ((y === 18 || y === 25) && x % 2 === 1) (r = 0.2), (g = 0.21), (b = 0.24);
      if (y === 20 && x > 22 && x < 36 && x % 3 !== 0) (r = 0.4), (g = 0.45), (b = 0.5); // the lantern glass
      fix(x, y, r * s, g * s, b * s, 0.04);
    }
  }
  // the antenna mast on top
  for (let y = 9; y < 18; y++) {
    fix(30, y, 0.85, 0.85, 0.86, 0.05);
    if (y === 11 || y === 14) for (let x = 28; x <= 32; x++) fix(x, y, 0.75, 0.75, 0.77, 0.05);
  }
  for (let y = 15; y < 18; y++) for (let x = 27; x <= 33; x++) if ((x + y) % 2 === 0) fix(x, y, 0.7, 0.71, 0.74, 0.05);

  // the harbour building at the foot: beige, storeys of windows and balconies
  for (let y = 59; y < 74; y++) {
    for (let x = 1; x <= 31; x++) {
      const floor = (y - 59) % 4;
      let l = x > 18 ? 0.9 : 0.72;
      let r = 0.88 * l, g = 0.72 * l, b = 0.58 * l;
      if (floor === 1 && x % 3 !== 0) (r *= 0.45), (g *= 0.45), (b *= 0.5); // windows
      if (floor === 3) (r *= 1.05), (g *= 1.05), (b *= 1.05); // the balcony ledges
      fix(x, y, r, g, b, 0.05);
    }
  }
  for (let x = 2; x <= 30; x++) fix(x, 58, 0.62, 0.5, 0.4, 0.05);

  // street lamps down the promenade, nearer ones taller
  const LAMPS = [0.06, 0.11, 0.18, 0.28, 0.42, 0.62, 0.9];
  for (const p of LAMPS) {
    const yb = HZ + p * (H - HZ), xb = roadR(yb) + 0.5 + 1.5 * p;
    const h = 3 + 34 * p;
    for (let y = Math.floor(yb - h); y < yb; y++) fix(xb, y, 0.3, 0.31, 0.34, 0.5 * (1 - p) ** 2);
    for (let i = 1; i <= Math.max(1, Math.round(3 * p)); i++) fix(xb - i, Math.floor(yb - h), 0.3, 0.31, 0.34, 0.5 * (1 - p) ** 2);
  }

  // people on the sand, a few standing about
  const PEOPLE = Array.from({ length: 14 }, (_, i) => {
    const p = 0.05 + 0.5 * hash(i, 51) ** 1.5;
    const y = HZ + p * (H - HZ);
    const x0 = walkR(y) + 4, x1 = shoreX(y) - 3;
    return [mix(x0, x1, hash(i, 52)), y, p, hash(i, 53)];
  });

  // traffic: [lane across the road, phase, which way, colour]
  const CARC = [[0.9, 0.9, 0.9], [0.72, 0.13, 0.1], [0.55, 0.57, 0.6], [0.88, 0.7, 0.14], [0.18, 0.37, 0.68], [0.3, 0.31, 0.34]];
  const CARS = Array.from({ length: 16 }, (_, i) => {
    const out = i % 2 === 0; // away from us, on the right half of the road
    const lane = out ? (hash(i, 61) < 0.5 ? 0.66 : 0.84) : hash(i, 61) < 0.5 ? 0.2 : 0.38;
    return [lane, hash(i, 62), out, CARC[Math.floor(hash(i, 63) * CARC.length)], i === 3 ? 2.6 : 1];
  });

  // drizzle in two depths: [count, rows a second, length, brightness, slant]
  const LAYERS = [[240, 40, 2, 0.13, 0.12], [90, 62, 4, 0.22, 0.16]];
  const drops = LAYERS.map(([n], li) => Array.from({ length: n }, (_, i) => [hash(i, li * 101) * (W + 30) - 15, hash(i, li * 101 + 7)]));
  const rain = new Float32Array(N);
  const CR = new Float32Array(N), CG = new Float32Array(N), CB = new Float32Array(N), hasCar = new Uint8Array(N);

  const skyAt = (xc, yc, drift) => {
    const v = yc / HZ;
    const c = fbm(xc * 0.02 + drift * 0.02, yc * 0.075, 4);
    const c2 = fbm(xc * 0.05 - drift * 0.04 + 40, yc * 0.14, 3);
    const patch = Math.exp(-((xc - 158) ** 2) / 2600 - ((yc - 18) ** 2) / 300);
    let l = mix(0.38, 0.7, v ** 1.3) + 0.2 * patch + (c - 0.5) * 0.3 + (c2 - 0.5) * 0.12 - 0.08 * (1 - xc / W) * (1 - v);
    return l;
  };

  return (t, { color } = {}) => {
    const fl = flash(t);
    const drift = t * 0.7;

    rain.fill(0);
    for (let li = 0; li < LAYERS.length; li++) {
      const [, speed, len, bright, sl] = LAYERS[li];
      const span = H + len + 12;
      for (const [x0, ph] of drops[li]) {
        const head = ((ph * span + t * speed) % span) - len;
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

    // the traffic, crawling both ways
    hasCar.fill(0);
    for (const [lane, ph, away, c, long] of CARS) {
      const s = (ph + t * 0.018) % 1;
      const p = away ? 0.03 + 0.97 * (1 - s) ** 2.4 : 0.03 + 0.97 * s ** 2.4;
      const y = HZ + p * (H - HZ);
      const x = roadL(y) + lane * (roadR(y) - roadL(y));
      const w = Math.max(1, 5 * p * long), h = Math.max(1, 2.6 * p);
      for (let yy = Math.floor(y - h); yy <= Math.floor(y); yy++) {
        for (let xx = Math.floor(x - w / 2); xx <= Math.floor(x + w / 2); xx++) {
          if (xx < 0 || xx >= W || yy < HZ || yy >= H) continue;
          const k = yy * W + xx;
          let r = c[0], g = c[1], b = c[2];
          if (yy === Math.floor(y - h) && h > 1.5) (r *= 0.6), (g *= 0.65), (b *= 0.75); // the windows
          // lights on in the rain: red behind, warm in front
          if (yy === Math.floor(y) && (xx === Math.floor(x - w / 2) || xx === Math.floor(x + w / 2))) {
            if (away) (r = 1), (g = 0.3), (b = 0.25);
            else (r = 1), (g = 0.92), (b = 0.7);
          }
          CR[k] = r, CG[k] = g, CB[k] = b, hasCar[k] = 1;
        }
      }
      // their lights smear down the wet road
      for (let i = 1; i < 2 + 6 * p; i++) {
        const yy = Math.floor(y) + i;
        if (yy >= H) break;
        for (const xx of [Math.floor(x - w / 2), Math.floor(x + w / 2)]) {
          if (xx < 0 || xx >= W) continue;
          const k = yy * W + xx;
          if (hasCar[k]) continue;
          const a = 0.35 * (1 - i / (2 + 6 * p));
          CR[k] = away ? a : a * 0.9, CG[k] = away ? a * 0.3 : a * 0.85, CB[k] = away ? a * 0.25 : a * 0.6, hasCar[k] = 2;
        }
      }
    }

    for (let y = 0; y < H; y++) {
      const yc = y + 0.5;
      const p = yc < HZ ? 0 : depth(yc);
      for (let x = 0; x < W; x++) {
        const k = y * W + x, xc = x + 0.5;
        const m = mat[k];
        let r, g, b;

        if (m === SKY) {
          const l = skyAt(xc, yc, drift);
          r = l * 0.93, g = l * 0.96, b = l;
        } else if (m === FIXED) {
          r = FR[k], g = FG[k], b = FB[k];
        } else if (m === SEA) {
          // grey sea, and the surf running in white along the shore
          const d = xc - shoreX(yc);
          let l = 0.27 + 0.05 * Math.sin(xc * 0.3 - yc * 2 + t * 1.2);
          const run = 1.2 + 0.8 * Math.sin(t * 0.8 + xc * 0.05);
          const foam = smooth(1.6, 0, Math.abs(d - run)) * (0.7 + 0.3 * noise(xc * 0.5 - t * 2, yc));
          const foam2 = smooth(1.2, 0, Math.abs(d - run - 7 - 2 * Math.sin(t * 0.6 + xc * 0.07))) * 0.6;
          const fo = Math.max(foam, foam2);
          l = mix(l, 1, fo);
          r = l * mix(0.62, 1, fo), g = l * mix(0.9, 1, fo), b = l * mix(0.95, 1, fo);
        } else if (m === SAND) {
          // the wide brown beach, darker and redder near, wet in patches
          const tex = fbm(xc * 0.09, yc * 0.5, 3);
          const tracks = smooth(0.62, 0.7, noise(xc * 0.05 + yc * 0.35, yc * 0.2)) * 0.08;
          let l = mix(0.66, 0.56, p) * (0.88 + 0.2 * tex) - tracks;
          r = l * 0.88, g = l * 0.56, b = l * 0.4;
          const puddle = smooth(0.62, 0.72, fbm(xc * 0.04, yc * 0.3, 3)) * 0.5;
          if (puddle) {
            const sl = skyAt(xc, HZ - (yc - HZ) * 0.8, drift);
            r = mix(r, sl * 0.9, puddle), g = mix(g, sl * 0.93, puddle), b = mix(b, sl * 0.97, puddle);
          }
          // the wet sand by the surf holds the sky
          const ws = smooth(-10, -1, xc - shoreX(yc)) * 0.5;
          r = mix(r, 0.55, ws), g = mix(g, 0.52, ws), b = mix(b, 0.5, ws);
        } else if (m === ROAD) {
          // wet asphalt: dark, the sky streaked down it, the lane lines and a crossing
          const u = (xc - roadL(yc)) / (roadR(yc) - roadL(yc));
          const streak = noise(u * 30, yc * 0.15 - t * 0.2);
          let l = 0.3 + 0.2 * streak * (0.4 + p);
          const z = 1 / (p + 0.03);
          if (Math.abs(u - 0.5) < 0.02 + 0.006 / (p + 0.05) && (z * 0.9) % 1 < 0.5) l = 0.8;
          if (Math.abs(u - 0.5) < 0.08 && p > 0.02 && (z * 0.9) % 1 < 0.5 && Math.abs(u - 0.5) > 0.06) l = 0.62;
          if (yc > 91 && yc < 97 && x % 4 < 2 && u > 0.05 && u < 0.6) l = 0.85; // the zebra crossing
          r = l * 0.95, g = l * 0.97, b = l;
        } else {
          // the promenade pavement
          const l = 0.62 + 0.06 * hash(x, y);
          r = l, g = l * 0.98, b = l * 0.96;
        }

        // cars and their reflections over the road
        if (hasCar[k] === 1) (r = CR[k]), (g = CG[k]), (b = CB[k]);
        else if (hasCar[k] === 2) (r += CR[k]), (g += CG[k]), (b += CB[k]);

        // the haze of the rain over everything further off
        const f = fog[k];
        if (f > 0.001) {
          const hl = 0.68;
          r = mix(r, hl * 0.94, f), g = mix(g, hl * 0.97, f), b = mix(b, hl, f);
        }

        // the lamp: a steady glow, and the double flash
        const ldx = xc - LAMP[0], ldy = yc - LAMP[1];
        const ld2 = ldx * ldx + ldy * ldy;
        const glow = 0.2 * Math.exp(-ld2 / 4) + fl * (1.3 * Math.exp(-ld2 / 8) + 0.3 * Math.exp(-Math.sqrt(ld2) / 10));
        if (glow > 0.003) (r += glow), (g += glow * 0.95), (b += glow * 0.8);

        // drizzle in front of everything, and splashes on the ground
        const rn = rain[k];
        if (rn) (r += rn * 0.62), (g += rn * 0.66), (b += rn * 0.72);
        if (yc > HZ + 4 && m !== FIXED && hash(k, Math.floor(t * 8)) < 0.008) (r += 0.15), (g += 0.16), (b += 0.17);

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

    // people on the sand, drawn last so the haze can take the far ones
    for (const [px, py, pp, ph] of PEOPLE) {
      const x = Math.round(px + Math.sin(t * 0.1 + ph * 6) * 2 * pp), y = Math.round(py);
      const h = Math.max(1, Math.round(3 * pp + 0.4));
      for (let i = 0; i < h; i++) {
        const k = (y - i) * W + x;
        if (k < 0 || k >= N) continue;
        out[k] = "•";
        if (color) color[k] = nearest(0.2 + 0.25 * (1 - pp), 0.18 + 0.25 * (1 - pp), 0.17 + 0.25 * (1 - pp));
      }
    }

    const lines = [];
    for (let y = 0; y < H; y++) lines.push(out.slice(y * W, (y + 1) * W).join(""));
    return lines.join("\n");
  };
}
