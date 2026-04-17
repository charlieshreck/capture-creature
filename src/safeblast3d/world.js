import * as THREE from 'three';
import { TILE, BLOCK } from '../iso/IsoUtils.js';

const TILE_COLORS = {
  [TILE.GRASS]:     0x5fbb4a,
  [TILE.STONE]:     0x8b8b8b,
  [TILE.WOOD]:      0x8b5a2b,
  [TILE.SAND]:      0xe6d28b,
  [TILE.WATER]:     0x3f7cd6,
  [TILE.GENERATOR]: 0xc48b55,
  [TILE.GOLD_GEN]:  0xffcc33,
};

const BLOCK_COLORS = {
  [BLOCK.WOOL]:     0xf2f2f2,
  [BLOCK.WOOD]:     0x8b5a2b,
  [BLOCK.STONE]:    0x888888,
  [BLOCK.OBSIDIAN]: 0x2a2040,
  [BLOCK.SAFE_BLUE]: 0x42a5f5,
  [BLOCK.SAFE_RED]:  0xff4444,
};

// Map a cart (x,y) tile onto world coordinates. The map is centred on the
// origin so the camera doesn't have to compensate for map size.
export function tileToWorld(mapData, cartX, cartY) {
  const ox = -mapData.width / 2 + 0.5;
  const oz = -mapData.height / 2 + 0.5;
  return { x: cartX + ox, z: cartY + oz };
}

export function tileWalkable(mapData, cartX, cartY) {
  // cartX/Y are floats (player can stand between tile centres).
  // Test against the tile they currently overlap.
  const tx = Math.floor(cartX);
  const ty = Math.floor(cartY);
  if (tx < 0 || ty < 0 || tx >= mapData.width || ty >= mapData.height) return false;
  const g = mapData.ground[ty][tx];
  if (g === TILE.VOID || g === TILE.WATER) return false;
  const b = mapData.blocks[ty][tx];
  if (b !== BLOCK.NONE) return false;
  return true;
}

export function buildWorld(mapData) {
  const group = new THREE.Group();
  const blockMeshes = {};

  // Ground: one mesh per tile (simple and fast for maps up to 25x25)
  const tileGeo = new THREE.BoxGeometry(1, 0.3, 1);
  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      const t = mapData.ground[y][x];
      if (t === TILE.VOID) continue;
      const wp = tileToWorld(mapData, x + 0.5, y + 0.5);
      const mat = new THREE.MeshLambertMaterial({ color: TILE_COLORS[t] || 0x888888 });
      const mesh = new THREE.Mesh(tileGeo, mat);
      mesh.position.set(wp.x, -0.15, wp.z);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  // Generators get a glowing crystal on top for visibility
  const genCrystalGeo = new THREE.OctahedronGeometry(0.25);
  for (const gen of mapData.generators) {
    const color = gen.type === 'gold' ? 0xffd700 : gen.type === 'silver' ? 0xdddddd : 0xc48b55;
    const mat = new THREE.MeshBasicMaterial({ color });
    const wp = tileToWorld(mapData, gen.x + 0.5, gen.y + 0.5);
    const m = new THREE.Mesh(genCrystalGeo, mat);
    m.position.set(wp.x, 0.35, wp.z);
    group.add(m);
  }

  // Blocks (including safes)
  const cubeGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  const safeGeo = new THREE.BoxGeometry(0.95, 1.2, 0.95);
  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      const b = mapData.blocks[y][x];
      if (b === BLOCK.NONE) continue;
      const wp = tileToWorld(mapData, x + 0.5, y + 0.5);
      const mat = new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[b] || 0xffffff });
      const isSafe = b === BLOCK.SAFE_BLUE || b === BLOCK.SAFE_RED;
      const mesh = new THREE.Mesh(isSafe ? safeGeo : cubeGeo, mat);
      mesh.position.set(wp.x, isSafe ? 0.6 : 0.5, wp.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      blockMeshes[`${x},${y}`] = mesh;
    }
  }

  return {
    group,
    getBlockMesh(x, y) { return blockMeshes[`${x},${y}`]; },
    destroyBlock(x, y) {
      const key = `${x},${y}`;
      const m = blockMeshes[key];
      if (m) { group.remove(m); delete blockMeshes[key]; }
    },
  };
}
