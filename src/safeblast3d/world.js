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
  // Block a 3x3 footprint around each safe so the player and bots can't
  // clip through the visual 4x4 cube structure.
  for (const safe of [mapData.blueSafe, mapData.redSafe]) {
    if (!safe) continue;
    const centerBlock = mapData.blocks[safe.y][safe.x];
    const stillStanding = centerBlock === BLOCK.SAFE_BLUE || centerBlock === BLOCK.SAFE_RED;
    if (!stillStanding) continue;
    if (Math.abs(tx - safe.x) <= 1 && Math.abs(ty - safe.y) <= 1) return false;
  }
  return true;
}

export function buildWorld(mapData) {
  const group = new THREE.Group();
  const blockMeshes = {};

  // Wide decorative ocean extending past the arena so the world feels big.
  // Shares a single geometry/material to keep draw calls down.
  const oceanSize = 240;
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(oceanSize, oceanSize),
    new THREE.MeshLambertMaterial({ color: 0x2e67b8 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.6;
  ocean.receiveShadow = true;
  group.add(ocean);

  // Scattered distant islands - pure decoration, no collision.
  const distantMat = new THREE.MeshLambertMaterial({ color: 0x4a8a2a });
  const distantRockMat = new THREE.MeshLambertMaterial({ color: 0x7d7569 });
  const treeTrunk = new THREE.MeshLambertMaterial({ color: 0x6b4a22 });
  const treeLeaves = new THREE.MeshLambertMaterial({ color: 0x2e7d3a });
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.6, 6);
  const leavesGeo = new THREE.ConeGeometry(1.1, 2.4, 6);

  const radiusOut = Math.max(mapData.width, mapData.height) * 0.6 + 14;
  const islandCount = 10;
  for (let i = 0; i < islandCount; i++) {
    const a = (i / islandCount) * Math.PI * 2 + Math.random() * 0.25;
    const r = radiusOut + Math.random() * 14;
    const ix = Math.cos(a) * r;
    const iz = Math.sin(a) * r;

    const island = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3 + Math.random() * 2.5, 4 + Math.random() * 2.5, 1.2, 8),
      i % 3 === 0 ? distantRockMat : distantMat,
    );
    base.position.y = 0.2;
    island.add(base);
    // A couple of chunky trees
    const trees = 2 + Math.floor(Math.random() * 3);
    for (let t = 0; t < trees; t++) {
      const tg = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, treeTrunk); trunk.position.y = 1.6;
      const leaves = new THREE.Mesh(leavesGeo, treeLeaves); leaves.position.y = 3.4;
      tg.add(trunk); tg.add(leaves);
      tg.position.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
      island.add(tg);
    }
    island.position.set(ix, 0, iz);
    group.add(island);
  }

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

  // Blocks (including safes). Safes get a 4-wide x 4-tall wall structure
  // so they look like a real defensible objective rather than a single cube.
  const cubeGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      const b = mapData.blocks[y][x];
      if (b === BLOCK.NONE) continue;
      const wp = tileToWorld(mapData, x + 0.5, y + 0.5);
      const isSafe = b === BLOCK.SAFE_BLUE || b === BLOCK.SAFE_RED;

      if (isSafe) {
        // Blue safe sits on the left (low x), red on the right (high x);
        // each one's door faces inward toward the bridge.
        const facing = b === BLOCK.SAFE_BLUE ? 1 : -1;
        const safe = makeSafeStructure(BLOCK_COLORS[b], facing);
        safe.position.set(wp.x, 0, wp.z);
        group.add(safe);
        blockMeshes[`${x},${y}`] = safe;
      } else {
        const mat = new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[b] || 0xffffff });
        const mesh = new THREE.Mesh(cubeGeo, mat);
        mesh.position.set(wp.x, 0.5, wp.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        blockMeshes[`${x},${y}`] = mesh;
      }
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

// 4x4x4 chunky safe with door, dial, handle, hinges, and corner rivets.
// `facing` is +1 (blue safe, door faces +X) or -1 (red safe, door faces -X).
// All body cubes share one material so flashMesh can tint the whole shell.
function makeSafeStructure(color, facing) {
  const safe = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const doorMat = new THREE.MeshLambertMaterial({ color: shade(color, 0.55) });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const goldMat = new THREE.MeshLambertMaterial({ color: 0xffcc33, emissive: 0x553300, emissiveIntensity: 0.4 });
  const dialMat = new THREE.MeshLambertMaterial({ color: 0xc8c8c8 });

  const spacing = 0.9;
  const cubeGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  const halfSpan = 1.5 * spacing; // outer surface offset from centre
  const totalH = 4 * spacing;     // 3.6 - top of safe

  // 4x4x4 body: 64 cubes
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let depth = 0; depth < 4; depth++) {
        const c = new THREE.Mesh(cubeGeo, bodyMat);
        c.position.set(
          (depth - 1.5) * spacing,
          row * spacing + spacing / 2,
          (col - 1.5) * spacing,
        );
        c.castShadow = true;
        c.receiveShadow = true;
        safe.add(c);
      }
    }
  }

  // Front face X offset (where the door lives)
  const frontX = facing * (halfSpan + 0.45);

  // Door panel: a darker recessed slab, slightly smaller than the front
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, totalH - 0.6, 4 * spacing - 0.6),
    doorMat,
  );
  door.position.set(facing * (halfSpan + 0.05), totalH / 2, 0);
  door.castShadow = true;
  safe.add(door);

  // Combination dial: outer ring + inner notch
  const dialRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.18, 20),
    dialMat,
  );
  dialRing.rotation.z = Math.PI / 2;
  dialRing.position.set(frontX, totalH / 2 + 0.1, 0);
  safe.add(dialRing);

  const dialKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.24, 12),
    metalMat,
  );
  dialKnob.rotation.z = Math.PI / 2;
  dialKnob.position.set(frontX + facing * 0.08, totalH / 2 + 0.1, 0);
  safe.add(dialKnob);

  // Tick marker on the dial (small gold notch at 12 o'clock)
  const tick = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.12, 0.06),
    goldMat,
  );
  tick.position.set(frontX, totalH / 2 + 0.55, 0);
  safe.add(tick);

  // Pull handle: horizontal bar to the right of the dial (looking at door)
  const handleArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.9),
    metalMat,
  );
  handleArm.position.set(frontX, totalH / 2 - 0.5, facing * 0.7);
  safe.add(handleArm);
  const handleStub = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.22),
    metalMat,
  );
  handleStub.position.set(frontX, totalH / 2 - 0.5, facing * 1.15);
  safe.add(handleStub);

  // Hinges: two on the opposite side of the door (away from the handle)
  const hingeGeo = new THREE.BoxGeometry(0.14, 0.4, 0.4);
  for (const yPos of [0.6, totalH - 0.6]) {
    const h = new THREE.Mesh(hingeGeo, metalMat);
    h.position.set(frontX, yPos, -facing * 1.45);
    safe.add(h);
  }

  // Gold rivets in the four corners of the door
  const rivetGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const rivetCorners = [
    [-1.45,  0.35], [ 1.45,  0.35],
    [-1.45,  totalH - 0.35], [ 1.45,  totalH - 0.35],
  ];
  for (const [z, y] of rivetCorners) {
    const r = new THREE.Mesh(rivetGeo, goldMat);
    r.position.set(frontX, y, z);
    safe.add(r);
  }

  safe.userData.material = bodyMat;
  return safe;
}

function shade(hex, factor) {
  const r = Math.max(0, Math.min(255, Math.floor(((hex >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.floor(((hex >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor((hex & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}
