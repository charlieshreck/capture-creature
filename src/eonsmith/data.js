// ============================================================================
//  Eonsmith — all game data lives here.
//  Want to add a building, change a cost, or tweak the tech tree? Do it here.
//  Nothing else in the game hard-codes balance numbers.
// ============================================================================
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// The resources the player manages. `label` and `icon` are for the HUD.
export const RESOURCES = {
  wood:     { label: 'Wood',     icon: '🪵' },
  stone:    { label: 'Stone',    icon: '🪨' },
  food:     { label: 'Food',     icon: '🌾' },
  energy:   { label: 'Energy',   icon: '⚡' },
  research: { label: 'Research', icon: '🔬' },
};

// What the player starts with.
export const STARTING_RESOURCES = {
  wood: 60,
  stone: 30,
  food: 25,
  energy: 0,
  research: 0,
};

// A tiny trickle of research every second so the very early game can always
// progress even before a workshop exists.
export const BASE_RESEARCH_PER_SEC = 0.15;

// ----------------------------------------------------------------------------
//  Mesh helpers — small, readable factories that build each structure out of
//  primitives with PBR (semi-realistic) materials. We cache materials by colour
//  so we don't make thousands of copies.
// ----------------------------------------------------------------------------
const _materialCache = new Map();

function mat(THREE, color, { rough = 0.85, metal = 0.0, emissive = 0x000000 } = {}) {
  const key = `${color}-${rough}-${metal}-${emissive}`;
  if (!_materialCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive });
    m.envMapIntensity = 1.1; // catch reflections from the sky environment
    _materialCache.set(key, m);
  }
  return _materialCache.get(key);
}

// Add a box; x/z are centre, y is the BOTTOM of the box (so things sit on the
// ground or stack neatly). Returns the mesh so callers can tweak it.
// We use RoundedBoxGeometry so edges catch light softly instead of looking
// like hard, toy-ish cubes.
function box(THREE, group, w, h, d, x, yBottom, z, material) {
  const radius = Math.min(0.12, Math.min(w, h, d) * 0.25);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), material);
  m.position.set(x, yBottom + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function cone(THREE, group, radius, h, x, yBottom, z, material, segments = 4) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(radius, h, segments), material);
  m.position.set(x, yBottom + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function cyl(THREE, group, rTop, rBot, h, x, yBottom, z, material, segments = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  m.position.set(x, yBottom + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// ----------------------------------------------------------------------------
//  ITEMS — things you can hold in your hotbar and store in your backpack
//  (Minecraft-style). `icon` is the emoji shown in the slot. Add new items
//  here, then you can make them craftable later.
// ----------------------------------------------------------------------------
export const ITEMS = {
  wooden_pickaxe: {
    name: 'Wooden Pickaxe', icon: '⛏️',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M10 18 Q32 8 54 18 Q40 22 32 24 Q24 22 10 18 Z" fill="#a9743f" stroke="#6e451f" stroke-width="2.5" stroke-linejoin="round"/><rect x="29" y="22" width="6" height="34" rx="3" fill="#8a5a2b" stroke="#5e4022" stroke-width="2"/></svg>`,
  },
  crafting_table: { name: 'Crafting Table', icon: '🧰' },
  // wood & stone get little drawn pictures (SVG) of what they look like.
  wood: {
    name: 'Wood Log', icon: '🪵',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="14" y="18" width="44" height="28" rx="9" fill="#8a5a2b" stroke="#4a3318" stroke-width="2.5"/><ellipse cx="20" cy="32" rx="9" ry="14" fill="#a9743f" stroke="#4a3318" stroke-width="2.5"/><ellipse cx="20" cy="32" rx="5" ry="8" fill="#8a5a2b" stroke="#6e451f" stroke-width="1.5"/><ellipse cx="20" cy="32" rx="2" ry="3.5" fill="#6e451f"/><path d="M32 23 H54 M33 32 H55 M32 41 H54" stroke="#6e451f" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
  },
  stone: {
    name: 'Stone', icon: '🪨',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="14,40 20,20 40,14 54,26 52,46 30,53" fill="#9a948a" stroke="#5f5b52" stroke-width="2.5" stroke-linejoin="round"/><path d="M20,20 L34,30 L40,14 M34,30 L30,53 M34,30 L52,46 M34,30 L14,40" stroke="#6f6a60" stroke-width="1.6" fill="none"/></svg>`,
  },
  sapling: { name: 'Sapling', icon: '🌱' },
  sand: {
    name: 'Sand', icon: '🟨',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="6" fill="#e3d39a" stroke="#b9a86f" stroke-width="3"/><circle cx="20" cy="22" r="2.4" fill="#c9b877"/><circle cx="38" cy="18" r="2" fill="#c9b877"/><circle cx="46" cy="34" r="2.6" fill="#c9b877"/><circle cx="27" cy="40" r="2.2" fill="#c9b877"/><circle cx="16" cy="45" r="1.8" fill="#c9b877"/><circle cx="42" cy="48" r="2" fill="#c9b877"/></svg>`,
  },
  dirt: {
    name: 'Dirt', icon: '🟫',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="6" fill="#7a5230" stroke="#4a3318" stroke-width="3"/><rect x="10" y="11" width="44" height="9" rx="2" fill="#4c8a3e"/><circle cx="20" cy="36" r="2.4" fill="#5e4022"/><circle cx="38" cy="32" r="2" fill="#5e4022"/><circle cx="45" cy="45" r="2.6" fill="#5e4022"/><circle cx="26" cy="47" r="2.2" fill="#5e4022"/><circle cx="16" cy="46" r="1.8" fill="#634326"/></svg>`,
  },
  // crafted: fill the whole 3×3 grid with wood to make one (see CRAFTING in ui.js)
  wall: {
    name: 'Wood Wall', icon: '🟫',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="7" y="7" width="50" height="50" rx="6" fill="#8a5a2b" stroke="#4a3318" stroke-width="3"/></svg>`,
  },
  stick: {
    name: 'Stick', icon: '🥢',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M14 52 L50 14" stroke="#6e451f" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M32 34 L45 39" stroke="#6e451f" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M28 38 L21 29" stroke="#6e451f" stroke-width="4.5" stroke-linecap="round" fill="none"/></svg>`,
  },
  stone_pickaxe: {
    name: 'Stone Pickaxe', icon: '⛏️',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M10 18 Q32 8 54 18 Q40 22 32 24 Q24 22 10 18 Z" fill="#9a948a" stroke="#5f5b52" stroke-width="2.5" stroke-linejoin="round"/><rect x="29" y="22" width="6" height="34" rx="3" fill="#8a5a2b" stroke="#4a3318" stroke-width="2"/></svg>`,
  },
  wheat_seed: {
    name: 'Wheat Seeds', icon: '🌰',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="24" cy="36" rx="6" ry="10" fill="#d8c48a" stroke="#a8915a" stroke-width="2" transform="rotate(-20 24 36)"/><ellipse cx="40" cy="30" rx="6" ry="10" fill="#e2cf95" stroke="#a8915a" stroke-width="2" transform="rotate(25 40 30)"/></svg>`,
  },
  wheat: { name: 'Wheat', icon: '🌾' },
  iron: {
    name: 'Iron', icon: '⚙️',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="8" fill="#9a9088" stroke="#5f5b52" stroke-width="3"/><circle cx="22" cy="24" r="4" fill="#d7b079"/><circle cx="41" cy="34" r="5" fill="#cba36a"/><circle cx="27" cy="45" r="3.5" fill="#d7b079"/></svg>`,
  },
  iron_pickaxe: {
    name: 'Iron Pickaxe', icon: '⛏️',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M10 18 Q32 8 54 18 Q40 22 32 24 Q24 22 10 18 Z" fill="#d9dde2" stroke="#7f8893" stroke-width="2.5" stroke-linejoin="round"/><rect x="29" y="22" width="6" height="34" rx="3" fill="#8a5a2b" stroke="#5e4022" stroke-width="2"/></svg>`,
  },
  emerald: {
    name: 'Emerald', icon: '🟩',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="32,8 54,28 32,58 10,28" fill="#2ec27e" stroke="#1b7a4b" stroke-width="3" stroke-linejoin="round"/><polygon points="32,8 44,28 32,38 20,28" fill="#54d999"/></svg>`,
  },
  diamond: {
    name: 'Diamond', icon: '💎',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="32,8 54,26 32,58 10,26" fill="#6fd6e0" stroke="#2f8c97" stroke-width="3" stroke-linejoin="round"/><polygon points="32,8 44,26 32,38 20,26" fill="#aef0f6"/></svg>`,
  },
  farm_base: {
    name: 'Farm Base', icon: '🟫',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="6" fill="#6e4a28" stroke="#4a3318" stroke-width="3"/><line x1="8" y1="22" x2="56" y2="22" stroke="#5a3c20" stroke-width="3"/><line x1="8" y1="34" x2="56" y2="34" stroke="#5a3c20" stroke-width="3"/><line x1="8" y1="46" x2="56" y2="46" stroke="#5a3c20" stroke-width="3"/></svg>`,
  },
};

// What the player starts holding. Keys are hotbar slot numbers (0 = first slot).
export const STARTING_INVENTORY = {
  0: 'wooden_pickaxe',
  1: 'crafting_table',
};

// ----------------------------------------------------------------------------
//  CRAFTING RECIPES — shown in the crafting table's "Things you can make" list.
//  `all: 'wood'`  means: fill every one of the 9 grid slots with wood.
//  `shape: [...]` is the 3×3 grid (slots 0-8, left→right, top→bottom); an item
//                 id means that slot must hold it, null means it must be empty.
//  `needs` is for the picture/label; `out`/`count` is what you get.
// ----------------------------------------------------------------------------
export const RECIPES = [
  { out: 'wall', count: 1, all: 'wood', needs: { wood: 9 } },
  // two logs stacked (top-middle + middle) → 8 sticks
  { out: 'stick', count: 8, needs: { wood: 2 },
    shape: [null, 'wood', null, null, 'wood', null, null, null, null] },
  // all three pickaxes use the SAME shape, just a different material
  { out: 'wooden_pickaxe', count: 1, needs: { wood: 3, stick: 2 },
    shape: [null, 'wood', null, 'wood', 'stick', 'wood', null, 'stick', null] },
  { out: 'stone_pickaxe', count: 1, needs: { stone: 3, stick: 2 },
    shape: [null, 'stone', null, 'stone', 'stick', 'stone', null, 'stick', null] },
  { out: 'iron_pickaxe', count: 1, needs: { iron: 3, stick: 2 },
    shape: [null, 'iron', null, 'iron', 'stick', 'iron', null, 'stick', null] },
  // farm base: wood around the edge, dirt in the middle
  { out: 'farm_base', count: 1, needs: { wood: 8, dirt: 1 },
    shape: ['wood', 'wood', 'wood', 'wood', 'dirt', 'wood', 'wood', 'wood', 'wood'] },
];

// ----------------------------------------------------------------------------
//  ERAS — purely cosmetic grouping/labels for the build menu. The real
//  progression is the tech tree (`requires` + `research`) below.
// ----------------------------------------------------------------------------
export const ERAS = ['Settlement', 'Medieval', 'Industrial', 'Modern', 'Future'];

// ----------------------------------------------------------------------------
//  BUILDINGS
//  id        unique key
//  name/desc shown in the build menu
//  era       cosmetic grouping
//  cost      resources spent to place one
//  research  research points needed to UNLOCK it (0 = available from the start)
//  requires  id of a building that must be unlocked first (the tech tree edges)
//  footprint [width, depth] in world units (used for grid + collision)
//  buildTime seconds the avatar spends constructing it
//  population people it houses (capacity)
//  produces  resources generated per second once built
//  consumes  resources spent per second once built
//  make      (THREE) => THREE.Group, pivot at the base so it can rise from y=0
// ----------------------------------------------------------------------------
export const BUILDINGS = [
  // ---------------- Settlement ----------------
  {
    id: 'campfire',
    name: 'Campfire',
    desc: 'The first spark. Your settlement begins here.',
    era: 'Settlement',
    cost: { wood: 5 },
    research: 0,
    requires: null,
    footprint: [2, 2],
    buildTime: 1.5,
    population: 0,
    produces: { research: 0.05 },
    make(THREE) {
      const g = new THREE.Group();
      // ring of stones
      const stone = mat(THREE, 0x8a8377, { rough: 0.95 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        box(THREE, g, 0.4, 0.3, 0.4, Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7, stone);
      }
      // logs
      box(THREE, g, 0.25, 0.25, 1.1, 0, 0.05, 0, mat(THREE, 0x6b4a2b));
      box(THREE, g, 1.1, 0.25, 0.25, 0, 0.18, 0, mat(THREE, 0x5a3f24));
      // flame
      cone(THREE, g, 0.35, 0.9, 0, 0.3, 0, mat(THREE, 0xff7a18, { emissive: 0xcc4400 }), 6);
      return g;
    },
  },
  {
    id: 'tent',
    name: 'Tent',
    desc: 'Simple shelter. Houses a few villagers.',
    era: 'Settlement',
    cost: { wood: 15 },
    research: 0,
    requires: null,
    footprint: [3, 3],
    buildTime: 2.5,
    population: 3,
    produces: {},
    make(THREE) {
      const g = new THREE.Group();
      const hide = mat(THREE, 0xb98a5a);
      cone(THREE, g, 1.4, 2.2, 0, 0, 0, hide, 4);
      // door flap
      box(THREE, g, 0.6, 0.9, 0.05, 0, 0, 1.0, mat(THREE, 0x6b4a2b));
      return g;
    },
  },
  {
    id: 'woodcutter',
    name: "Woodcutter's Hut",
    desc: 'Steady supply of wood from the forest.',
    era: 'Settlement',
    cost: { wood: 10, stone: 5 },
    research: 0,
    requires: null,
    footprint: [3, 3],
    buildTime: 3,
    population: 1,
    produces: { wood: 0.6 },
    make(THREE) {
      const g = new THREE.Group();
      box(THREE, g, 2, 1.4, 2, 0, 0, 0, mat(THREE, 0x7a5230));
      cone(THREE, g, 1.7, 1.1, 0, 1.4, 0, mat(THREE, 0x4f7a3a), 4);
      // stacked logs beside it
      cyl(THREE, g, 0.18, 0.18, 1.2, 1.4, 0.18, 0.4, mat(THREE, 0x8a5a2b)).rotation.z = Math.PI / 2;
      return g;
    },
  },
  {
    id: 'quarry',
    name: 'Quarry',
    desc: 'Cut stone from the earth.',
    era: 'Settlement',
    cost: { wood: 20 },
    research: 5,
    requires: 'woodcutter',
    footprint: [4, 4],
    buildTime: 4,
    population: 2,
    produces: { stone: 0.5 },
    make(THREE) {
      const g = new THREE.Group();
      const rock = mat(THREE, 0x9b938a, { rough: 1 });
      box(THREE, g, 1.4, 0.6, 1.4, -0.7, 0, -0.7, rock);
      box(THREE, g, 1.0, 1.0, 1.0, 0.6, 0, 0.4, rock);
      box(THREE, g, 0.8, 0.4, 0.8, 0.2, 0, -0.9, rock);
      box(THREE, g, 0.5, 1.6, 0.5, 1.2, 0, 1.2, mat(THREE, 0x6b4a2b)); // crane post
      return g;
    },
  },
  {
    id: 'farm',
    name: 'Farm',
    desc: 'Grows food to feed a growing population.',
    era: 'Settlement',
    cost: { wood: 25, stone: 5 },
    research: 8,
    requires: null,
    footprint: [5, 5],
    buildTime: 4,
    population: 2,
    produces: { food: 1.0 },
    make(THREE) {
      const g = new THREE.Group();
      // tilled field
      box(THREE, g, 4.4, 0.15, 4.4, 0, 0, 0, mat(THREE, 0x6e4a26, { rough: 1 }));
      const crop = mat(THREE, 0x8fbf3f);
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) box(THREE, g, 1.0, 0.5, 0.3, i * 1.3, 0.15, j * 1.3, crop);
      return g;
    },
  },

  // ---------------- Medieval ----------------
  {
    id: 'house',
    name: 'Cottage',
    desc: 'A sturdy home. Houses many more villagers.',
    era: 'Medieval',
    cost: { wood: 30, stone: 20 },
    research: 15,
    requires: 'quarry',
    footprint: [4, 4],
    buildTime: 5,
    population: 6,
    produces: {},
    make(THREE) {
      const g = new THREE.Group();
      box(THREE, g, 2.6, 1.8, 2.6, 0, 0, 0, mat(THREE, 0xd8c9a8));
      // timber frame accents
      box(THREE, g, 2.7, 0.15, 0.15, 0, 0.9, 1.3, mat(THREE, 0x5a3f24));
      // roof
      const roof = mat(THREE, 0x933b2b);
      cone(THREE, g, 2.1, 1.3, 0, 1.8, 0, roof, 4).rotation.y = Math.PI / 4;
      box(THREE, g, 0.4, 0.7, 0.4, 0.7, 1.8, 0, mat(THREE, 0x6b4a2b)); // chimney
      return g;
    },
  },
  {
    id: 'workshop',
    name: 'Workshop',
    desc: 'Tinkerers research new ideas — your main source of Research.',
    era: 'Medieval',
    cost: { wood: 35, stone: 25 },
    research: 20,
    requires: 'house',
    footprint: [4, 4],
    buildTime: 5,
    population: 3,
    produces: { research: 0.5 },
    make(THREE) {
      const g = new THREE.Group();
      box(THREE, g, 3, 1.8, 2.6, 0, 0, 0, mat(THREE, 0xa9876a));
      box(THREE, g, 3.2, 0.4, 2.8, 0, 1.8, 0, mat(THREE, 0x6b4a2b));
      cyl(THREE, g, 0.3, 0.3, 1.4, 1.0, 2.2, 0, mat(THREE, 0x555555)); // chimney/flue
      box(THREE, g, 0.9, 0.9, 0.05, 0, 0.5, 1.3, mat(THREE, 0x9fd0e0, { emissive: 0x224455 }));
      return g;
    },
  },
  {
    id: 'windmill',
    name: 'Windmill',
    desc: 'Grinds grain and pumps food production higher.',
    era: 'Medieval',
    cost: { wood: 40, stone: 30 },
    research: 30,
    requires: 'farm',
    footprint: [4, 4],
    buildTime: 6,
    population: 2,
    produces: { food: 2.0 },
    make(THREE) {
      const g = new THREE.Group();
      cyl(THREE, g, 1.0, 1.4, 3.0, 0, 0, 0, mat(THREE, 0xe8e2d2), 16);
      cone(THREE, g, 1.3, 0.9, 0, 3.0, 0, mat(THREE, 0x6b4a2b), 16);
      // sail hub + blades (animated by the engine via userData.spin)
      const blades = new THREE.Group();
      blades.position.set(0, 2.6, 1.3);
      for (let i = 0; i < 4; i++) {
        const b = box(THREE, blades, 0.25, 2.6, 0.1, 0, 0, 0, mat(THREE, 0xc9b89a));
        b.position.y = 0;
        b.rotation.z = (i / 4) * Math.PI * 2;
        b.geometry.translate(0, 1.3, 0);
      }
      blades.userData.spin = true;
      g.add(blades);
      g.userData.blades = blades;
      return g;
    },
  },

  // ---------------- Industrial ----------------
  {
    id: 'factory',
    name: 'Factory',
    desc: 'Mass production. Burns through wood for a flood of stone & energy.',
    era: 'Industrial',
    cost: { wood: 60, stone: 50 },
    research: 50,
    requires: 'workshop',
    footprint: [6, 6],
    buildTime: 7,
    population: 8,
    produces: { stone: 1.5, energy: 1.0 },
    consumes: { wood: 0.8 },
    make(THREE) {
      const g = new THREE.Group();
      box(THREE, g, 5, 2.6, 4, 0, 0, 0, mat(THREE, 0x8a8f96, { metal: 0.3, rough: 0.6 }));
      // sawtooth roof
      for (let i = -1; i <= 1; i++) box(THREE, g, 1.4, 0.6, 4, i * 1.5, 2.6, 0, mat(THREE, 0x6f757c));
      cyl(THREE, g, 0.4, 0.5, 2.4, -1.8, 2.6, -1.3, mat(THREE, 0x55504c)); // smokestack
      cyl(THREE, g, 0.4, 0.5, 2.0, -1.0, 2.6, -1.3, mat(THREE, 0x55504c));
      return g;
    },
  },
  {
    id: 'mine',
    name: 'Deep Mine',
    desc: 'Industrial extraction of stone and ore.',
    era: 'Industrial',
    cost: { wood: 50, stone: 40, energy: 10 },
    research: 60,
    requires: 'factory',
    footprint: [5, 5],
    buildTime: 7,
    population: 6,
    produces: { stone: 3.0 },
    consumes: { energy: 0.5 },
    make(THREE) {
      const g = new THREE.Group();
      box(THREE, g, 2, 1.2, 2, 0, 0, 0, mat(THREE, 0x6f6258));
      // headframe tower
      const steel = mat(THREE, 0x4a4f55, { metal: 0.5, rough: 0.5 });
      box(THREE, g, 0.2, 3.4, 0.2, -0.7, 0, -0.7, steel);
      box(THREE, g, 0.2, 3.4, 0.2, 0.7, 0, -0.7, steel);
      box(THREE, g, 0.2, 3.4, 0.2, -0.7, 0, 0.7, steel);
      box(THREE, g, 0.2, 3.4, 0.2, 0.7, 0, 0.7, steel);
      cyl(THREE, g, 0.6, 0.6, 0.3, 0, 3.4, 0, steel); // wheel
      return g;
    },
  },

  // ---------------- Modern ----------------
  {
    id: 'apartment',
    name: 'Apartment Block',
    desc: 'High-density housing for a modern city.',
    era: 'Modern',
    cost: { stone: 80, energy: 20 },
    research: 90,
    requires: 'factory',
    footprint: [5, 5],
    buildTime: 8,
    population: 30,
    produces: {},
    consumes: { energy: 0.4 },
    make(THREE) {
      const g = new THREE.Group();
      const concrete = mat(THREE, 0xb8bcc2, { rough: 0.6 });
      box(THREE, g, 3.4, 6.5, 3.4, 0, 0, 0, concrete);
      // window grid
      const glass = mat(THREE, 0x7fb6d6, { rough: 0.2, metal: 0.1, emissive: 0x122733 });
      for (let y = 0; y < 5; y++)
        for (let x = -1; x <= 1; x++) box(THREE, g, 0.7, 0.7, 0.05, x * 1.0, 0.8 + y * 1.2, 1.71, glass);
      return g;
    },
  },
  {
    id: 'solar',
    name: 'Solar Plant',
    desc: 'Clean energy from the sun.',
    era: 'Modern',
    cost: { stone: 40, energy: 5 },
    research: 100,
    requires: 'mine',
    footprint: [6, 6],
    buildTime: 7,
    population: 2,
    produces: { energy: 4.0 },
    make(THREE) {
      const g = new THREE.Group();
      const panel = mat(THREE, 0x1c3a66, { rough: 0.25, metal: 0.2, emissive: 0x0a1830 });
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
          const p = box(THREE, g, 1.4, 0.1, 1.0, i * 1.7, 0.5, j * 1.7, panel);
          p.rotation.x = -0.5;
          box(THREE, g, 0.1, 0.5, 0.1, i * 1.7, 0, j * 1.7, mat(THREE, 0x555555));
        }
      return g;
    },
  },
  {
    id: 'lab',
    name: 'Research Lab',
    desc: 'Cutting-edge science accelerates every unlock.',
    era: 'Modern',
    cost: { stone: 70, energy: 30 },
    research: 130,
    requires: 'workshop',
    footprint: [5, 5],
    buildTime: 8,
    population: 5,
    produces: { research: 2.5 },
    consumes: { energy: 0.6 },
    make(THREE) {
      const g = new THREE.Group();
      box(THREE, g, 3.6, 2.4, 3.6, 0, 0, 0, mat(THREE, 0xe6ebf0, { rough: 0.4 }));
      cyl(THREE, g, 1.6, 1.6, 1.0, 0, 2.4, 0, mat(THREE, 0xcfd6dd, { rough: 0.3 }), 24); // dome base
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(THREE, 0x9fd6e8, { rough: 0.15, metal: 0.2, emissive: 0x224455 }),
      );
      dome.position.y = 3.4;
      dome.castShadow = true;
      g.add(dome);
      return g;
    },
  },

  // ---------------- Future ----------------
  {
    id: 'robotfactory',
    name: 'Robotics Plant',
    desc: 'Autonomous robots build faster than any human crew.',
    era: 'Future',
    cost: { stone: 120, energy: 80, research: 20 },
    research: 180,
    requires: 'lab',
    footprint: [7, 7],
    buildTime: 9,
    population: 10,
    produces: { stone: 5.0, energy: 2.0 },
    consumes: { energy: 1.0 },
    make(THREE) {
      const g = new THREE.Group();
      box(THREE, g, 5.5, 3.0, 5.5, 0, 0, 0, mat(THREE, 0x9aa3ad, { metal: 0.6, rough: 0.35 }));
      const glow = mat(THREE, 0x2fd0ff, { emissive: 0x0099cc, rough: 0.3, metal: 0.4 });
      box(THREE, g, 5.6, 0.2, 5.6, 0, 1.4, 0, glow); // neon band
      cyl(THREE, g, 0.4, 0.4, 2.0, -2.0, 3.0, -2.0, mat(THREE, 0x6f757c, { metal: 0.6 }));
      cyl(THREE, g, 0.4, 0.4, 2.0, 2.0, 3.0, 2.0, mat(THREE, 0x6f757c, { metal: 0.6 }));
      return g;
    },
  },
  {
    id: 'fusion',
    name: 'Fusion Reactor',
    desc: 'Limitless clean power for the city of tomorrow.',
    era: 'Future',
    cost: { stone: 150, energy: 50, research: 30 },
    research: 230,
    requires: 'solar',
    footprint: [7, 7],
    buildTime: 10,
    population: 4,
    produces: { energy: 15.0 },
    make(THREE) {
      const g = new THREE.Group();
      cyl(THREE, g, 2.6, 3.0, 1.2, 0, 0, 0, mat(THREE, 0xc6ccd2, { metal: 0.5, rough: 0.4 }), 24);
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.5, 16, 32),
        mat(THREE, 0x35e0ff, { emissive: 0x00aacc, rough: 0.2, metal: 0.3 }),
      );
      torus.position.y = 2.4;
      torus.rotation.x = Math.PI / 2;
      torus.castShadow = true;
      g.add(torus);
      g.userData.glowRing = torus;
      return g;
    },
  },
  {
    id: 'arcology',
    name: 'Arcology',
    desc: 'A self-contained mega-structure. The pinnacle of the city.',
    era: 'Future',
    cost: { stone: 300, energy: 200, research: 60 },
    research: 320,
    requires: 'robotfactory',
    footprint: [9, 9],
    buildTime: 14,
    population: 120,
    produces: { research: 3.0 },
    consumes: { energy: 3.0 },
    make(THREE) {
      const g = new THREE.Group();
      const shell = mat(THREE, 0xaeb8c4, { metal: 0.4, rough: 0.3 });
      // stepped pyramid-dome hybrid
      cyl(THREE, g, 3.0, 4.2, 3.5, 0, 0, 0, shell, 6);
      cyl(THREE, g, 1.8, 3.0, 3.0, 0, 3.5, 0, shell, 6);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(THREE, 0x6fe0c0, { emissive: 0x119977, rough: 0.2, metal: 0.3 }),
      );
      dome.position.y = 6.5;
      dome.castShadow = true;
      g.add(dome);
      return g;
    },
  },
];

// Quick lookup by id.
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

// ----------------------------------------------------------------------------
//  MILESTONES — the "goals" of the endless sandbox. Checked every tick; the
//  first time `test(state)` returns true, the toast fires once.
//  state = { population, totalBuilt, builtCounts:{id:n}, resources:{...} }
// ----------------------------------------------------------------------------
export const MILESTONES = [
  { id: 'firstfire', title: 'Let There Be Light', desc: 'You lit the first campfire.', test: (s) => (s.builtCounts.campfire || 0) >= 1 },
  { id: 'pop10', title: 'A Small Village', desc: 'Reached 10 population.', test: (s) => s.population >= 10 },
  { id: 'pop50', title: 'A Bustling Town', desc: 'Reached 50 population.', test: (s) => s.population >= 50 },
  { id: 'pop200', title: 'A Thriving City', desc: 'Reached 200 population.', test: (s) => s.population >= 200 },
  { id: 'industry', title: 'The Age of Industry', desc: 'Built your first factory.', test: (s) => (s.builtCounts.factory || 0) >= 1 },
  { id: 'science', title: 'Modern Science', desc: 'Built a research lab.', test: (s) => (s.builtCounts.lab || 0) >= 1 },
  { id: 'robots', title: 'Rise of the Robots', desc: 'Built a robotics plant.', test: (s) => (s.builtCounts.robotfactory || 0) >= 1 },
  { id: 'fusion', title: 'Power of the Stars', desc: 'Brought a fusion reactor online.', test: (s) => (s.builtCounts.fusion || 0) >= 1 },
  { id: 'arcology', title: 'City of Tomorrow', desc: 'Completed an arcology — the future is here.', test: (s) => (s.builtCounts.arcology || 0) >= 1 },
];
