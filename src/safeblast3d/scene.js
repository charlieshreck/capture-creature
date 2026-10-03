import * as THREE from 'three';
import { generateMap } from '../iso/MapData.js';
import { TILE, BLOCK, BLOCK_HP } from '../iso/IsoUtils.js';
import { buildWorld, tileToWorld, tileWalkable } from './world.js';
import { Bot3D } from './bot.js';
import { makeCharacter, attachSword } from './character.js';

// Minimal-playable 3D SafeBlast. Logic: player walks, punches forward to
// deal damage, enemies wander + attack, destroying the red safe wins the
// level and pays out coins. Extras (shop, block placement, TNT, ranged
// weapons, resource generators) are intentionally NOT included in this
// first 3D pass; they are additive and can be layered in later.
export function createSafeBlastScene({
  canvas,
  level,
  username,
  avatar,
  equippedAbilities,
  soldierLevel,
  abilityLevels,
  healthLevel,
  onBack,
  onWin,
  onLose,
  ui,
}) {
  // Damage multiplier per upgrade level (matches the soldier table).
  const ABILITY_DMG_MULT = [1.0, 1.3, 1.7, 2.2, 3.0];
  function abilityMult(id) {
    const lv = (abilityLevels && abilityLevels[id]) || 1;
    return ABILITY_DMG_MULT[Math.max(0, Math.min(4, lv - 1))];
  }
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
  const player = makeCharacter({ avatar: avatar || { outfit: 0, hat: 0 } });
  scene.add(player.group);
  attachSword(player, 'wooden_sword');
  const SWORD_STATS = {
    wooden_sword:  { damage: 8,  cooldown: 0.5, price: 0  },
    iron_sword:    { damage: 14, cooldown: 0.4, price: 20 },
    diamond_sword: { damage: 22, cooldown: 0.32, price: 50 },
  };
  const ABILITY_STATS = {
    flame:   { cooldown: 2.5, damage: 22 },
    water:   { cooldown: 3.0, damage: 28 },
    vine:    { cooldown: 2.8, damage: 25 },
    magma:   { cooldown: 5.0, damage: 10 },  // per second, DoT
    soldier: { cooldown: 8.0, damage: 0 },   // summon, damage handled by the spawned bot
    demon:   { cooldown: 4.0, damage: 40 },  // shadow pierces every enemy in a line
    dragon:  { cooldown: 6.0, damage: 60 },  // dragon head lunges and bites
    honey:   { cooldown: 0.6, damage: 0  },  // sticky trap, no damage
  };
  const playerMaxHp = 100 + (healthLevel || 0) * 10;
  const playerState = {
    cartX: mapData.blueSpawn.x + 0.5,
    cartY: mapData.blueSpawn.y + 0.5,
    hp: playerMaxHp, maxHp: playerMaxHp, alive: true,
    attackCooldown: 0,
    lastDirX: 1, lastDirY: 0,
    coins: 0,
    sword: 'wooden_sword',
    ownedSwords: ['wooden_sword'],
    // Abilities are bought in the hub; SafeBlast just reads what the
    // player has equipped there. No in-level buying.
    ownedAbilities: Array.isArray(equippedAbilities) ? equippedAbilities.slice() : [],
    abilityCooldown: { flame: 0, water: 0, vine: 0, magma: 0, soldier: 0, demon: 0, dragon: 0, honey: 0 },
  };

  // Live particle/projectile effects tracked here and ticked each frame.
  // An effect is { update(dt) -> boolean done, dispose() }.
  const activeEffects = [];
  // Honey traps: active sticky patches that root bots standing in them.
  // Declared up here so the render loop below can reference them safely.
  const MAX_HONEY = 10;
  const honeyTraps = [];
  const honeyDiscGeo = new THREE.CircleGeometry(1.4, 24);
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

  // Coin drops from resource generators. Each generator has its own timer;
  // periodically it spawns a floating coin above itself that the player can
  // walk through to collect. Colour and value depend on generator type.
  const COIN_META = {
    bronze: { color: 0xc48b55, value: 1, interval: 3.2 },
    silver: { color: 0xdddddd, value: 5, interval: 7 },
    gold:   { color: 0xffd700, value: 10, interval: 10 },
  };
  const generators = mapData.generators.map((g) => ({ ...g, timer: (COIN_META[g.type] || COIN_META.bronze).interval * Math.random() }));
  const coins = [];
  const coinGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);

  function spawnCoin(gen) {
    const meta = COIN_META[gen.type] || COIN_META.bronze;
    const mat = new THREE.MeshLambertMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 0.35 });
    const mesh = new THREE.Mesh(coinGeo, mat);
    const wp = tileToWorld(mapData, gen.x + 0.5, gen.y + 0.5);
    mesh.position.set(wp.x, 1.0, wp.z);
    mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    scene.add(mesh);
    coins.push({ mesh, cartX: gen.x + 0.5, cartY: gen.y + 0.5, value: meta.value, born: performance.now(), bob: Math.random() * Math.PI * 2 });
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
          ui.setHp(playerState.hp, playerState.maxHp);
        } }, ...bots.filter((b) => b.team === 'blue')];
      return bots.filter((b) => b.team === 'red');
    },
  };

  // Enemy red bots only - no AI ally on the player's side
  const bots = [];
  const enemyCount = Math.min(3, 1 + Math.floor(level / 6));
  const enemyAbilities = Array.isArray(mapData.enemyAbilities) ? mapData.enemyAbilities : [];
  const enemyHp = (typeof mapData.enemyHp === 'number') ? mapData.enemyHp : 100;
  for (let i = 0; i < enemyCount; i++) {
    const e = new Bot3D({
      team: 'red', difficulty: level,
      startX: mapData.redSpawn.x, startY: mapData.redSpawn.y - i,
      world: worldShim,
      abilities: enemyAbilities,
    });
    e.maxHp = enemyHp;
    e.hp = enemyHp;
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
      const winBonus = level * 10;
      playerState.coins += winBonus;
      ui.setCoins(playerState.coins);
      ui.showResult({ won: true, coins: playerState.coins, level });
      onWin && onWin({ level, coins: playerState.coins });
    } else {
      // Still keep whatever generator coins were collected before dying
      ui.showResult({ won: false, coins: playerState.coins, level });
      onLose && onLose({ level, coins: playerState.coins });
    }
  }

  function flashMesh(obj, hex) {
    if (!obj) return;
    // A safe is a Group with a shared material in userData; a regular block
    // or bot body is a Mesh with .material directly.
    const mat = (obj.material && obj.material.color)
      ? obj.material
      : (obj.userData && obj.userData.material);
    if (!mat || !mat.color) return;
    const orig = mat.color.getHex();
    mat.color.setHex(hex);
    setTimeout(() => mat.color.setHex(orig), 120);
  }

  // Input
  const keys = new Set();
  let yaw = 0, pitch = 0.55, distance = 14;
  let dragging = false, lastX = 0, lastY = 0;

  const keydown = (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === ' ' || k === 'f') playerAttack();
    // Keys 1-8 map to the N-th equipped ability (compact slot order).
    if (k >= '1' && k <= '8') {
      const idx = parseInt(k, 10) - 1;
      const abilityId = playerState.ownedAbilities[idx];
      if (abilityId) castAbility(abilityId);
    }
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

  // Track mouse position in normalized device coords for ability aiming.
  const mouseNdc = new THREE.Vector2(0, 0);
  function onMouseAim(e) {
    mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNdc.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }
  window.addEventListener('mousemove', onMouseAim);

  const _aimRay = new THREE.Raycaster();
  const _aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2); // chest height
  const _aimHit = new THREE.Vector3();
  // Returns a { fx, fz } unit vector from the player toward the world point
  // under the mouse. Falls back to camera-yaw forward if the ray misses.
  function computeAimDirection() {
    _aimRay.setFromCamera(mouseNdc, camera);
    const hit = _aimRay.ray.intersectPlane(_aimPlane, _aimHit);
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);
    if (hit) {
      const dx = _aimHit.x - wp.x;
      const dz = _aimHit.z - wp.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) return { fx: dx / d, fz: dz / d };
    }
    // Fallback: camera-yaw forward (matches old behaviour)
    return { fx: -Math.sin(yaw), fz: -Math.cos(yaw) };
  }

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
    const sword = SWORD_STATS[playerState.sword] || SWORD_STATS.wooden_sword;
    playerState.attackCooldown = sword.cooldown;
    const range = 2.2;
    const dmg = sword.damage;

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

    // Try to damage the enemy safe if we're standing next to it. The 4x4
    // safe wall extends ~2 tiles from its centre, so the player can't get
    // closer than ~2 tiles - allow up to ~3 to feel forgiving.
    const safe = mapData.redSafe;
    if (safe && mapData.blocks[safe.y][safe.x] === BLOCK.SAFE_RED) {
      const sdx = (safe.x + 0.5) - playerState.cartX;
      const sdy = (safe.y + 0.5) - playerState.cartY;
      if (Math.hypot(sdx, sdy) < 3.2) {
        // Must kill all enemies before the safe can be broken.
        const enemiesAlive = bots.some((b) => b.team === 'red' && b.alive);
        if (enemiesAlive) {
          if (ui.showToast) ui.showToast("Can't break safe yet - kill the enemy first!");
          return;
        }
        damageSafe({ x: safe.x, y: safe.y }, dmg);
        return;
      }
    }

    // Otherwise, mine a block directly in front of the player
    const fx = Math.floor(playerState.cartX + playerState.lastDirX);
    const fy = Math.floor(playerState.cartY + playerState.lastDirY);
    if (fx < 0 || fy < 0 || fx >= mapData.width || fy >= mapData.height) return;
    const block = mapData.blocks[fy][fx];
    if (block !== BLOCK.NONE && block !== BLOCK.SAFE_BLUE && block !== BLOCK.SAFE_RED) {
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
      for (const id of Object.keys(playerState.abilityCooldown)) {
        const prev = playerState.abilityCooldown[id];
        if (prev > 0) {
          playerState.abilityCooldown[id] = Math.max(0, prev - dt);
          const cd = ABILITY_STATS[id] ? ABILITY_STATS[id].cooldown : 1;
          if (ui.setAbilityCooldown) ui.setAbilityCooldown(id, playerState.abilityCooldown[id] / cd);
        }
      }
      // Tick visual effects
      for (let i = activeEffects.length - 1; i >= 0; i--) {
        const done = activeEffects[i].update(dt);
        if (done) {
          activeEffects[i].dispose();
          activeEffects.splice(i, 1);
        }
      }

      if (playerState.alive) {
        // Q / E rotate the camera (alternative to mouse drag)
        const rotSpeed = 2.0;
        if (keys.has('q')) yaw += rotSpeed * dt;
        if (keys.has('e')) yaw -= rotSpeed * dt;

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
        ui.setHp(playerState.hp, playerState.maxHp);
      }

      // Update bots
      // Honey traps: any bot inside any trap is rooted (player is exempt).
      // Animate bubble bob for visual life.
      if (honeyTraps.length) {
        const tNow = performance.now();
        const ox = -mapData.width / 2 + 0.5;
        const oz = -mapData.height / 2 + 0.5;
        for (const trap of honeyTraps) {
          for (const bub of trap.bubbles) {
            bub.mesh.position.y = bub.base + Math.sin(tNow * 0.005 + bub.phase) * 0.08;
          }
          for (const b of bots) {
            if (!b.alive || b.dying) continue;
            const bwx = b.cartX + ox;
            const bwz = b.cartY + oz;
            const dx = bwx - trap.x;
            const dz = bwz - trap.z;
            if (Math.hypot(dx, dz) < trap.radius) {
              b.rooted = true;
              b.rootedUntil = tNow + 250;
            }
          }
        }
      }

      for (const b of bots) b.update(dt, { mapData, worldShim, bots, player: playerState, damageSafe, damageBlock, castEnemyAbility });
      for (const b of bots) b.syncMesh(mapData, camera);

      // Generator coin drops
      for (const gen of generators) {
        const meta = COIN_META[gen.type] || COIN_META.bronze;
        gen.timer -= dt;
        if (gen.timer <= 0) { gen.timer = meta.interval; spawnCoin(gen); }
      }
      // Coin float + pickup
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.mesh.position.y = 1.0 + Math.sin(performance.now() * 0.004 + c.bob) * 0.12;
        c.mesh.rotation.z += dt * 3;
        const d = Math.hypot(c.cartX - playerState.cartX, c.cartY - playerState.cartY);
        if (d < 0.75) {
          playerState.coins += c.value;
          ui.setCoins(playerState.coins);
          scene.remove(c.mesh);
          c.mesh.geometry && c.mesh.material && c.mesh.material.dispose();
          coins.splice(i, 1);
        }
      }
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
  ui.setHp(playerState.hp, playerState.maxHp);
  ui.setCoins(0);
  ui.setSword(playerState.sword, playerState.ownedSwords);
  if (ui.setAbilities) ui.setAbilities(playerState.ownedAbilities);

  function castAbility(id) {
    if (!playerState.alive || gameOverSent) return false;
    if (!playerState.ownedAbilities.includes(id)) return false;
    const ab = ABILITY_STATS[id];
    if (!ab) return false;
    if (playerState.abilityCooldown[id] > 0) return false;
    playerState.abilityCooldown[id] = ab.cooldown;
    const m = abilityMult(id);
    if (id === 'flame') castFlame(Math.round(ab.damage * m));
    else if (id === 'water') castWater(Math.round(ab.damage * m));
    else if (id === 'vine') castVine(Math.round(ab.damage * m));
    else if (id === 'magma') castMagma(Math.round(ab.damage * m));
    else if (id === 'soldier') castSoldier();
    else if (id === 'demon') castDemon(Math.round(ab.damage * m));
    else if (id === 'dragon') castDragon(Math.round(ab.damage * m));
    else if (id === 'honey') castHoney();
    return true;
  }

  function castFlame(damage) {
    const aim = computeAimDirection();
    const fx = aim.fx, fz = aim.fz;
    // Snap player to face the aim direction so the cast reads naturally
    player.group.rotation.y = Math.atan2(fx, fz);

    // Damage any enemy bot in a forward cone within 5 tiles
    const range = 5;
    for (const b of bots) {
      if (b.team !== 'red' || !b.alive) continue;
      const dx = b.cartX - playerState.cartX;
      const dz = b.cartY - playerState.cartY;
      const d = Math.hypot(dx, dz);
      if (d < 0.01 || d > range) continue;
      const dot = (dx * fx + dz * fz) / d;
      if (dot > 0.55) {
        b.takeDamage(damage, playerState);
        flashMesh(b.body, 0xff7722);
      }
    }

    // Spawn a burst of fire particles tumbling forward + upward
    const flameGroup = new THREE.Group();
    scene.add(flameGroup);
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);
    const pGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const colors = [0xff3300, 0xff6a00, 0xffa500, 0xffd24a];
    const particles = [];
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true, opacity: 1,
      });
      const m = new THREE.Mesh(pGeo, mat);
      m.position.set(wp.x + fx * 0.6, 1.3, wp.z + fz * 0.6);
      flameGroup.add(m);
      const spread = 0.7;
      const sp = 4 + Math.random() * 5;
      particles.push({
        mesh: m, mat,
        vx: fx * sp + (Math.random() - 0.5) * spread * sp,
        vz: fz * sp + (Math.random() - 0.5) * spread * sp,
        vy: Math.random() * 1.6 + 0.3,
        life: 0.45 + Math.random() * 0.35,
        age: 0,
      });
    }
    activeEffects.push({
      update(dt) {
        let alive = 0;
        for (const p of particles) {
          p.age += dt;
          if (p.age >= p.life) { p.mesh.visible = false; continue; }
          alive++;
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 3 * dt; // slight gravity
          const t = p.age / p.life;
          p.mat.opacity = 1 - t;
          const s = 1 + t * 1.1;
          p.mesh.scale.set(s, s, s);
        }
        return alive === 0;
      },
      dispose() {
        scene.remove(flameGroup);
        for (const p of particles) { p.mesh.geometry.dispose(); p.mat.dispose(); }
      },
    });
  }

  function castWater(damage) {
    const aim = computeAimDirection();
    const fx = aim.fx, fz = aim.fz;
    player.group.rotation.y = Math.atan2(fx, fz);
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);

    // Main water orb
    const orbGeo = new THREE.SphereGeometry(0.38, 14, 12);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x3dabff, transparent: true, opacity: 0.92 });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(wp.x + fx * 0.7, 1.35, wp.z + fz * 0.7);
    scene.add(orb);

    // Inner core for brightness
    const coreGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.95 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(orb.position);
    scene.add(core);

    const trailGroup = new THREE.Group();
    scene.add(trailGroup);
    const trails = [];
    const dropGeo = new THREE.SphereGeometry(0.12, 6, 6);

    const speed = 16;
    const maxRange = 14;
    let traveled = 0;
    let hit = false;
    let splashTimer = 0;
    const splashGroup = new THREE.Group();
    scene.add(splashGroup);
    const splashes = [];
    const ox = -mapData.width / 2 + 0.5;
    const oz = -mapData.height / 2 + 0.5;

    function spawnSplash() {
      const sGeo = new THREE.SphereGeometry(0.12, 6, 6);
      for (let i = 0; i < 22; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x55bbff : 0xdff4ff, transparent: true, opacity: 1 });
        const m = new THREE.Mesh(sGeo, mat);
        m.position.copy(orb.position);
        splashGroup.add(m);
        const a = Math.random() * Math.PI * 2;
        const up = Math.random() * 1.2;
        const sp = 3 + Math.random() * 4;
        splashes.push({
          mesh: m, mat,
          vx: Math.cos(a) * sp, vz: Math.sin(a) * sp,
          vy: up * sp + 2,
          age: 0, life: 0.55,
        });
      }
    }

    activeEffects.push({
      update(dt) {
        // While flying
        if (!hit) {
          const step = speed * dt;
          orb.position.x += fx * step;
          orb.position.z += fz * step;
          core.position.copy(orb.position);
          traveled += step;

          // Trail droplets
          if (Math.random() < 0.7) {
            const mat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.9 });
            const d = new THREE.Mesh(dropGeo, mat);
            d.position.copy(orb.position);
            d.position.y -= 0.05 + Math.random() * 0.15;
            trailGroup.add(d);
            trails.push({ mesh: d, mat, age: 0, life: 0.35, vy: -1.2 });
          }

          // Hit check
          const orbCartX = orb.position.x - ox;
          const orbCartY = orb.position.z - oz;
          for (const b of bots) {
            if (b.team !== 'red' || !b.alive) continue;
            const dx = b.cartX - orbCartX;
            const dz = b.cartY - orbCartY;
            if (Math.hypot(dx, dz) < 1.1) {
              b.takeDamage(damage, playerState);
              flashMesh(b.body, 0x44aaff);
              hit = true;
              splashTimer = 0.55;
              spawnSplash();
              orb.visible = false;
              core.visible = false;
              break;
            }
          }
          if (!hit && traveled > maxRange) {
            hit = true;
            splashTimer = 0.35;
            spawnSplash();
            orb.visible = false;
            core.visible = false;
          }
        }

        // Update trails
        for (let i = trails.length - 1; i >= 0; i--) {
          const t = trails[i];
          t.age += dt;
          t.mesh.position.y += t.vy * dt;
          t.vy -= 6 * dt;
          t.mat.opacity = Math.max(0, 1 - t.age / t.life);
          if (t.age >= t.life) {
            trailGroup.remove(t.mesh);
            t.mesh.geometry.dispose();
            t.mat.dispose();
            trails.splice(i, 1);
          }
        }

        // Update splashes
        if (hit) {
          splashTimer -= dt;
          for (const s of splashes) {
            s.age += dt;
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            s.vy -= 14 * dt; // gravity
            s.mat.opacity = Math.max(0, 1 - s.age / s.life);
          }
        }

        return hit && splashTimer <= 0 && trails.length === 0;
      },
      dispose() {
        scene.remove(orb); scene.remove(core);
        orb.geometry.dispose(); orbMat.dispose();
        core.geometry.dispose(); coreMat.dispose();
        scene.remove(trailGroup);
        for (const t of trails) { t.mesh.geometry.dispose(); t.mat.dispose(); }
        scene.remove(splashGroup);
        for (const s of splashes) { s.mesh.geometry.dispose(); s.mat.dispose(); }
      },
    });
  }

  function castVine(damage) {
    const aim = computeAimDirection();
    const fx = aim.fx, fz = aim.fz;
    player.group.rotation.y = Math.atan2(fx, fz);
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);

    // AOE damage in a wide forward arc (wider than flame, shorter range)
    const range = 4;
    for (const b of bots) {
      if (b.team !== 'red' || !b.alive) continue;
      const dx = b.cartX - playerState.cartX;
      const dz = b.cartY - playerState.cartY;
      const d = Math.hypot(dx, dz);
      if (d < 0.01 || d > range) continue;
      const dot = (dx * fx + dz * fz) / d;
      if (dot > 0.35) {
        b.takeDamage(damage, playerState);
        flashMesh(b.body, 0x66cc55);
      }
    }

    // Visual: a fan of vines that grow, curl, then retract
    const vineGroup = new THREE.Group();
    scene.add(vineGroup);
    const vineGeo = new THREE.CylinderGeometry(0.12, 0.05, 1, 6);
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, emissive: 0x173f1a, emissiveIntensity: 0.4 });
    const tipMat = new THREE.MeshLambertMaterial({ color: 0x8bc34a, emissive: 0x3a5c1a, emissiveIntensity: 0.5 });
    const thornGeo = new THREE.ConeGeometry(0.1, 0.25, 4);
    const vines = [];
    const vineCount = 7;
    for (let i = 0; i < vineCount; i++) {
      const spread = (i / (vineCount - 1) - 0.5) * 1.4; // -0.7 .. +0.7 rad
      const angle = Math.atan2(fx, fz) + spread;
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const vine = new THREE.Mesh(vineGeo, vineMat);
      // Rotate cylinder so its length lies along dir (cylinders default along Y)
      vine.rotation.x = Math.PI / 2;
      // Place so the base is at the player and it extends forward
      const length = 0;
      vine.scale.y = 0.001;
      const halfLen = 1.0; // full length half (cyl geo is length 1)
      vine.position.set(wp.x, 1.2, wp.z);
      // Orient vine toward dir via parent group rotation
      const holder = new THREE.Group();
      holder.position.set(wp.x, 1.2, wp.z);
      holder.rotation.y = angle;
      // Inside holder, put a vine shaft along +Z
      const shaft = new THREE.Mesh(vineGeo, vineMat);
      shaft.rotation.x = -Math.PI / 2; // cylinder lies along Z
      shaft.position.set(0, 0, 0);      // scaled origin
      shaft.scale.set(1, 0.01, 1);      // start tiny (Y is length)
      holder.add(shaft);
      const tip = new THREE.Mesh(thornGeo, tipMat);
      tip.rotation.x = -Math.PI / 2;
      tip.position.set(0, 0, 0);
      holder.add(tip);
      vineGroup.add(holder);
      vines.push({ holder, shaft, tip, angle, dir, spread });
    }

    const duration = 0.45;
    let age = 0;
    activeEffects.push({
      update(dt) {
        age += dt;
        const t = age / duration;
        // Growth curve: ease-out to full, then retract
        const growth = t < 0.6
          ? (t / 0.6) // 0 -> 1 over first 60%
          : Math.max(0, 1 - (t - 0.6) / 0.4); // 1 -> 0 over last 40%
        const len = 3.2 * growth;
        for (const v of vines) {
          v.shaft.scale.y = Math.max(0.01, len);
          // Move shaft centre forward so base stays at origin
          v.shaft.position.z = len / 2;
          v.tip.position.z = len + 0.05;
          v.tip.scale.y = growth;
          // Slight wave
          v.holder.rotation.z = Math.sin(age * 18 + v.spread * 5) * 0.1 * growth;
        }
        return age >= duration;
      },
      dispose() {
        scene.remove(vineGroup);
        vineGeo.dispose(); vineMat.dispose();
        thornGeo.dispose(); tipMat.dispose();
      },
    });
  }

  function castMagma(dps) {
    const aim = computeAimDirection();
    player.group.rotation.y = Math.atan2(aim.fx, aim.fz);
    // Pool lands where the aim ray hit the ground, or 4 units ahead.
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);
    let poolX = wp.x + aim.fx * 4;
    let poolZ = wp.z + aim.fz * 4;
    _aimRay.setFromCamera(mouseNdc, camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (_aimRay.ray.intersectPlane(groundPlane, hit)) {
      poolX = hit.x; poolZ = hit.z;
    }

    const radius = 2.4;
    const duration = 4.0;
    const group = new THREE.Group();
    scene.add(group);

    // Magma disc
    const discGeo = new THREE.CircleGeometry(radius, 32);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xff4a00, transparent: true, opacity: 0.9 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(poolX, 0.08, poolZ);
    group.add(disc);

    // Inner bright core
    const coreGeo = new THREE.CircleGeometry(radius * 0.6, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffdd33, transparent: true, opacity: 0.9 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = -Math.PI / 2;
    core.position.set(poolX, 0.09, poolZ);
    group.add(core);

    // Ember particles rising from the pool
    const embers = [];
    const emberGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    function spawnEmber() {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.9;
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.5 ? 0xff6a00 : 0xffdd33,
        transparent: true, opacity: 1,
      });
      const m = new THREE.Mesh(emberGeo, mat);
      m.position.set(poolX + Math.cos(a) * r, 0.2, poolZ + Math.sin(a) * r);
      group.add(m);
      embers.push({ mesh: m, mat, vy: 1.5 + Math.random() * 1.5, age: 0, life: 0.8 });
    }

    let age = 0;
    let spawnAcc = 0;
    let damageAcc = 0;

    activeEffects.push({
      update(dt) {
        age += dt;
        spawnAcc += dt;
        while (spawnAcc > 0.05) { spawnAcc -= 0.05; spawnEmber(); }

        // Update embers
        for (let i = embers.length - 1; i >= 0; i--) {
          const e = embers[i];
          e.age += dt;
          e.mesh.position.y += e.vy * dt;
          e.mat.opacity = Math.max(0, 1 - e.age / e.life);
          if (e.age >= e.life) {
            group.remove(e.mesh);
            e.mesh.geometry.dispose();
            e.mat.dispose();
            embers.splice(i, 1);
          }
        }

        // DoT: apply dps-per-second to any red bot standing in the pool
        damageAcc += dt;
        if (damageAcc >= 0.25) {
          const tick = damageAcc;
          damageAcc = 0;
          const ox = -mapData.width / 2 + 0.5;
          const oz = -mapData.height / 2 + 0.5;
          for (const b of bots) {
            if (b.team !== 'red' || !b.alive) continue;
            const bwx = b.cartX + ox;
            const bwz = b.cartY + oz;
            const dx = bwx - poolX;
            const dz = bwz - poolZ;
            if (Math.hypot(dx, dz) < radius) {
              b.takeDamage(dps * tick, null);
              flashMesh(b.body, 0xff6a00);
              // Root the bot in place until the magma pool ends.
              b.rooted = true;
              b.rootedUntil = performance.now() + 350; // small grace beyond tick
            }
          }
        }

        // Fade disc near the end
        const fadeT = Math.max(0, (age - (duration - 0.8)) / 0.8);
        discMat.opacity = 0.9 * (1 - fadeT);
        coreMat.opacity = 0.9 * (1 - fadeT);

        // Also pulse the core
        const pulse = 0.6 + Math.sin(age * 8) * 0.08;
        core.scale.setScalar(pulse);

        return age >= duration;
      },
      dispose() {
        scene.remove(group);
        discGeo.dispose(); discMat.dispose();
        coreGeo.dispose(); coreMat.dispose();
        emberGeo.dispose();
        for (const e of embers) { e.mesh.geometry.dispose(); e.mat.dispose(); }
      },
    });
  }

  // Enemy bot casts an ability at the player. Scales with level. Returns
  // the cooldown seconds so the bot can delay its next cast.
  function castEnemyAbility(bot, id, target) {
    const wp = tileToWorld(mapData, bot.cartX, bot.cartY);
    const tp = tileToWorld(mapData, target.cartX, target.cartY);
    const dx = tp.x - wp.x;
    const dz = tp.z - wp.z;
    const d = Math.hypot(dx, dz) || 1;
    const fx = dx / d, fz = dz / d;

    function hurtTarget(amount) {
      const e0 = worldShim.getEntities('blue')[0];
      if (e0 && e0.takeDamage) e0.takeDamage(amount);
    }

    if (id === 'flame') {
      const dmg = 4 + Math.floor(level * 0.4);
      // Damage: if target is within cone+range of bot, hit them
      if (d < 5) {
        // We only damage the actual player shim, not other blue bots
        if (target.cartX === playerState.cartX && target.cartY === playerState.cartY) {
          hurtTarget(dmg);
        } else if (target.takeDamage) {
          target.takeDamage(dmg, bot);
        }
      }
      // Particle cone starting at bot
      const flameGroup = new THREE.Group(); scene.add(flameGroup);
      const pGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const colors = [0xff3300, 0xff6a00, 0xffa500, 0xffd24a];
      const particles = [];
      for (let i = 0; i < 22; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colors[i % 4], transparent: true, opacity: 1 });
        const m = new THREE.Mesh(pGeo, mat);
        m.position.set(wp.x + fx * 0.6, 1.2, wp.z + fz * 0.6);
        flameGroup.add(m);
        const spread = 0.7, sp = 3.5 + Math.random() * 4;
        particles.push({
          mesh: m, mat,
          vx: fx * sp + (Math.random() - 0.5) * spread * sp,
          vz: fz * sp + (Math.random() - 0.5) * spread * sp,
          vy: Math.random() * 1.4 + 0.3,
          life: 0.45 + Math.random() * 0.3, age: 0,
        });
      }
      activeEffects.push({
        update(dt) {
          let alive = 0;
          for (const p of particles) {
            p.age += dt;
            if (p.age >= p.life) { p.mesh.visible = false; continue; }
            alive++;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.vy -= 3 * dt;
            p.mat.opacity = 1 - p.age / p.life;
            const s = 1 + (p.age / p.life) * 1.1;
            p.mesh.scale.set(s, s, s);
          }
          return alive === 0;
        },
        dispose() {
          scene.remove(flameGroup);
          for (const p of particles) { p.mesh.geometry.dispose(); p.mat.dispose(); }
        },
      });
      return 6.0;
    }

    if (id === 'water') {
      const dmg = 6 + Math.floor(level * 0.5);
      // Projectile orb that tracks toward the target position once
      const orbGeo = new THREE.SphereGeometry(0.32, 12, 10);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0x3dabff, transparent: true, opacity: 0.92 });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(wp.x + fx * 0.7, 1.2, wp.z + fz * 0.7);
      scene.add(orb);

      const speed = 13;
      const maxRange = 12;
      let traveled = 0;
      let hit = false;
      let splashTimer = 0;
      const splashGroup = new THREE.Group(); scene.add(splashGroup);
      const splashes = [];
      const sGeo = new THREE.SphereGeometry(0.1, 6, 6);
      const ox = -mapData.width / 2 + 0.5;
      const oz = -mapData.height / 2 + 0.5;

      function spawnSplash() {
        for (let i = 0; i < 14; i++) {
          const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xdff4ff : 0x66ccff, transparent: true, opacity: 1 });
          const m = new THREE.Mesh(sGeo, mat);
          m.position.copy(orb.position);
          splashGroup.add(m);
          const a = Math.random() * Math.PI * 2;
          const sp = 2.5 + Math.random() * 3;
          splashes.push({
            mesh: m, mat,
            vx: Math.cos(a) * sp, vz: Math.sin(a) * sp,
            vy: 1 + Math.random() * 2,
            age: 0, life: 0.5,
          });
        }
      }

      activeEffects.push({
        update(dt) {
          if (!hit) {
            orb.position.x += fx * speed * dt;
            orb.position.z += fz * speed * dt;
            traveled += speed * dt;
            // Check hit on target (player or ally bot)
            const orbCartX = orb.position.x - ox;
            const orbCartY = orb.position.z - oz;
            const tx = target.cartX, ty = target.cartY;
            if (Math.hypot(tx - orbCartX, ty - orbCartY) < 1.1 && (target.alive !== false)) {
              hit = true;
              splashTimer = 0.5;
              spawnSplash();
              orb.visible = false;
              if (target.cartX === playerState.cartX && target.cartY === playerState.cartY) {
                hurtTarget(dmg);
              } else if (target.takeDamage) {
                target.takeDamage(dmg, bot);
              }
            } else if (traveled > maxRange) {
              hit = true;
              splashTimer = 0.3;
              spawnSplash();
              orb.visible = false;
            }
          }
          if (hit) {
            splashTimer -= dt;
            for (const s of splashes) {
              s.age += dt;
              s.mesh.position.x += s.vx * dt;
              s.mesh.position.y += s.vy * dt;
              s.mesh.position.z += s.vz * dt;
              s.vy -= 14 * dt;
              s.mat.opacity = Math.max(0, 1 - s.age / s.life);
            }
          }
          return hit && splashTimer <= 0;
        },
        dispose() {
          scene.remove(orb); orb.geometry.dispose(); orb.material.dispose();
          scene.remove(splashGroup);
          for (const s of splashes) { s.mesh.geometry.dispose(); s.mat.dispose(); }
          sGeo.dispose();
        },
      });
      return 7.0;
    }

    return 4.0;
  }

  function castDemon(damage) {
    const aim = computeAimDirection();
    const fx = aim.fx, fz = aim.fz;
    player.group.rotation.y = Math.atan2(fx, fz);
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);

    // The shadow body: a dark, jagged mass with purple inner glow
    const group = new THREE.Group();
    scene.add(group);
    const bodyGeo = new THREE.SphereGeometry(0.7, 16, 12);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x0a0015, transparent: true, opacity: 0.95 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(wp.x + fx * 0.8, 1.35, wp.z + fz * 0.8);
    group.add(body);

    // Inner purple glow core, larger to peek out around the dark shell
    const coreGeo = new THREE.SphereGeometry(0.35, 14, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x8e24aa, transparent: true, opacity: 0.85 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(body.position);
    group.add(core);

    // Jagged shadow spikes orbiting the body
    const spikes = [];
    const spikeGeo = new THREE.ConeGeometry(0.2, 0.8, 5);
    const spikeMat = new THREE.MeshBasicMaterial({ color: 0x1a0028, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(spikeGeo, spikeMat);
      s.position.copy(body.position);
      group.add(s);
      spikes.push({ mesh: s, angle: (i / 6) * Math.PI * 2 });
    }

    // Dark smoky trail particles left behind as it travels
    const trailGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const trails = [];

    const speed = 22;
    const range = 18;
    let traveled = 0;
    const hitBots = new Set();

    activeEffects.push({
      update(dt) {
        const step = speed * dt;
        body.position.x += fx * step;
        body.position.z += fz * step;
        core.position.copy(body.position);

        // Orbit spikes around the body
        for (const s of spikes) {
          s.angle += dt * 8;
          const r = 0.55;
          s.mesh.position.set(
            body.position.x + Math.cos(s.angle) * r,
            body.position.y + Math.sin(s.angle * 0.7) * 0.3,
            body.position.z + Math.sin(s.angle) * r,
          );
          s.mesh.rotation.x = s.angle * 1.3;
          s.mesh.rotation.z = s.angle * 1.1;
        }

        // Spawn smoky trail
        if (Math.random() < 0.9) {
          const mat = new THREE.MeshBasicMaterial({ color: 0x1a0028, transparent: true, opacity: 0.7 });
          const m = new THREE.Mesh(trailGeo, mat);
          m.position.copy(body.position);
          m.position.x += (Math.random() - 0.5) * 0.4;
          m.position.y += (Math.random() - 0.5) * 0.4;
          m.position.z += (Math.random() - 0.5) * 0.4;
          m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
          group.add(m);
          trails.push({ mesh: m, mat, age: 0, life: 0.55, scaleStart: 1 + Math.random() * 0.6 });
        }

        // Update trails (drift slightly, fade, grow)
        for (let i = trails.length - 1; i >= 0; i--) {
          const t = trails[i];
          t.age += dt;
          const p = t.age / t.life;
          t.mat.opacity = 0.7 * (1 - p);
          const s = t.scaleStart * (1 + p * 0.8);
          t.mesh.scale.set(s, s, s);
          if (t.age >= t.life) {
            group.remove(t.mesh);
            t.mesh.geometry.dispose();
            t.mat.dispose();
            trails.splice(i, 1);
          }
        }

        traveled += step;

        // Pierce through enemies - damage each only once
        const ox = -mapData.width / 2 + 0.5;
        const oz = -mapData.height / 2 + 0.5;
        const bodyCartX = body.position.x - ox;
        const bodyCartY = body.position.z - oz;
        for (const b of bots) {
          if (b.team !== 'red' || !b.alive) continue;
          if (hitBots.has(b)) continue;
          const dx = b.cartX - bodyCartX;
          const dz = b.cartY - bodyCartY;
          if (Math.hypot(dx, dz) < 1.1) {
            hitBots.add(b);
            b.takeDamage(damage, playerState);
            flashMesh(b.body, 0x8e24aa);
          }
        }

        if (traveled >= range) {
          body.visible = false;
          core.visible = false;
          for (const s of spikes) s.mesh.visible = false;
          // Wait for trails to fade before fully disposing
          if (trails.length === 0) return true;
        }
        return false;
      },
      dispose() {
        scene.remove(group);
        bodyGeo.dispose(); bodyMat.dispose();
        coreGeo.dispose(); coreMat.dispose();
        spikeGeo.dispose(); spikeMat.dispose();
        trailGeo.dispose();
        for (const t of trails) { t.mesh.geometry.dispose(); t.mat.dispose(); }
      },
    });
  }

  function castDragon(damage) {
    const aim = computeAimDirection();
    const fxAim = aim.fx, fzAim = aim.fz;
    player.group.rotation.y = Math.atan2(fxAim, fzAim);
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);

    // Lock onto the nearest enemy bot - dragon homes in on them.
    let target = null;
    let nd = Infinity;
    for (const b of bots) {
      if (b.team !== 'red' || !b.alive) continue;
      const dx = b.cartX - playerState.cartX;
      const dz = b.cartY - playerState.cartY;
      const d = Math.hypot(dx, dz);
      if (d < nd) { nd = d; target = b; }
    }

    // Materials - emerald green scales with bronze accents
    const scaleMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20, emissive: 0x081f0a, emissiveIntensity: 0.5 });
    const scaleLightMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const bellyMat = new THREE.MeshLambertMaterial({ color: 0xc6d870 });
    const bronzeMat = new THREE.MeshLambertMaterial({ color: 0xb87333, emissive: 0x4a2810, emissiveIntensity: 0.5 });
    const goldMat   = new THREE.MeshLambertMaterial({ color: 0xffd54f, emissive: 0x553a00, emissiveIntensity: 0.6 });
    const fangMat   = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeMat    = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    const hornMat   = new THREE.MeshLambertMaterial({ color: 0x1b1b1b });
    const clawMat   = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wingMembrane = new THREE.MeshLambertMaterial({ color: 0x4caf50, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const aurMat = new THREE.MeshBasicMaterial({ color: 0x66ff7a, transparent: true, opacity: 0.18 });

    const dragon = new THREE.Group();
    scene.add(dragon);

    // ---- Head ---------------------------------------------------------------
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0, 1.6);
    dragon.add(headGroup);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.85), scaleMat);
    skull.castShadow = true;
    headGroup.add(skull);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.6), scaleMat);
    snout.position.set(0, -0.05, 0.6);
    headGroup.add(snout);
    const snoutBelly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.55), bellyMat);
    snoutBelly.position.set(0, -0.22, 0.6);
    headGroup.add(snoutBelly);
    // Nostrils
    for (const x of [-0.1, 0.1]) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), hornMat);
      n.position.set(x, 0, 0.92);
      headGroup.add(n);
    }
    // Animated jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.6), scaleMat);
    jaw.position.set(0, -0.32, 0.6);
    headGroup.add(jaw);
    // Lots of fangs
    for (const x of [-0.18, -0.06, 0.06, 0.18]) {
      const upperFang = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), fangMat);
      upperFang.position.set(x, -0.12, 0.85);
      upperFang.rotation.x = Math.PI;
      headGroup.add(upperFang);
      const lowerFang = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), fangMat);
      lowerFang.position.set(x, -0.22, 0.85);
      headGroup.add(lowerFang);
    }
    // Glowing eyes with brow ridges
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eyeL.position.set(-0.22, 0.18, 0.45); eyeR.position.set(0.22, 0.18, 0.45);
    headGroup.add(eyeL); headGroup.add(eyeR);
    for (const x of [-0.22, 0.22]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.1), scaleMat);
      brow.position.set(x, 0.32, 0.4);
      headGroup.add(brow);
    }
    // Crown of horns - 4 tall back horns + 2 small front
    for (const x of [-0.32, 0.32]) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 6), hornMat);
      h.position.set(x, 0.5, -0.2);
      h.rotation.x = -0.6; h.castShadow = true;
      headGroup.add(h);
    }
    for (const x of [-0.18, 0.18]) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 5), hornMat);
      h.position.set(x, 0.5, -0.05);
      h.rotation.x = -0.3;
      headGroup.add(h);
    }
    // Frill / spikes ringing the back of the head
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * Math.PI * 0.7;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), bronzeMat);
      sp.position.set(Math.sin(a) * 0.4, 0.35, -0.45 - Math.cos(a) * 0.05);
      sp.rotation.z = -a; sp.rotation.x = -0.4;
      headGroup.add(sp);
    }

    // ---- Neck (segmented, taper to body) ------------------------------------
    const neckSegs = [];
    for (let i = 0; i < 4; i++) {
      const r = 0.32 + i * 0.04;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(r, r, 0.4), scaleMat);
      seg.position.set(0, -i * 0.05, 1.4 - i * 0.4);
      seg.castShadow = true;
      dragon.add(seg);
      neckSegs.push(seg);
      // Spine spikes
      const spk = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), bronzeMat);
      spk.position.set(0, r * 0.5 + 0.05, seg.position.z);
      dragon.add(spk);
    }

    // ---- Body / torso -------------------------------------------------------
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.85, 1.4), scaleMat);
    torso.position.set(0, -0.3, 0);
    torso.castShadow = true;
    dragon.add(torso);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 1.3), bellyMat);
    belly.position.set(0, -0.7, 0);
    dragon.add(belly);
    // Belly scales (horizontal stripes)
    for (let i = 0; i < 5; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.18), scaleLightMat);
      stripe.position.set(0, -0.65, -0.5 + i * 0.25);
      dragon.add(stripe);
    }
    // Back spines along the torso
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), bronzeMat);
      sp.position.set(0, 0.18, 0.55 - i * 0.4);
      sp.castShadow = true;
      dragon.add(sp);
    }
    // Shoulder gold plates
    for (const x of [-0.4, 0.4]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.4), goldMat);
      sh.position.set(x, 0.05, 0.35);
      dragon.add(sh);
    }

    // ---- Wings (animated) ---------------------------------------------------
    const wingPivots = [];
    for (const sign of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sign * 0.45, 0.05, 0.2);
      dragon.add(pivot);
      // Big wing membrane
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 1.0), wingMembrane);
      wing.position.set(sign * 0.85, 0, 0); // extend outward
      pivot.add(wing);
      // Wing bone (top edge)
      const bone = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.08), bronzeMat);
      bone.position.set(sign * 0.85, 0.03, -0.4);
      pivot.add(bone);
      // Three claw-tips on the leading edge
      for (let i = 0; i < 3; i++) {
        const t = sign * (0.4 + i * 0.5);
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), hornMat);
        claw.position.set(t, 0.05, -0.45);
        claw.rotation.x = -0.5;
        pivot.add(claw);
      }
      wingPivots.push(pivot);
    }

    // ---- Tail (segmented, tapering with spikes) ----------------------------
    const tailSegs = [];
    for (let i = 0; i < 6; i++) {
      const r = 0.55 - i * 0.07;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(r, r, 0.4), scaleMat);
      seg.position.set(0, -0.25 - i * 0.02, -0.7 - i * 0.4);
      seg.castShadow = true;
      dragon.add(seg);
      tailSegs.push(seg);
      // Spike on top of segment
      if (i < 4) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), bronzeMat);
        sp.position.set(0, seg.position.y + r * 0.55, seg.position.z);
        dragon.add(sp);
      }
    }
    // Spike fan at the end of the tail
    const tailEnd = tailSegs[tailSegs.length - 1].position;
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * 0.5;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 4), bronzeMat);
      sp.position.set(Math.sin(a) * 0.18, tailEnd.y + 0.1, tailEnd.z - 0.25);
      sp.rotation.x = Math.PI / 2;
      sp.rotation.z = a;
      dragon.add(sp);
    }

    // ---- Legs with claws ----------------------------------------------------
    for (const sign of [-1, 1]) {
      for (const z of [0.3, -0.3]) {
        // Thigh
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.3), scaleMat);
        thigh.position.set(sign * 0.42, -0.55, z);
        thigh.castShadow = true;
        dragon.add(thigh);
        // Calf
        const calf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.25), scaleMat);
        calf.position.set(sign * 0.42, -0.85, z + (z > 0 ? 0.05 : -0.05));
        dragon.add(calf);
        // Foot + claws
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.4), scaleMat);
        foot.position.set(sign * 0.42, -1.0, z + (z > 0 ? 0.1 : -0.1));
        dragon.add(foot);
        for (const cz of [-0.15, 0, 0.15]) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), clawMat);
          claw.position.set(sign * 0.42 + cz * 0.5, -1.05, z + (z > 0 ? 0.32 : -0.32));
          claw.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2;
          dragon.add(claw);
        }
      }
    }

    // ---- Aura around dragon for that majestic glow --------------------------
    const aura = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 12), aurMat);
    dragon.add(aura);

    // Position dragon and orient toward initial aim
    dragon.position.set(wp.x + fxAim * 1.0, 2.4, wp.z + fzAim * 1.0);
    dragon.rotation.y = Math.atan2(fxAim, fzAim);

    const speed = 7;        // slower, more majestic
    const turnRate = 4.0;   // how fast it can change heading toward target
    const maxLifetime = 8;  // safety cap if no enemies for the chase phases
    let phase = 0;
    let elapsed = 0;
    const ox = -mapData.width / 2 + 0.5;
    const oz = -mapData.height / 2 + 0.5;
    let dir = new THREE.Vector3(fxAim, 0, fzAim);

    // State machine for the bite-bite-fire-breath sequence
    let state = 'pursue';   // pursue | hold1 | breathing | dissolve
    let stateTimer = 0;
    let bitesDone = 0;
    let fireBurnAcc = 0;
    let finished = false;
    const fireGroup = new THREE.Group();
    scene.add(fireGroup);
    const fireParticles = [];
    const fireParticleGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);

    activeEffects.push({
      update(dt) {
        phase += dt; elapsed += dt; stateTimer += dt;
        // Wing flap (slower/grand)
        wingPivots[0].rotation.z = -0.4 - Math.sin(phase * 5) * 0.7;
        wingPivots[1].rotation.z =  0.4 + Math.sin(phase * 5) * 0.7;
        // Jaw chomp
        const chomp = (Math.sin(phase * 8) + 1) * 0.5;
        jaw.position.y = -0.32 - chomp * 0.18;
        jaw.rotation.x = chomp * 0.4;
        // Subtle body sway
        for (let i = 0; i < neckSegs.length; i++) {
          neckSegs[i].position.y = -i * 0.05 + Math.sin(phase * 4 + i) * 0.04;
        }
        for (let i = 0; i < tailSegs.length; i++) {
          tailSegs[i].position.x = Math.sin(phase * 3 - i * 0.4) * (0.05 + i * 0.04);
        }
        // Aura pulse
        aura.scale.setScalar(1 + Math.sin(phase * 6) * 0.1);
        aurMat.opacity = 0.14 + 0.06 * (Math.sin(phase * 6) + 1) * 0.5;

        // After the first bite, the dragon parks in place above the target
        // and the target is kept rooted for the entire sequence:
        // pursue -> bite1 -> hold1 -> bite2 -> hold2 -> breathing -> dissolve
        function keepTargetRooted() {
          if (target && target.alive) {
            target.rooted = true;
            target.rootedUntil = performance.now() + 350;
          }
        }
        // Snap the dragon's facing direction so the target is dead-ahead.
        function aimAtTarget() {
          if (!target || target.alive === false) return;
          const tx = target.cartX + ox;
          const tz = target.cartY + oz;
          const dx = tx - dragon.position.x;
          const dz = tz - dragon.position.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.001) return;
          dir.x = dx / d; dir.z = dz / d;
          dragon.rotation.y = Math.atan2(dir.x, dir.z);
        }

        if (state === 'pursue') {
          // Re-acquire target if dead/missing
          if (!target || target.alive === false) {
            let nearest = null, nearestD = Infinity;
            for (const b of bots) {
              if (b.team !== 'red' || !b.alive) continue;
              const dx = b.cartX + ox - dragon.position.x;
              const dz = b.cartY + oz - dragon.position.z;
              const d = Math.hypot(dx, dz);
              if (d < nearestD) { nearestD = d; nearest = b; }
            }
            target = nearest;
          }
          if (target) {
            const tx = target.cartX + ox;
            const tz = target.cartY + oz;
            const dx = tx - dragon.position.x;
            const dz = tz - dragon.position.z;
            const d = Math.hypot(dx, dz);
            if (d > 0.001) {
              const nx = dx / d, nz = dz / d;
              dir.x += (nx - dir.x) * Math.min(1, turnRate * dt);
              dir.z += (nz - dir.z) * Math.min(1, turnRate * dt);
              const dl = Math.hypot(dir.x, dir.z) || 1;
              dir.x /= dl; dir.z /= dl;
            }
            if (d < 1.4) {
              target.takeDamage(damage, playerState);
              flashMesh(target.body, 0x66ff66);
              bitesDone = 1;
              keepTargetRooted();
              state = 'hold1';
              stateTimer = 0;
            } else {
              dragon.position.x += dir.x * speed * dt;
              dragon.position.z += dir.z * speed * dt;
            }
            dragon.rotation.y = Math.atan2(dir.x, dir.z);
          } else {
            // Nothing to bite - skip to fire breath
            state = 'breathing'; stateTimer = 0;
          }
          if (elapsed > maxLifetime && state === 'pursue') {
            state = 'breathing'; stateTimer = 0;
          }
        } else if (state === 'hold1') {
          keepTargetRooted();
          aimAtTarget();
          if (stateTimer >= 1.4) {
            if (target && target.alive) {
              target.takeDamage(damage, playerState);
              flashMesh(target.body, 0x66ff66);
            }
            bitesDone = 2;
            state = 'hold2';
            stateTimer = 0;
          }
        } else if (state === 'hold2') {
          keepTargetRooted();
          aimAtTarget();
          if (stateTimer >= 1.4) {
            state = 'breathing';
            stateTimer = 0;
            fireBurnAcc = 0;
          }
        } else if (state === 'breathing') {
          keepTargetRooted();
          aimAtTarget();
          // Open jaws wide
          jaw.position.y = -0.55;
          jaw.rotation.x = 0.7;
          // Spawn fire stream particles each frame
          const spawnX = dragon.position.x + dir.x * 1.6;
          const spawnZ = dragon.position.z + dir.z * 1.6;
          for (let i = 0; i < 5; i++) {
            const mat = new THREE.MeshBasicMaterial({
              color: [0xff3300, 0xff6a00, 0xffaa33, 0xffe066][Math.floor(Math.random() * 4)],
              transparent: true, opacity: 1,
            });
            const m = new THREE.Mesh(fireParticleGeo, mat);
            m.position.set(spawnX, 2.4 + Math.random() * 0.2, spawnZ);
            const spread = 0.55;
            const sp = 6 + Math.random() * 4;
            const vx = dir.x * sp + (Math.random() - 0.5) * spread * sp;
            const vz = dir.z * sp + (Math.random() - 0.5) * spread * sp;
            const vy = (Math.random() - 0.3) * 1.5;
            fireGroup.add(m);
            fireParticles.push({ mesh: m, mat, vx, vz, vy, age: 0, life: 0.6 + Math.random() * 0.3 });
          }
          // 70 damage per second DoT while the breath lasts (140 over 2s)
          fireBurnAcc += dt;
          if (fireBurnAcc >= 0.2) {
            const tick = fireBurnAcc; fireBurnAcc = 0;
            // Always damage the locked-on target so the breath never misses
            if (target && target.alive) {
              target.takeDamage(70 * tick, playerState);
              flashMesh(target.body, 0xff7722);
            }
            // Also catch any other enemies happening to be in the cone
            for (const b of bots) {
              if (b === target) continue;
              if (b.team !== 'red' || !b.alive) continue;
              const dx = b.cartX + ox - dragon.position.x;
              const dz = b.cartY + oz - dragon.position.z;
              const d = Math.hypot(dx, dz);
              if (d < 7 && d > 0) {
                const dot = (dx * dir.x + dz * dir.z) / d;
                if (dot > 0.55) {
                  b.takeDamage(70 * tick, playerState);
                  flashMesh(b.body, 0xff7722);
                }
              }
            }
          }
          if (stateTimer >= 2.0) { state = 'dissolve'; stateTimer = 0; }
        } else if (state === 'dissolve') {
          // Quick fade so the dragon is gone right after the 2s breath
          const s = Math.max(0, 1 - stateTimer / 0.25);
          dragon.scale.setScalar(s);
          if (stateTimer >= 0.25) finished = true;
        }

        // Update fire particles (run regardless of state so they fade out)
        for (let i = fireParticles.length - 1; i >= 0; i--) {
          const p = fireParticles[i];
          p.age += dt;
          if (p.age >= p.life) {
            fireGroup.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mat.dispose();
            fireParticles.splice(i, 1);
            continue;
          }
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 2 * dt;
          const t = p.age / p.life;
          p.mat.opacity = 1 - t;
          const sc = 1 + t * 1.2;
          p.mesh.scale.set(sc, sc, sc);
        }

        return finished && fireParticles.length === 0;
      },
      dispose() {
        scene.remove(dragon);
        scene.remove(fireGroup);
        for (const p of fireParticles) {
          p.mesh.geometry.dispose();
          p.mat.dispose();
        }
        fireParticleGeo.dispose();
        scaleMat.dispose(); scaleLightMat.dispose(); bellyMat.dispose();
        bronzeMat.dispose(); goldMat.dispose(); fangMat.dispose();
        eyeMat.dispose(); hornMat.dispose(); clawMat.dispose();
        wingMembrane.dispose(); aurMat.dispose();
        dragon.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      },
    });
  }

  function castSoldier() {
    // Soldier upgrade tiers L1..L5 - HP and damage multipliers
    const sl = Math.max(1, Math.min(5, soldierLevel || 1));
    const hpMult  = [1.0, 1.5, 2.2, 3.3, 5.0][sl - 1];
    const dmgMult = [1.0, 1.3, 1.7, 2.2, 3.0][sl - 1];

    const redDmg = 6 + Math.floor(level * 0.6);
    const soldier = new Bot3D({
      team: 'blue',
      difficulty: Math.max(1, level - 1),
      startX: Math.floor(playerState.cartX),
      startY: Math.floor(playerState.cartY) + 1,
      world: worldShim,
    });
    soldier.maxHp = Math.floor(50 * hpMult);
    soldier.hp = soldier.maxHp;
    soldier.damage = Math.max(1, Math.floor((redDmg / 2) * dmgMult));
    // Spawn next to the player facing their direction
    soldier.cartX = playerState.cartX + Math.sin(player.group.rotation.y) * 1.2;
    soldier.cartY = playerState.cartY + Math.cos(player.group.rotation.y) * 1.2;
    // Give the soldier a distinct uniform so he doesn't look like the player
    soldier.character.body.material.color.setHex(0x2e7d32);
    soldier.character.legL.material.color.setHex(0x1b3b1e);
    soldier.character.legR.material.color.setHex(0x1b3b1e);
    // Scale the HP bar to show new max correctly (setter handled by syncMesh)
    bots.push(soldier);
    scene.add(soldier.group);

    // Small poof effect where he spawns
    const wp = tileToWorld(mapData, soldier.cartX, soldier.cartY);
    const poofGroup = new THREE.Group();
    scene.add(poofGroup);
    const poofGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const poofs = [];
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xbbeeaa, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(poofGeo, mat);
      m.position.set(wp.x, 0.3, wp.z);
      poofGroup.add(m);
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 3;
      poofs.push({ mesh: m, mat, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 1 + Math.random() * 2, age: 0, life: 0.45 });
    }
    activeEffects.push({
      update(dt) {
        let alive = 0;
        for (const p of poofs) {
          p.age += dt;
          if (p.age >= p.life) { p.mesh.visible = false; continue; }
          alive++;
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 4 * dt;
          p.mat.opacity = 1 - p.age / p.life;
        }
        return alive === 0;
      },
      dispose() {
        scene.remove(poofGroup);
        for (const p of poofs) { p.mesh.geometry.dispose(); p.mat.dispose(); }
      },
    });
  }

  function castHoney() {
    // Drop the trap where the mouse is pointing on the ground
    const wp = tileToWorld(mapData, playerState.cartX, playerState.cartY);
    const aim = computeAimDirection();
    let poolX = wp.x + aim.fx * 4;
    let poolZ = wp.z + aim.fz * 4;
    _aimRay.setFromCamera(mouseNdc, camera);
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (_aimRay.ray.intersectPlane(ground, hit)) { poolX = hit.x; poolZ = hit.z; }

    // Enforce MAX_HONEY by retiring the oldest trap
    if (honeyTraps.length >= MAX_HONEY) {
      const old = honeyTraps.shift();
      scene.remove(old.group);
      old.discMat.dispose(); old.coreMat.dispose();
    }

    const group = new THREE.Group();
    scene.add(group);

    // Honey disc - golden glossy puddle
    const discMat = new THREE.MeshLambertMaterial({ color: 0xffb300, emissive: 0x4a2a00, emissiveIntensity: 0.45, transparent: true, opacity: 0.85 });
    const disc = new THREE.Mesh(honeyDiscGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(poolX, 0.06, poolZ);
    group.add(disc);
    // Brighter inner core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.7 });
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), coreMat);
    core.rotation.x = -Math.PI / 2;
    core.position.set(poolX, 0.08, poolZ);
    group.add(core);
    // A few decorative bubbles bobbing
    const bubbles = [];
    const bMat = new THREE.MeshLambertMaterial({ color: 0xfff59d, emissive: 0x4a3a00, emissiveIntensity: 0.4 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), bMat);
      b.position.set(poolX + Math.cos(a) * 0.7, 0.2, poolZ + Math.sin(a) * 0.7);
      group.add(b);
      bubbles.push({ mesh: b, base: 0.2, phase: a * 2 });
    }

    honeyTraps.push({
      group, discMat, coreMat, bubbles,
      x: poolX, z: poolZ, radius: 1.4,
      born: performance.now(),
    });
    if (ui.setHoneyTraps) ui.setHoneyTraps(honeyTraps.length, MAX_HONEY);
  }

  function releaseHoneyTraps() {
    for (const trap of honeyTraps) {
      scene.remove(trap.group);
      trap.discMat.dispose();
      trap.coreMat.dispose();
    }
    honeyTraps.length = 0;
    if (ui.setHoneyTraps) ui.setHoneyTraps(0, MAX_HONEY);
  }

  function buySword(swordId) {
    const sw = SWORD_STATS[swordId];
    if (!sw) return false;
    if (playerState.ownedSwords.includes(swordId)) return false;
    if (playerState.coins < sw.price) return false;
    playerState.coins -= sw.price;
    playerState.ownedSwords.push(swordId);
    playerState.sword = swordId;
    attachSword(player, swordId);
    ui.setCoins(playerState.coins);
    ui.setSword(playerState.sword, playerState.ownedSwords);
    return true;
  }

  return {
    buySword,
    castAbility,
    releaseHoneyTraps,
    dispose() {
      // Clean up any active honey traps too
      for (const trap of honeyTraps) {
        scene.remove(trap.group);
        trap.discMat.dispose();
        trap.coreMat.dispose();
      }
      honeyTraps.length = 0;
      running = false;
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousemove', onMouseAim);
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
