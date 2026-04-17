import * as THREE from 'three';
import { generateMap } from '../iso/MapData.js';
import { TILE, BLOCK, BLOCK_HP } from '../iso/IsoUtils.js';
import { buildWorld, tileToWorld, tileWalkable } from './world.js';
import { Bot3D } from './bot.js';
import { makeCharacter } from './character.js';

// Minimal-playable 3D SafeBlast. Logic: player walks, punches forward to
// deal damage, enemies wander + attack, destroying the red safe wins the
// level and pays out coins. Extras (shop, block placement, TNT, ranged
// weapons, resource generators) are intentionally NOT included in this
// first 3D pass; they are additive and can be layered in later.
export function createSafeBlastScene({
  canvas,
  level,
  username,
  onBack,
  onWin,
  onLose,
  ui,
}) {
  const mapData = generateMap(level);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec7ff);
  scene.fog = new THREE.Fog(0x8ec7ff, 30, 80);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);

  // Lighting
  const sun = new THREE.DirectionalLight(0xfff1c9, 2.2);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x6b9c4a, 0.7));

  // Build voxel world. Exposes .blockMeshes / .safeMeshes for mutation.
  const world = buildWorld(mapData);
  scene.add(world.group);

  // Player
  const player = makeCharacter({ shirt: 0x42a5f5, pants: 0x333333 });
  scene.add(player.group);
  const playerState = {
    cartX: mapData.blueSpawn.x + 0.5,
    cartY: mapData.blueSpawn.y + 0.5,
    hp: 100, maxHp: 100, alive: true,
    attackCooldown: 0,
    lastDirX: 1, lastDirY: 0,
    coins: 0,
  };
  const pos0 = tileToWorld(mapData, playerState.cartX, playerState.cartY);
  player.group.position.set(pos0.x, 0, pos0.z);

  // Safes (big blocks already rendered as blocks); track HP separately.
  const safeHp = {
    [`${mapData.blueSafe.x},${mapData.blueSafe.y}`]: BLOCK_HP[BLOCK.SAFE_BLUE],
    [`${mapData.redSafe.x},${mapData.redSafe.y}`]: BLOCK_HP[BLOCK.SAFE_RED],
  };

  // Block HPs
  const blockHp = {};
  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      const b = mapData.blocks[y][x];
      if (b !== BLOCK.NONE && b !== BLOCK.SAFE_BLUE && b !== BLOCK.SAFE_RED) {
        blockHp[`${x},${y}`] = BLOCK_HP[b] || 40;
      }
    }
  }

  const worldShim = {
    mapData,
    canMoveTo: (nx, ny) => tileWalkable(mapData, nx, ny),
    damageSafe,
    isSafeAlive: (team) => {
      const key = team === 'blue'
        ? `${mapData.blueSafe.x},${mapData.blueSafe.y}`
        : `${mapData.redSafe.x},${mapData.redSafe.y}`;
      return (safeHp[key] || 0) > 0;
    },
    getEntities: (team) => {
      if (team === 'blue') return [{ cartX: playerState.cartX, cartY: playerState.cartY, hp: playerState.hp, alive: playerState.alive, team: 'blue',
        takeDamage(amount) {
          if (!playerState.alive) return;
          playerState.hp -= amount;
          if (playerState.hp <= 0) { playerState.hp = 0; playerState.alive = false; endGame(false); }
          ui.setHp(playerState.hp);
        } }, ...bots.filter((b) => b.team === 'blue')];
      return bots.filter((b) => b.team === 'red');
    },
  };

  // Bots: 1 ally (blue) + scaling enemies
  const bots = [];
  const enemyCount = Math.min(3, 1 + Math.floor(level / 6));
  const ally = new Bot3D({ team: 'blue', difficulty: Math.max(1, level - 2),
    startX: mapData.blueSpawn.x, startY: mapData.blueSpawn.y + 1, world: worldShim });
  bots.push(ally);
  for (let i = 0; i < enemyCount; i++) {
    const e = new Bot3D({ team: 'red', difficulty: level,
      startX: mapData.redSpawn.x, startY: mapData.redSpawn.y - i, world: worldShim });
    bots.push(e);
  }
  for (const b of bots) scene.add(b.group);

  function damageSafe(pos, amount) {
    const key = `${pos.x},${pos.y}`;
    if (!(key in safeHp)) return;
    safeHp[key] -= amount;
    flashMesh(world.getBlockMesh(pos.x, pos.y), 0xff4444);
    if (safeHp[key] <= 0) {
      safeHp[key] = 0;
      mapData.blocks[pos.y][pos.x] = BLOCK.NONE;
      world.destroyBlock(pos.x, pos.y);
      const destroyedBlue = key === `${mapData.blueSafe.x},${mapData.blueSafe.y}`;
      endGame(!destroyedBlue);
    } else {
      ui.setSafeHp('red', safeHp[`${mapData.redSafe.x},${mapData.redSafe.y}`], BLOCK_HP[BLOCK.SAFE_RED]);
      ui.setSafeHp('blue', safeHp[`${mapData.blueSafe.x},${mapData.blueSafe.y}`], BLOCK_HP[BLOCK.SAFE_BLUE]);
    }
  }

  function damageBlock(x, y, amount) {
    const key = `${x},${y}`;
    if (!(key in blockHp)) return;
    blockHp[key] -= amount;
    flashMesh(world.getBlockMesh(x, y), 0xffaa00);
    if (blockHp[key] <= 0) {
      delete blockHp[key];
      mapData.blocks[y][x] = BLOCK.NONE;
      world.destroyBlock(x, y);
    }
  }

  let gameOverSent = false;
  function endGame(won) {
    if (gameOverSent) return;
    gameOverSent = true;
    if (won) {
      const reward = level * 10;
      playerState.coins += reward;
      ui.setCoins(playerState.coins);
      ui.showResult({ won: true, coins: reward, level });
      onWin && onWin({ level, coins: reward });
    } else {
      ui.showResult({ won: false, coins: 0, level });
      onLose && onLose({ level });
    }
  }

  function flashMesh(mesh, hex) {
    if (!mesh || !mesh.material) return;
    const orig = mesh.material.color.getHex();
    mesh.material.color.setHex(hex);
    setTimeout(() => { if (mesh && mesh.material) mesh.material.color.setHex(orig); }, 120);
  }

  // Input
  const keys = new Set();
  let yaw = 0, pitch = 0.55, distance = 14;
  let dragging = false, lastX = 0, lastY = 0;

  const keydown = (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === ' ' || k === 'e') playerAttack();
  };
  const keyup = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);

  function onMouseDown(e) {
    if (e.button === 0 && !e.target.closest('.sb3d-ui')) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
  }
  function onMouseMove(e) {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.005;
    pitch = Math.max(0.15, Math.min(1.3, pitch - (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  }
  function onMouseUp() { dragging = false; }
  function onWheel(e) { distance = Math.max(7, Math.min(25, distance + e.deltaY * 0.01)); e.preventDefault(); }
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function onTouchStart(e) { if (e.touches.length !== 1) return; dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (!dragging || e.touches.length !== 1) return;
    yaw -= (e.touches[0].clientX - lastX) * 0.005;
    pitch = Math.max(0.15, Math.min(1.3, pitch - (e.touches[0].clientY - lastY) * 0.005));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  }
  function onTouchEnd() { dragging = false; }
  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchmove', onTouchMove);
  canvas.addEventListener('touchend', onTouchEnd);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function playerAttack() {
    if (!playerState.alive || playerState.attackCooldown > 0 || gameOverSent) return;
    playerState.attackCooldown = 0.4;
    const range = 2.2;
    const dmg = 12;

    // Hit nearest enemy bot within range
    let hit = null, hitDist = range;
    for (const b of bots) {
      if (b.team === 'red' && b.alive) {
        const dx = b.cartX - playerState.cartX;
        const dy = b.cartY - playerState.cartY;
        const d = Math.hypot(dx, dy);
        if (d < hitDist) { hitDist = d; hit = b; }
      }
    }
    if (hit) {
      hit.takeDamage(dmg, playerState);
      flashMesh(hit.body, 0xff2222);
      return;
    }

    // Otherwise, try to mine a block directly in front of the player
    const fx = Math.floor(playerState.cartX + playerState.lastDirX);
    const fy = Math.floor(playerState.cartY + playerState.lastDirY);
    if (fx < 0 || fy < 0 || fx >= mapData.width || fy >= mapData.height) return;
    const block = mapData.blocks[fy][fx];
    if (block === BLOCK.SAFE_RED) {
      damageSafe({ x: fx, y: fy }, 10);
    } else if (block === BLOCK.SAFE_BLUE) {
      // can't mine own safe
    } else if (block !== BLOCK.NONE) {
      damageBlock(fx, fy, 15);
    }
  }

  const clock = new THREE.Clock();
  let running = true;
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  let walkPhase = 0;

  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!gameOverSent) {
      playerState.attackCooldown = Math.max(0, playerState.attackCooldown - dt);

      if (playerState.alive) {
        tmpForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        tmpRight.set(Math.cos(yaw), 0, -Math.sin(yaw));
        const dir = new THREE.Vector3();
        if (keys.has('w') || keys.has('arrowup')) dir.add(tmpForward);
        if (keys.has('s') || keys.has('arrowdown')) dir.sub(tmpForward);
        if (keys.has('d') || keys.has('arrowright')) dir.add(tmpRight);
        if (keys.has('a') || keys.has('arrowleft')) dir.sub(tmpRight);
        const moving = dir.lengthSq() > 0;
        if (moving) {
          dir.normalize().multiplyScalar(5 * dt);
          // Map cart coordinates move along world X (=cartX) and world Z (=cartY)
          const newX = playerState.cartX + dir.x;
          const newY = playerState.cartY + dir.z;
          if (tileWalkable(mapData, newX, playerState.cartY)) playerState.cartX = newX;
          if (tileWalkable(mapData, playerState.cartX, newY)) playerState.cartY = newY;
          // Keep facing direction for forward-attacks
          playerState.lastDirX = Math.abs(dir.x) > Math.abs(dir.z) ? Math.sign(dir.x) : 0;
          playerState.lastDirY = Math.abs(dir.z) >= Math.abs(dir.x) ? Math.sign(dir.z) : 0;
          const target = Math.atan2(dir.x, dir.z);
          let diff = target - player.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.group.rotation.y += diff * 0.25;
          walkPhase += dt * 10;
        }
        const swing = moving ? Math.sin(walkPhase) * 0.6 : 0;
        player.armL.rotation.x = swing;
        player.armR.rotation.x = -swing;
        player.legL.rotation.x = -swing;
        player.legR.rotation.x = swing;
        const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);
        player.group.position.x = wp.x;
        player.group.position.z = wp.z;
        player.group.position.y = moving ? Math.abs(Math.sin(walkPhase)) * 0.08 : Math.sin(performance.now() * 0.003) * 0.05;
        ui.setHp(playerState.hp);
      }

      // Update bots
      for (const b of bots) b.update(dt, { mapData, worldShim, bots, player: playerState, damageSafe, damageBlock });
      for (const b of bots) b.syncMesh(mapData);
    }

    // Camera follows player
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);
    const cx = wp.x + Math.sin(yaw) * Math.cos(pitch) * distance;
    const cz = wp.z + Math.cos(yaw) * Math.cos(pitch) * distance;
    const cy = 2 + Math.sin(pitch) * distance;
    camera.position.set(cx, cy, cz);
    camera.lookAt(wp.x, 2, wp.z);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // Start UI
  ui.setSafeHp('blue', BLOCK_HP[BLOCK.SAFE_BLUE], BLOCK_HP[BLOCK.SAFE_BLUE]);
  ui.setSafeHp('red', BLOCK_HP[BLOCK.SAFE_RED], BLOCK_HP[BLOCK.SAFE_RED]);
  ui.setHp(playerState.hp);
  ui.setCoins(0);

  return {
    dispose() {
      running = false;
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    },
    attack: playerAttack,
    getState: () => playerState,
  };
}
