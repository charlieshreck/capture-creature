// Map layouts for Safe Blast levels
// Each map is two islands connected by bridges, Bedwars-style

import { TILE, BLOCK } from './IsoUtils.js';

// Generate a map for a given level (1-20)
export function generateMap(level) {
  // Fixed map size for every level - same arena regardless of level.
  const size = 35;
  const mid = Math.floor(size / 2);

  // Create empty ground and block grids
  const ground = [];
  const blocks = [];
  for (let y = 0; y < size; y++) {
    ground.push(new Array(size).fill(TILE.VOID));
    blocks.push(new Array(size).fill(BLOCK.NONE));
  }

  // Fixed island radius for every level - same shape every time.
  const islandR = 10;

  // Blue island (bottom-left area)
  const blueCenter = { x: islandR + 1, y: mid };
  fillIsland(ground, blueCenter.x, blueCenter.y, islandR, TILE.GRASS);

  // Red island (top-right area)
  const redCenter = { x: size - islandR - 2, y: mid };
  fillIsland(ground, redCenter.x, redCenter.y, islandR, TILE.STONE);

  // Bridge(s) connecting islands
  const bridgeY = mid;
  for (let x = blueCenter.x + islandR - 1; x <= redCenter.x - islandR + 1; x++) {
    ground[bridgeY][x] = TILE.WOOD;
    // Wider bridges at higher levels
    if (level >= 5 && bridgeY > 0) ground[bridgeY - 1][x] = TILE.WOOD;
    if (level >= 5 && bridgeY < size - 1) ground[bridgeY + 1][x] = TILE.WOOD;
  }

  // Second bridge for levels 8+
  if (level >= 8 && mid >= 4) {
    const bridge2Y = mid - 3;
    for (let x = blueCenter.x + islandR - 1; x <= redCenter.x - islandR + 1; x++) {
      ground[bridge2Y][x] = TILE.WOOD;
    }
    const bridge3Y = mid + 3;
    for (let x = blueCenter.x + islandR - 1; x <= redCenter.x - islandR + 1; x++) {
      if (bridge3Y < size) ground[bridge3Y][x] = TILE.WOOD;
    }
  }

  // Resource island in the middle for levels 5+
  if (level >= 5) {
    const midIslandX = mid;
    fillIsland(ground, midIslandX, mid, 2, TILE.SAND);
  }

  // Place safes at the BACK of each island (a couple tiles in from the
  // outer edge), so the player has the whole island to traverse before
  // reaching the enemy safe.
  const blueSafe = { x: Math.max(2, blueCenter.x - islandR + 2), y: mid };
  const redSafe = { x: Math.min(size - 3, redCenter.x + islandR - 2), y: mid };
  blocks[blueSafe.y][blueSafe.x] = BLOCK.SAFE_BLUE;
  blocks[redSafe.y][redSafe.x] = BLOCK.SAFE_RED;

  // No auto-defence blocks: the 4x4 safe wall is its own defence and any
  // adjacent blocks would just clip into it.

  // Generators
  const generators = [];
  // Each island gets a bronze generator
  generators.push({ x: blueCenter.x + 1, y: mid, type: 'bronze', interval: 2000 });
  generators.push({ x: redCenter.x - 1, y: mid, type: 'bronze', interval: 2000 });

  // Bridge midpoint gets silver
  const bridgeMidX = Math.floor((blueCenter.x + redCenter.x) / 2);
  generators.push({ x: bridgeMidX, y: bridgeY, type: 'silver', interval: 5000 });

  // Center island gets gold for levels 5+
  if (level >= 5) {
    generators.push({ x: mid, y: mid, type: 'gold', interval: 8000 });
  }

  // Mark generator tiles
  for (const gen of generators) {
    if (gen.type === 'gold') {
      ground[gen.y][gen.x] = TILE.GOLD_GEN;
    } else {
      ground[gen.y][gen.x] = TILE.GENERATOR;
    }
  }

  // Which abilities red enemies can cast: none through level 20, flame only
  // for 21-25, both flame and water for 26+.
  let enemyAbilities = [];
  if (level >= 26) enemyAbilities = ['flame', 'water'];
  else if (level >= 21) enemyAbilities = ['flame'];

  // Beefier HP past level 30, and a much larger jump past 40 so the Dragon
  // Bite ability actually matters.
  let enemyHp = 100;
  if (level > 40) enemyHp = 400 + (level - 40) * 60;       // 41:460, 50:1000
  else if (level > 30) enemyHp = 100 + (level - 30) * 30;  // 31:130, 40:400

  return {
    level,
    name: MAP_NAMES[level - 1] || `Level ${level}`,
    width: size,
    height: size,
    ground,
    blocks,
    blueSpawn: { x: blueCenter.x + 1, y: mid + 1 },
    redSpawn: { x: redCenter.x - 1, y: mid - 1 },
    blueSafe,
    redSafe,
    generators,
    aiDifficulty: level,
    enemyAbilities,
    enemyHp,
  };
}

function fillIsland(ground, cx, cy, radius, tile) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      // Diamond shape
      if (Math.abs(dx) + Math.abs(dy) <= radius) {
        const y = cy + dy;
        const x = cx + dx;
        if (y >= 0 && y < ground.length && x >= 0 && x < ground[0].length) {
          ground[y][x] = tile;
        }
      }
    }
  }
}

function addDefenses(blocks, ground, safe, depth, size) {
  // Place wool blocks around safe
  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
  ];
  for (const d of dirs) {
    for (let i = 1; i <= depth; i++) {
      const bx = safe.x + d.dx * i;
      const by = safe.y + d.dy * i;
      if (bx >= 0 && bx < size && by >= 0 && by < size &&
          ground[by][bx] !== TILE.VOID && blocks[by][bx] === BLOCK.NONE) {
        // Inner ring = stone, outer = wool
        blocks[by][bx] = i === 1 ? BLOCK.WOOD : BLOCK.WOOL;
      }
    }
  }
  // Corners for depth 2+
  if (depth >= 2) {
    const corners = [{ dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }];
    for (const c of corners) {
      const bx = safe.x + c.dx;
      const by = safe.y + c.dy;
      if (bx >= 0 && bx < size && by >= 0 && by < size &&
          ground[by][bx] !== TILE.VOID && blocks[by][bx] === BLOCK.NONE) {
        blocks[by][bx] = BLOCK.WOOL;
      }
    }
  }
}

const MAP_NAMES = [
  'First Stand',
  'Bridge Clash',
  'Twin Paths',
  'Stone Arena',
  'Gold Rush',
  'The Divide',
  'Fortress',
  'Triple Bridge',
  'Iron Walls',
  'The Gauntlet',
  'Diamond Isle',
  'War Zone',
  'Sky Bridge',
  'Obsidian Keep',
  'The Crucible',
  'Lava Bridge',
  'Crystal Cavern',
  'Final Stand',
  'Kings Court',
  'Ultimate Arena',
  // 21-25: enemies cast Flame Throw
  'Ember Front',
  'Ashwalk',
  'Pyre Plains',
  'Scorchfield',
  'Cinder Gate',
  // 26-30: enemies cast Flame AND Water
  'Stormpeak',
  'Tidal Tower',
  'Elemental Spire',
  'Dual Storm',
  'Champions Arena',
  // 31-40: same Flame + Water, but enemies have rapidly growing HP
  'Iron Bastion',
  'Steelheart',
  'Granite Spire',
  'Adamant Reach',
  'Tempest Hold',
  'Cataclysm',
  'Dread Sanctum',
  'Eternal Forge',
  'Apex Citadel',
  'Sovereign',
  // 41-50: dragon-tier HP - bring the Dragon Bite ability
  'Wyrm Pit',
  'Scalebound',
  'Dragonmaw',
  'Emberthrone',
  'Verdant Wyrm',
  'Ancient Keep',
  'Drake Reach',
  'Skyclaw',
  'Wyrmlord',
  'Dragon Apex',
];
