// Map layouts for Safe Blast levels
// Each map is two islands connected by bridges, Bedwars-style

import { TILE, BLOCK } from './IsoUtils.js';

// Generate a map for a given level (1-20)
export function generateMap(level) {
  // Map size scales with level
  const size = Math.min(25, 14 + Math.floor(level / 3));
  const mid = Math.floor(size / 2);

  // Create empty ground and block grids
  const ground = [];
  const blocks = [];
  for (let y = 0; y < size; y++) {
    ground.push(new Array(size).fill(TILE.VOID));
    blocks.push(new Array(size).fill(BLOCK.NONE));
  }

  // Island radius scales slightly with level
  const islandR = Math.min(5, 3 + Math.floor(level / 8));

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

  // Place safes
  const blueSafe = { x: blueCenter.x - 1, y: mid };
  const redSafe = { x: redCenter.x + 1, y: mid };
  blocks[blueSafe.y][blueSafe.x] = BLOCK.SAFE_BLUE;
  blocks[redSafe.y][redSafe.x] = BLOCK.SAFE_RED;

  // Initial defenses around safes (more at higher levels)
  const defenseDepth = Math.min(3, Math.floor(level / 4));
  if (defenseDepth > 0) {
    addDefenses(blocks, ground, blueSafe, defenseDepth, size);
    addDefenses(blocks, ground, redSafe, defenseDepth, size);
  }

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
];
