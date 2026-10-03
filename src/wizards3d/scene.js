import * as THREE from 'three';
import { OUTFIT_COLORS, makeHat } from '../avatar3d.js';

// Spells. Each card hides at a fixed map position so the world feels the
// same across reloads. Commons are easier (smaller halos count of fewer
// trees in the way); uncommons are tucked further out behind scenery.
export const SPELLS = [
  // --- Commons (7) ---
  { id: 'spark',  name: 'Spark',  rarity: 'common',   color: 0xff5722, damage: 10, desc: 'A small flick of fire.',     pos: [  20, 0,   18] },
  { id: 'splash', name: 'Splash', rarity: 'common',   color: 0x29b6f6, damage: 12, desc: 'A splash of cold water.',     pos: [ -34, 0,  -12] },
  { id: 'gust',   name: 'Gust',   rarity: 'common',   color: 0xb3e5fc, damage:  8, desc: 'A puff of wind.',             pos: [  46, 0,  -38] },
  { id: 'pebble', name: 'Pebble', rarity: 'common',   color: 0x8d6e63, damage: 14, desc: 'A flying pebble.',            pos: [ -54, 0,   30] },
  { id: 'glow',   name: 'Glow',   rarity: 'common',   color: 0xfff176, damage:  9, desc: 'A small ball of light.',      pos: [  10, 0,  -52] },
  { id: 'leaf',   name: 'Leaf',   rarity: 'common',   color: 0x66bb6a, damage: 11, desc: 'A swirl of leaves.',          pos: [  62, 0,   54] },
  { id: 'shock',  name: 'Shock',  rarity: 'common',   color: 0x80deea, damage: 13, desc: 'A tiny zap of lightning.',    pos: [ -68, 0,  -48] },
  // --- Uncommons (3) ---
  { id: 'flame',  name: 'Flame',  rarity: 'uncommon', color: 0xff6d00, damage: 22, desc: 'A roaring flame burst.',      pos: [ 110, 0,  -90] },
  { id: 'tide',   name: 'Tide',   rarity: 'uncommon', color: 0x1565c0, damage: 20, desc: 'A wave of crashing water.',   pos: [-130, 0,  100] },
  { id: 'quake',  name: 'Quake',  rarity: 'uncommon', color: 0x4e342e, damage: 25, desc: 'A tremor that shakes earth.', pos: [ 150, 0,  140] },
];

export const TOTAL_LEVELS = 25;

// Returns { aiSpells: [id...], aiHp, theme } for the given level.
export function getLevelConfig(level) {
  const ALL = ['spark','splash','gust','pebble','glow','leaf','shock','flame','tide','quake'];
  const numSpells = Math.max(1, Math.min(ALL.length, Math.ceil(level / 2.5)));
  const aiSpells = ALL.slice(0, numSpells);
  const aiHp = 30 + level * 9;          // L1 = 39, L25 = 255
  const theme = MAP_THEMES[(level - 1) % MAP_THEMES.length];
  return { level, aiSpells, aiHp, theme };
}

// 25 different battle arenas — colour palettes only, geometry is generated.
export const MAP_THEMES = [
  { name: 'Meadow',          floor: 0x66bb6a, sky: 0x88bbe6, accent: 0x2e7d32 },
  { name: 'Sandy Beach',     floor: 0xffe082, sky: 0x81d4fa, accent: 0xffb74d },
  { name: 'Pine Forest',     floor: 0x33691e, sky: 0x90a4ae, accent: 0x1b5e20 },
  { name: 'Desert',          floor: 0xff8a65, sky: 0xffcc80, accent: 0xbf360c },
  { name: 'Snowfield',       floor: 0xeceff1, sky: 0xb3e5fc, accent: 0x90caf9 },
  { name: 'Lava Field',      floor: 0x3e2723, sky: 0xff6d00, accent: 0xff5722 },
  { name: 'Cave',            floor: 0x424242, sky: 0x212121, accent: 0x6d4c41 },
  { name: 'Sky Island',      floor: 0xb3e5fc, sky: 0xe1f5fe, accent: 0xffffff },
  { name: 'Crystal Cavern',  floor: 0x4a148c, sky: 0x1a0033, accent: 0xb388ff },
  { name: 'Coral Reef',      floor: 0x4dd0e1, sky: 0x0277bd, accent: 0xff7043 },
  { name: 'Volcano Rim',     floor: 0x6d4c41, sky: 0x4a148c, accent: 0xff3d00 },
  { name: 'Mountain Top',    floor: 0x90a4ae, sky: 0x607d8b, accent: 0xeceff1 },
  { name: 'Frozen Lake',     floor: 0x81d4fa, sky: 0xb3e5fc, accent: 0xffffff },
  { name: 'Mushroom Wood',   floor: 0x8d6e63, sky: 0xf48fb1, accent: 0xc62828 },
  { name: 'Ruined Temple',   floor: 0xa1887f, sky: 0xff8a65, accent: 0x6d4c41 },
  { name: 'Storm Plains',    floor: 0x37474f, sky: 0x263238, accent: 0xb388ff },
  { name: 'Cloud Kingdom',   floor: 0xffffff, sky: 0xf8bbd0, accent: 0xffd54f },
  { name: 'Swamp',           floor: 0x33691e, sky: 0x4e342e, accent: 0x827717 },
  { name: 'Crystal Field',   floor: 0x5e35b1, sky: 0x311b92, accent: 0xb388ff },
  { name: 'Star Plain',      floor: 0x1a237e, sky: 0x0d0033, accent: 0xfff59d },
  { name: 'Fire Realm',      floor: 0xb71c1c, sky: 0xff6d00, accent: 0xffeb3b },
  { name: 'Ice Realm',       floor: 0xb3e5fc, sky: 0x4fc3f7, accent: 0xffffff },
  { name: 'Shadow Realm',    floor: 0x212121, sky: 0x000000, accent: 0x9c27b0 },
  { name: 'Void',            floor: 0x000000, sky: 0x0d0033, accent: 0xb388ff },
  { name: 'Cosmos',          floor: 0x0d0033, sky: 0x000000, accent: 0xf06292 },
];

const RARITY_COLORS = {
  common:   0xbdbdbd,
  uncommon: 0x4caf50,
};

// Build the wizard world. Player walks with WASD / arrow keys; getting close
// to a spell card auto-collects it via onCollect(spellId).
export function createWizards3DScene({ canvas, avatar, collected, onCollect, onNearSpell, onLeaveSpell }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88bbe6);
  // Fog pushed way out so the natural-wonder backdrops stay visible
  scene.fog = new THREE.Fog(0x88bbe6, 500, 1800);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);

  const sun = new THREE.DirectionalLight(0xfff1c0, 1.6);
  sun.position.set(80, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xddeeff, 0x4a5a3a, 0.7));

  // Big grass floor — 3x bigger again (was 240, now 720)
  const FLOOR = 720;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR * 2, FLOOR * 2),
    new THREE.MeshLambertMaterial({ color: 0x4caf50 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Stone path circle in middle (gives the map a "centre")
  const path = new THREE.Mesh(
    new THREE.RingGeometry(8, 12, 48),
    new THREE.MeshLambertMaterial({ color: 0x9e9e9e, side: THREE.DoubleSide }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);

  // Scenery — trees, rocks, mushrooms. Each spell card gets a "hiding" tree
  // placed between the spawn point and the card, so cards aren't visible
  // from the centre and you have to walk around to find them.
  buildScenery(scene, SPELLS);
  buildNaturalWonders(scene);

  // Spell cards (one per spell)
  const cards = SPELLS.map((spell) => {
    const card = buildSpellCard(spell, collected.includes(spell.id));
    card.group.position.set(spell.pos[0], 0, spell.pos[2]);
    scene.add(card.group);
    return { spell, ...card };
  });

  // Player
  const player = buildPlayer(avatar);
  scene.add(player.group);

  // Controls
  const keys = new Set();
  let yaw = 0, pitch = 0.5, distance = 10;
  let dragging = false, lastX = 0, lastY = 0;
  let vy = 0;            // vertical velocity (jumping)
  let onGround = true;
  const GRAVITY = 22;
  const JUMP_V = 9;

  const onKey = (down) => (e) => {
    const k = e.key.toLowerCase();
    if (down) {
      keys.add(k);
      if ((k === ' ' || e.code === 'Space') && onGround) {
        vy = JUMP_V;
        onGround = false;
      }
      if (k === ' ' || e.code === 'Space') e.preventDefault();
    } else {
      keys.delete(k);
    }
  };
  const keydown = onKey(true);
  const keyup = onKey(false);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);

  const onMouseDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
  const onMouseUp = () => { dragging = false; };
  const onMouseMove = (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.005;
    pitch = Math.max(0.1, Math.min(1.3, pitch - (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  };
  const onWheel = (e) => {
    distance = Math.max(5, Math.min(20, distance + e.deltaY * 0.01));
    e.preventDefault();
  };
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const onTouchStart = (e) => { if (e.touches.length !== 1) return; dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; };
  const onTouchEnd = () => { dragging = false; };
  const onTouchMove = (e) => {
    if (!dragging || e.touches.length !== 1) return;
    yaw -= (e.touches[0].clientX - lastX) * 0.005;
    pitch = Math.max(0.1, Math.min(1.3, pitch - (e.touches[0].clientY - lastY) * 0.005));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  };
  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchmove', onTouchMove);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Loop
  let raf = 0;
  let lastT = performance.now();
  let walkPhase = 0;
  let nearestId = null;

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // Turn keys (X = right, Z = left)
    const turnSpeed = 2.4;
    let turning = false;
    if (keys.has('x')) { yaw -= turnSpeed * dt; turning = true; }
    if (keys.has('z')) { yaw += turnSpeed * dt; turning = true; }

    // Camera pitch keys (C = up, V = down)
    const pitchSpeed = 1.2;
    if (keys.has('c')) pitch = Math.min(1.3, pitch + pitchSpeed * dt);
    if (keys.has('v')) pitch = Math.max(0.1, pitch - pitchSpeed * dt);

    // Movement (camera-relative). Hold Shift to sprint x3.
    const sprinting = keys.has('shift');
    const speed = 22 * (sprinting ? 3 : 1);
    let mx = 0, mz = 0;
    if (keys.has('w') || keys.has('arrowup'))    mz -= 1;
    if (keys.has('s') || keys.has('arrowdown'))  mz += 1;
    if (keys.has('a') || keys.has('arrowleft'))  mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    const moving = mx !== 0 || mz !== 0;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      // Camera-relative movement: forward = away from the camera.
      // Camera sits at (sin(yaw), -, cos(yaw)) looking at the player, so
      // camera-forward = (-sin(yaw), -, -cos(yaw)). W (mz=-1) → +forward.
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const wx = mz * sin + mx * cos;
      const wz = mz * cos - mx * sin;
      const nx = player.group.position.x + wx * speed * dt;
      const nz = player.group.position.z + wz * speed * dt;
      const lim = FLOOR - 4;
      player.group.position.x = Math.max(-lim, Math.min(lim, nx));
      player.group.position.z = Math.max(-lim, Math.min(lim, nz));
      player.group.rotation.y = Math.atan2(wx, wz);
      walkPhase += dt * 10;
    } else {
      walkPhase *= 0.85;
      // Rotate the avatar in place when only turn keys are held
      if (turning) player.group.rotation.y = yaw + Math.PI;
    }

    // Vertical (jump + gravity)
    vy -= GRAVITY * dt;
    player.group.position.y += vy * dt;
    if (player.group.position.y <= 0) {
      player.group.position.y = 0;
      vy = 0;
      onGround = true;
    }
    // Limb swing
    const swing = Math.sin(walkPhase) * 0.6;
    if (player.armL) player.armL.rotation.x = -swing;
    if (player.armR) player.armR.rotation.x =  swing;
    if (player.legL) player.legL.rotation.x =  swing;
    if (player.legR) player.legR.rotation.x = -swing;

    // Card animation + proximity check
    let near = null;
    let nearD = Infinity;
    for (const c of cards) {
      if (c.collected) continue;
      c.group.rotation.y += dt * 1.4;
      c.group.position.y = Math.sin(now * 0.002 + c.spell.pos[0]) * 0.25;
      const dx = c.group.position.x - player.group.position.x;
      const dz = c.group.position.z - player.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < nearD) { nearD = d; near = c; }
      if (d < 2.5) {
        c.collected = true;
        c.group.visible = false;
        if (onCollect) onCollect(c.spell.id);
      }
    }
    const nid = (near && nearD < 6) ? near.spell.id : null;
    if (nid !== nearestId) {
      nearestId = nid;
      if (nid && onNearSpell) onNearSpell(near.spell);
      if (!nid && onLeaveSpell) onLeaveSpell();
    }

    // Camera follow
    const px = player.group.position.x;
    const pz = player.group.position.z;
    const cx = px + Math.sin(yaw) * Math.cos(pitch) * distance;
    const cz = pz + Math.cos(yaw) * Math.cos(pitch) * distance;
    const cy = 2 + Math.sin(pitch) * distance;
    camera.position.set(cx, cy, cz);
    camera.lookAt(px, 2, pz);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    markCollected(id) {
      const c = cards.find((x) => x.spell.id === id);
      if (c) { c.collected = true; c.group.visible = false; }
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchmove', onTouchMove);
      renderer.dispose();
    },
  };
}

function buildSpellCard(spell, alreadyCollected) {
  const group = new THREE.Group();
  if (alreadyCollected) group.visible = false;

  // The card itself - thin glowing rectangle
  const cardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: spell.color,
    emissiveIntensity: 0.6,
    roughness: 0.4,
  });
  const card = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.12), cardMat);
  card.position.y = 1.8;
  card.castShadow = true;
  group.add(card);

  // Coloured gem on the front
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45),
    new THREE.MeshStandardMaterial({ color: spell.color, emissive: spell.color, emissiveIntensity: 0.9 }),
  );
  gem.position.set(0, 1.8, 0.1);
  group.add(gem);

  // Halo at the base so it's spottable when you're close
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.8, 32),
    new THREE.MeshBasicMaterial({ color: spell.color, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  group.add(halo);

  // Rarity ribbon below the card
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.3, 0.16),
    new THREE.MeshLambertMaterial({ color: RARITY_COLORS[spell.rarity] || 0xffffff }),
  );
  ribbon.position.y = 0.3;
  group.add(ribbon);

  return { group };
}

// Real-world tree heights (~15-25m). 1 unit ≈ 1m.
function addTree(scene, x, z, scale = 1) {
  const trunkH = 12 * scale;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5 * scale, 0.8 * scale, trunkH, 8),
    new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
  );
  trunk.position.set(x, trunkH / 2, z);
  trunk.castShadow = true;
  scene.add(trunk);
  // Two stacked cones for a fuller crown
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  const lower = new THREE.Mesh(new THREE.ConeGeometry(5 * scale, 8 * scale, 8), leafMat);
  lower.position.set(x, trunkH + 2 * scale, z); lower.castShadow = true;
  scene.add(lower);
  const upper = new THREE.Mesh(new THREE.ConeGeometry(3.5 * scale, 6 * scale, 8), leafMat);
  upper.position.set(x, trunkH + 7 * scale, z); upper.castShadow = true;
  scene.add(upper);
}

function addRock(scene, x, z, r) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(r),
    new THREE.MeshLambertMaterial({ color: 0x9e9e9e }),
  );
  rock.position.set(x, r * 0.6, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  scene.add(rock);
}

function buildScenery(scene, spells) {
  const rng = mulberry32(1337);

  // Hiding trees: place a tall tree between origin and each card so the
  // card isn't visible from the spawn point. Player has to walk past
  // the tree to reach the card.
  for (const s of spells) {
    const [sx, , sz] = s.pos;
    const dist = Math.hypot(sx, sz);
    if (dist < 0.001) continue;
    // Position the hiding tree just toward the centre from the card
    const t = (dist - 4) / dist;
    const tx = sx * t;
    const tz = sz * t;
    addTree(scene, tx, tz, 1.0);
    // For uncommons, double up — hide them harder
    if (s.rarity === 'uncommon') {
      const t2 = (dist - 9) / dist;
      addTree(scene, sx * t2 + 4, sz * t2 - 3, 1.1);
      addRock(scene, sx + 3, sz + 1, 2.5);
    }
  }

  // Random trees scattered across the much bigger map
  for (let i = 0; i < 800; i++) {
    const x = (rng() - 0.5) * 1380;
    const z = (rng() - 0.5) * 1380;
    if (Math.hypot(x, z) < 14) continue;     // keep spawn area clear
    addTree(scene, x, z, 0.8 + rng() * 0.6);
  }

  // Random rocks (real boulder sizes 0.6-2.5m)
  for (let i = 0; i < 380; i++) {
    const x = (rng() - 0.5) * 1380;
    const z = (rng() - 0.5) * 1380;
    if (Math.hypot(x, z) < 12) continue;
    addRock(scene, x, z, 0.6 + rng() * 1.9);
  }

  // Mushrooms (small, decorative)
  const stalkMat = new THREE.MeshLambertMaterial({ color: 0xfff8e1 });
  const capMat = new THREE.MeshLambertMaterial({ color: 0xc62828 });
  for (let i = 0; i < 250; i++) {
    const x = (rng() - 0.5) * 1300;
    const z = (rng() - 0.5) * 1300;
    if (Math.hypot(x, z) < 10) continue;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8), stalkMat);
    stalk.position.set(x, 0.2, z);
    scene.add(stalk);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.position.set(x, 0.4, z);
    scene.add(cap);
  }
}

// The 7 Natural Wonders of the World, scaled down to ~1/4 size and placed
// on the playable map so players can walk up to them. Better-rarity cards
// will eventually be hidden inside these landmarks.
function buildNaturalWonders(scene) {
  // 1. Mount Everest — north, snowy peak
  {
    const cx = 0, cz = -440;
    const base = new THREE.Mesh(
      new THREE.ConeGeometry(55, 90, 16),
      new THREE.MeshLambertMaterial({ color: 0x6d6e74 }),
    );
    base.position.set(cx, 45, cz);
    base.castShadow = true;
    scene.add(base);
    const snow = new THREE.Mesh(
      new THREE.ConeGeometry(25, 40, 16),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    snow.position.set(cx, 80, cz);
    scene.add(snow);
    // Smaller neighbouring peak
    const sister = new THREE.Mesh(
      new THREE.ConeGeometry(38, 60, 14),
      new THREE.MeshLambertMaterial({ color: 0x7a7d83 }),
    );
    sister.position.set(cx + 70, 30, cz - 10);
    sister.castShadow = true;
    scene.add(sister);
  }

  // 2. Victoria Falls — east, cliff with waterfall
  {
    const cx = 460, cz = 0;
    const cliff = new THREE.Mesh(
      new THREE.BoxGeometry(10, 28, 55),
      new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
    );
    cliff.position.set(cx, 14, cz);
    cliff.castShadow = true;
    scene.add(cliff);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 27),
      new THREE.MeshLambertMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.9 }),
    );
    water.position.set(cx - 5.2, 13.5, cz);
    water.rotation.y = -Math.PI / 2;
    scene.add(water);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(15, 32),
      new THREE.MeshLambertMaterial({ color: 0x1565c0 }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx - 15, 0.05, cz);
    scene.add(pool);
  }

  // 3. Grand Canyon — south, layered red mesas
  {
    const cz = 460;
    const colors = [0xb24d2a, 0xc4673c, 0xa54225];
    for (let i = 0; i < 7; i++) {
      const w = 18 + Math.random() * 15;
      const h = 20 + Math.random() * 15;
      const d = 18 + Math.random() * 15;
      const mesa = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: colors[i % colors.length] }),
      );
      mesa.position.set(-70 + i * 22, h / 2, cz + (i % 2 ? -8 : 8));
      mesa.castShadow = true;
      scene.add(mesa);
    }
  }

  // 4. Paricutín — volcano in the north-west with a glowing crater
  {
    const cx = -420, cz = -220;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(30, 50, 16),
      new THREE.MeshLambertMaterial({ color: 0x4e342e }),
    );
    cone.position.set(cx, 25, cz);
    cone.castShadow = true;
    scene.add(cone);
    const crater = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 15, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xff5722, emissive: 0xff3300, emissiveIntensity: 1.2 }),
    );
    crater.position.set(cx, 50, cz);
    scene.add(crater);
  }

  // 5. Christ the Redeemer / Sugarloaf — south-east
  {
    const cx = 400, cz = 320;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(30, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x808a8e }),
    );
    dome.position.set(cx, 0, cz);
    dome.castShadow = true;
    scene.add(dome);
    // Christ statue on top — vertical bar + crossbar
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1, 7.5, 1),
      new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
    );
    body.position.set(cx, 33.7, cz);
    scene.add(body);
    const arms = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
    );
    arms.position.set(cx, 35.5, cz);
    scene.add(arms);
  }

  // 6. Great Barrier Reef — south-west, blue lagoon with coral
  {
    const cx = -360, cz = 320;
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(40, 48),
      new THREE.MeshLambertMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.85 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, 0.05, cz);
    scene.add(water);
    const coralColors = [0xff7043, 0xec407a, 0xab47bc, 0x26a69a, 0xffee58];
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 35;
      const cx2 = cx + Math.cos(a) * r;
      const cz2 = cz + Math.sin(a) * r;
      const h = 0.5 + Math.random() * 1.2;
      const coral = new THREE.Mesh(
        new THREE.ConeGeometry(0.25 + Math.random() * 0.35, h, 6),
        new THREE.MeshLambertMaterial({ color: coralColors[i % coralColors.length] }),
      );
      coral.position.set(cx2, h / 2, cz2);
      scene.add(coral);
    }
  }

  // 7. Aurora Borealis — coloured curtains in the sky over the north of the map
  {
    const colors = [0x39ff7a, 0x39d4ff, 0xb14dff];
    for (let i = 0; i < 3; i++) {
      const aurora = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 35),
        new THREE.MeshBasicMaterial({
          color: colors[i],
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      aurora.position.set(0, 95 + i * 10, -500 + i * 15);
      aurora.rotation.x = -Math.PI / 8;
      scene.add(aurora);
    }
  }

  // Wizard tower — player's home base, near spawn
  {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 6, 30, 16),
      new THREE.MeshLambertMaterial({ color: 0x6a1b9a }),
    );
    tower.position.set(-50, 15, -50);
    tower.castShadow = true;
    scene.add(tower);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(7, 12, 16),
      new THREE.MeshLambertMaterial({ color: 0x4a148c }),
    );
    roof.position.set(-50, 36, -50);
    scene.add(roof);
  }
}

function buildPlayer(avatar) {
  const group = new THREE.Group();
  const av = avatar || { outfit: 0, hat: 0 };
  const colors = OUTFIT_COLORS[av.outfit] || OUTFIT_COLORS[0];
  const skin  = new THREE.MeshLambertMaterial({ color: 0xf0c080 });
  const shirt = new THREE.MeshLambertMaterial({ color: colors.shirt });
  const pants = new THREE.MeshLambertMaterial({ color: colors.pants });

  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skin);
  head.position.y = 3.0; head.castShadow = true;
  group.add(head);

  if (av.hat) {
    const hat = makeHat(av.hat, 1.0);
    if (hat) { hat.position.y = 3.0; group.add(hat); }
  }

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.2, 3.05, 0.5);
  eyeR.position.set( 0.2, 3.05, 0.5);
  group.add(eyeL); group.add(eyeR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.7), shirt);
  torso.position.y = 1.8; torso.castShadow = true;
  group.add(torso);

  const armGeo = new THREE.BoxGeometry(0.4, 1.4, 0.5);
  const armL = new THREE.Mesh(armGeo, skin);
  const armR = new THREE.Mesh(armGeo, skin);
  armL.position.set(-0.85, 1.8, 0);
  armR.position.set( 0.85, 1.8, 0);
  armL.castShadow = true; armR.castShadow = true;
  group.add(armL); group.add(armR);

  const legGeo = new THREE.BoxGeometry(0.5, 1.4, 0.6);
  const legL = new THREE.Mesh(legGeo, pants);
  const legR = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.3, 0.4, 0);
  legR.position.set( 0.3, 0.4, 0);
  legL.castShadow = true; legR.castShadow = true;
  group.add(legL); group.add(legR);

  return { group, armL, armR, legL, legR };
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
