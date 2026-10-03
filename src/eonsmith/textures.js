// ============================================================================
//  textures.js — procedural PBR textures generated in code (no image files).
//  We build a fractal-noise height field, then derive a colour map, a
//  roughness map and a normal map from it. This gives the ground real surface
//  detail and lighting response instead of a flat painted colour.
// ============================================================================
import * as THREE from 'three';

// --- tiny value-noise so the texture is varied but smooth -------------------
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s); // 0..1
}
function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash(xi, yi), tr = hash(xi + 1, yi);
  const bl = hash(xi, yi + 1), br = hash(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(tl, tr, u), THREE.MathUtils.lerp(bl, br, u), v);
}
// fractal (several octaves stacked) -> rich detail at multiple scales
function fbm(x, y) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < 5; o++) {
    sum += amp * valueNoise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// Builds { map, normalMap, roughnessMap } for a grassy ground surface.
export function makeGroundTextures(size = 512) {
  // 1) height field
  const h = new Float32Array(size * size);
  const SCALE = 6; // how many noise cells across the tile
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      h[y * size + x] = fbm((x / size) * SCALE, (y / size) * SCALE);
    }
  }

  // 2) colour map — grass with darker hollows and occasional dirt patches
  const colCanvas = makeCanvas(size);
  const cctx = colCanvas.getContext('2d');
  const img = cctx.createImageData(size, size);
  const grassDark = [54, 92, 44], grassLight = [104, 150, 70], dirt = [108, 86, 58];
  for (let i = 0; i < size * size; i++) {
    const n = h[i];
    // low-frequency mask decides where dirt shows through
    const px = i % size, py = (i / size) | 0;
    const dirtMask = fbm((px / size) * 2 + 11, (py / size) * 2 + 7);
    const t = smooth(n);
    let r = THREE.MathUtils.lerp(grassDark[0], grassLight[0], t);
    let g = THREE.MathUtils.lerp(grassDark[1], grassLight[1], t);
    let b = THREE.MathUtils.lerp(grassDark[2], grassLight[2], t);
    if (dirtMask > 0.62) {
      const d = smooth((dirtMask - 0.62) / 0.38);
      r = THREE.MathUtils.lerp(r, dirt[0], d);
      g = THREE.MathUtils.lerp(g, dirt[1], d);
      b = THREE.MathUtils.lerp(b, dirt[2], d);
    }
    const o = i * 4;
    img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  cctx.putImageData(img, 0, 0);

  // 3) roughness map — slightly varied, mostly matte
  const rgCanvas = makeCanvas(size);
  const rctx = rgCanvas.getContext('2d');
  const rImg = rctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(200 + h[i] * 55); // 0.78..1.0 roughness
    const o = i * 4;
    rImg.data[o] = rImg.data[o + 1] = rImg.data[o + 2] = v; rImg.data[o + 3] = 255;
  }
  rctx.putImageData(rImg, 0, 0);

  // 4) normal map — from the height field via a Sobel gradient
  const nCanvas = makeCanvas(size);
  const nctx = nCanvas.getContext('2d');
  const nImg = nctx.createImageData(size, size);
  const STRENGTH = 2.2;
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * STRENGTH;
      const dy = (at(x, y + 1) - at(x, y - 1)) * STRENGTH;
      // normal = normalize(-dx, -dy, 1) mapped to 0..255
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      nImg.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      nImg.data[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      nImg.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      nImg.data[o + 3] = 255;
    }
  }
  nctx.putImageData(nImg, 0, 0);

  // wrap into Three textures
  const map = new THREE.CanvasTexture(colCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(nCanvas);
  const roughnessMap = new THREE.CanvasTexture(rgCanvas);
  for (const t of [map, normalMap, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, normalMap, roughnessMap };
}

// A subtle leaf-dapple texture: mostly bright with darker speckles, so it
// MULTIPLIES the green foliage material to add organic mottling without
// changing the colour (it's grayscale — the green comes from the material).
export function makeLeafTextures(size = 128) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const S = 5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * S, (y / size) * S);
      let v = 0.84 + n * 0.2;       // ~0.84..1.04 brightness
      if (n < 0.35) v *= 0.82;      // occasional darker gaps between leaf clumps
      const c = Math.min(255, v * 255) | 0;
      const o = (y * size + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = c; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  return { map };
}

// A grainy tan sand texture for lake beaches (large soft patches + fine speckle).
export function makeSandTexture(size = 128) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const base = [224, 209, 154];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const patch = fbm((x / size) * 5, (y / size) * 5);  // gentle variation
      const grain = hash(x * 1.3, y * 1.7);               // fine speckle
      const v = 0.9 + (patch - 0.5) * 0.18 + (grain - 0.5) * 0.16;
      const o = (y * size + x) * 4;
      img.data[o] = Math.min(255, base[0] * v);
      img.data[o + 1] = Math.min(255, base[1] * v);
      img.data[o + 2] = Math.min(255, base[2] * v);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 4);
  return map;
}

// A soft dark circle that lies flat under a tree, so it reads as "planted"
// even though nothing casts a real shadow. One shared texture for all trees.
export function makeContactDecal(size = 128) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, r * 0.1, r, r, r);
  g.addColorStop(0, 'rgba(18,14,9,0.5)');
  g.addColorStop(0.6, 'rgba(18,14,9,0.22)');
  g.addColorStop(1, 'rgba(18,14,9,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
