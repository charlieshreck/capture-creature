import * as THREE from 'three';
import { OUTFIT_COLORS, makeHat } from '../avatar3d.js';

export const BRAINROTS = [
  { id: 0,  name: 'Emberix',   price: 50,     color: 0xff3366, shape: 'cube'   },
  { id: 1,  name: 'Solara',    price: 100,    color: 0xffaa00, shape: 'sphere' },
  { id: 2,  name: 'Blossom',   price: 150,    color: 0xff66aa, shape: 'cone'   },
  { id: 3,  name: 'Azurion',   price: 200,    color: 0x3366ff, shape: 'cube'   },
  { id: 4,  name: 'Flarewing', price: 300,    color: 0xff4422, shape: 'sphere' },
  { id: 5,  name: 'Mystix',    price: 400,    color: 0x9944ff, shape: 'cone'   },
  { id: 6,  name: 'Frostel',   price: 500,    color: 0x00ccff, shape: 'cube'   },
  { id: 7,  name: 'Sunspark',  price: 750,    color: 0xffdd33, shape: 'sphere' },
  { id: 8,  name: 'Verdant',   price: 1000,   color: 0x22ee88, shape: 'cone'   },
  { id: 9,  name: 'Novaren',   price: 2000,   color: 0xffffff, shape: 'sphere' },
  { id: 10, name: 'Glacius',   price: 2500,   color: 0xa0e8ff, shape: 'cube'   },
  { id: 11, name: 'Lumen',     price: 3500,   color: 0xfff176, shape: 'sphere' },
  { id: 12, name: 'Ignion',    price: 4500,   color: 0xd32f2f, shape: 'cone'   },
  { id: 13, name: 'Aerius',    price: 6000,   color: 0x80deea, shape: 'cube'   },
  { id: 14, name: 'Voltara',   price: 8000,   color: 0xcddc39, shape: 'sphere' },
  { id: 15, name: 'Mystara',   price: 10000,  color: 0x5e35b1, shape: 'cone'   },
  { id: 16, name: 'Crystil',   price: 13000,  color: 0xf8bbd0, shape: 'cube'   },
  { id: 17, name: 'Bramble',   price: 16000,  color: 0x33691e, shape: 'sphere' },
  { id: 18, name: 'Umbrix',    price: 20000,  color: 0x4a148c, shape: 'cone'   },
  { id: 19, name: 'Stormel',   price: 25000,  color: 0x455a64, shape: 'cube'   },
  { id: 20, name: 'Ironhide',  price: 30000,  color: 0x90a4ae, shape: 'sphere' },
  { id: 21, name: 'Lyrien',    price: 36000,  color: 0xff7043, shape: 'cone'   },
  { id: 22, name: 'Terrax',    price: 44000,  color: 0x6d4c41, shape: 'cube'   },
  { id: 23, name: 'Abyssal',   price: 52000,  color: 0x00796b, shape: 'sphere' },
  { id: 24, name: 'Seraphic',  price: 62000,  color: 0xff4081, shape: 'cone'   },
  { id: 25, name: 'Wyvern',    price: 74000,  color: 0x00897b, shape: 'cube'   },
  { id: 26, name: 'Nebulon',   price: 86000,  color: 0x3f51b5, shape: 'sphere' },
  { id: 27, name: 'Gryphon',   price: 100000, color: 0xffab00, shape: 'cone'   },
  { id: 28, name: 'Celestine', price: 125000, color: 0xe1f5fe, shape: 'cube'   },
  { id: 29, name: 'Oblivion',  price: 200000, color: 0x1a0530, shape: 'sphere' },
];

// Builds a 3D "Win A Brainrot" plaza. The player walks around; when close
// to a pedestal the UI fires onNearPedestal(brainrot).
export function createBrainrot3DScene({ onNearPedestal, onLeavePedestal, canvas, avatar }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6b3a78);
  scene.fog = new THREE.Fog(0x6b3a78, 35, 90);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);

  // Warm sunset key light
  const key = new THREE.DirectionalLight(0xffc488, 2.0);
  key.position.set(10, 20, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -25; key.shadow.camera.right = 25;
  key.shadow.camera.top = 25; key.shadow.camera.bottom = -25;
  scene.add(key);

  // Pink rim light (not cyan/blue anymore)
  const rim = new THREE.DirectionalLight(0xff99cc, 0.6);
  rim.position.set(-10, 8, -10);
  scene.add(rim);

  // Brighter hemisphere fill so shadows aren't pitch black
  scene.add(new THREE.HemisphereLight(0xffd9b3, 0x4a2a55, 0.9));

  // Plaza floor - warm purple, lighter than before
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 32),
    new THREE.MeshLambertMaterial({ color: 0x5a3068 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(8, 8.3, 64),
    new THREE.MeshBasicMaterial({ color: 0xff6644, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  // Pedestals arranged in two concentric rings so 30 creatures fit.
  // First half on the inner ring, second half on the outer ring.
  const pedestals = [];
  const pedGeo = new THREE.CylinderGeometry(1.1, 1.3, 1.4, 16);
  const pedMat = new THREE.MeshLambertMaterial({ color: 0x8a4a70 });
  const half = Math.ceil(BRAINROTS.length / 2);
  const innerR = 11;
  const outerR = 19;
  for (let i = 0; i < BRAINROTS.length; i++) {
    const br = BRAINROTS[i];
    const onInner = i < half;
    const ring = onInner ? 0 : 1;
    const idxInRing = onInner ? i : i - half;
    const countInRing = onInner ? half : (BRAINROTS.length - half);
    const radius = onInner ? innerR : outerR;
    // Offset outer ring by half a step so pedestals are staggered
    const offset = ring === 1 ? Math.PI / countInRing : 0;
    const angle = (idxInRing / countInRing) * Math.PI * 2 + offset;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(x, 0.7, z);
    ped.castShadow = true;
    ped.receiveShadow = true;
    scene.add(ped);

    const figure = makeBrainrotFigure(br);
    figure.position.set(x, 1.4, z);
    scene.add(figure);

    pedestals.push({ brainrot: br, x, z, figure });
  }

  // Player (Roblox-style blocky character)
  const player = buildPlayer(avatar);
  player.group.position.set(0, 0, 0);
  scene.add(player.group);

  // Controls
  const keys = new Set();
  let yaw = 0, pitch = 0.45, distance = 9;
  let dragging = false, lastX = 0, lastY = 0;
  let nearest = null;

  function onKey(down) {
    return (e) => {
      const k = e.key.toLowerCase();
      if (down) keys.add(k); else keys.delete(k);
    };
  }
  const keydown = onKey(true);
  const keyup = onKey(false);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);

  function onMouseDown(e) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
  function onMouseUp() { dragging = false; }
  function onMouseMove(e) {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.005;
    pitch = Math.max(0.1, Math.min(1.3, pitch - (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  }
  function onWheel(e) {
    distance = Math.max(5, Math.min(18, distance + e.deltaY * 0.01));
    e.preventDefault();
  }
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function onTouchStart(e) { if (e.touches.length !== 1) return; dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  function onTouchEnd() { dragging = false; }
  function onTouchMove(e) {
    if (!dragging || e.touches.length !== 1) return;
    yaw -= (e.touches[0].clientX - lastX) * 0.005;
    pitch = Math.max(0.1, Math.min(1.3, pitch - (e.touches[0].clientY - lastY) * 0.005));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  }
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

  const clock = new THREE.Clock();
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const speed = 7;
  let running = true;
  let walkPhase = 0;

  // Jumping
  const GRAVITY = 26;
  const JUMP_VEL = 10;
  let vy = 0;
  let onGround = true;

  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);

    tmpForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    tmpRight.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = new THREE.Vector3();
    if (keys.has('w') || keys.has('arrowup'))    move.add(tmpForward);
    if (keys.has('s') || keys.has('arrowdown'))  move.sub(tmpForward);
    if (keys.has('d') || keys.has('arrowright')) move.add(tmpRight);
    if (keys.has('a') || keys.has('arrowleft'))  move.sub(tmpRight);

    const moving = move.lengthSq() > 0;
    if (moving) {
      move.normalize().multiplyScalar(speed * dt);
      player.group.position.x += move.x;
      player.group.position.z += move.z;
      const target = Math.atan2(move.x, move.z);
      let diff = target - player.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.group.rotation.y += diff * 0.25;
      walkPhase += dt * 10;
    }
    // Stay inside the plaza
    const d = Math.hypot(player.group.position.x, player.group.position.z);
    if (d > 28) {
      player.group.position.x *= 28 / d;
      player.group.position.z *= 28 / d;
    }

    // Jump: spacebar launches when on the ground; gravity pulls back down.
    if ((keys.has(' ') || keys.has('spacebar')) && onGround) {
      vy = JUMP_VEL;
      onGround = false;
    }
    if (!onGround) {
      vy -= GRAVITY * dt;
      player.group.position.y += vy * dt;
      if (player.group.position.y <= 0) {
        player.group.position.y = 0;
        vy = 0;
        onGround = true;
      }
    }

    // Walk animation (only when grounded - airborne pose is below)
    const swing = (moving && onGround) ? Math.sin(walkPhase) * 0.6 : 0;
    if (onGround) {
      player.armL.rotation.x = swing;
      player.armR.rotation.x = -swing;
      player.legL.rotation.x = -swing;
      player.legR.rotation.x = swing;
      // Idle bob / walk bob - don't overwrite jump y
      const bob = moving ? Math.abs(Math.sin(walkPhase)) * 0.08 : Math.sin(performance.now() * 0.003) * 0.05;
      player.group.position.y = bob;
    } else {
      // Tuck arms back, legs forward for an airborne pose
      player.armL.rotation.x = -0.5;
      player.armR.rotation.x = -0.5;
      player.legL.rotation.x = 0.3;
      player.legR.rotation.x = 0.3;
    }

    // Figures rotate + bob
    const t = performance.now() * 0.001;
    for (const p of pedestals) {
      p.figure.rotation.y = t * 0.6;
      p.figure.position.y = 1.4 + Math.sin(t * 2 + p.x) * 0.08;
    }

    // Proximity detection
    let near = null;
    let nearestDist = 3.0;
    for (const p of pedestals) {
      const dx = player.group.position.x - p.x;
      const dz = player.group.position.z - p.z;
      const dd = Math.hypot(dx, dz);
      if (dd < nearestDist) { nearestDist = dd; near = p; }
    }
    if (near !== nearest) {
      nearest = near;
      if (near) onNearPedestal(near.brainrot);
      else onLeavePedestal();
    }

    // Camera
    const cx = player.group.position.x + Math.sin(yaw) * Math.cos(pitch) * distance;
    const cz = player.group.position.z + Math.cos(yaw) * Math.cos(pitch) * distance;
    const cy = player.group.position.y + Math.sin(pitch) * distance + 2;
    camera.position.set(cx, cy, cz);
    camera.lookAt(player.group.position.x, player.group.position.y + 2, player.group.position.z);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return {
    dispose() {
      running = false;
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchmove', onTouchMove);
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
    markOwned(brId) {
      const p = pedestals.find((x) => x.brainrot.id === brId);
      if (p) {
        p.figure.traverse((o) => {
          if (o.material && o.material.emissive) o.material.emissive.setHex(0x66bb6a);
        });
      }
    },
  };
}

// Per-creature accessory recipes. Each creature gets a unique combo of
// head decorations, mouth, eye style, and one or two extras.
const FEATURES = {
  0:  { acc: 'horns',      mouth: 'fang',  eyes: 'small', accent: 0x2a0000 }, // Emberix
  1:  { acc: 'rays',       mouth: 'smile', eyes: 'big',   accent: 0xffd54f }, // Solara
  2:  { acc: 'petals',     mouth: 'smile', eyes: 'big',   accent: 0xff99cc }, // Blossom
  3:  { acc: 'gem',        mouth: 'line',  eyes: 'glow',  accent: 0x90caf9 }, // Azurion
  4:  { acc: 'wings',      mouth: 'beak',  eyes: 'small', accent: 0xffab40 }, // Flarewing
  5:  { acc: 'darkgem',    mouth: 'frown', eyes: 'glow',  accent: 0x7c4dff }, // Mystix
  6:  { acc: 'spikes',     mouth: 'line',  eyes: 'small', accent: 0xb3e5fc }, // Frostel
  7:  { acc: 'rays',       mouth: 'smile', eyes: 'glow',  accent: 0xfff59d }, // Sunspark
  8:  { acc: 'leaves',     mouth: 'smile', eyes: 'small', accent: 0x66bb6a }, // Verdant
  9:  { acc: 'aura',       mouth: 'smile', eyes: 'glow',  accent: 0xffffff }, // Novaren
  10: { acc: 'spikes',     mouth: 'line',  eyes: 'glow',  accent: 0x80deea }, // Glacius
  11: { acc: 'halo',       mouth: 'smile', eyes: 'glow',  accent: 0xffe082 }, // Lumen
  12: { acc: 'flames',     mouth: 'fang',  eyes: 'small', accent: 0xff6f00 }, // Ignion
  13: { acc: 'wisps',      mouth: 'line',  eyes: 'small', accent: 0xb2ebf2 }, // Aerius
  14: { acc: 'bolt',       mouth: 'smile', eyes: 'big',   accent: 0xfff176 }, // Voltara
  15: { acc: 'darkgem',    mouth: 'frown', eyes: 'glow',  accent: 0x7e57c2 }, // Mystara
  16: { acc: 'gem',        mouth: 'line',  eyes: 'glow',  accent: 0xf48fb1 }, // Crystil
  17: { acc: 'thorns',     mouth: 'frown', eyes: 'small', accent: 0x1b5e20 }, // Bramble
  18: { acc: 'darkaura',   mouth: 'frown', eyes: 'glow',  accent: 0x4a148c }, // Umbrix
  19: { acc: 'cloud',      mouth: 'line',  eyes: 'small', accent: 0xeceff1 }, // Stormel
  20: { acc: 'plates',     mouth: 'line',  eyes: 'small', accent: 0xb0bec5 }, // Ironhide
  21: { acc: 'fins',       mouth: 'smile', eyes: 'big',   accent: 0xff8a65 }, // Lyrien
  22: { acc: 'rocks',      mouth: 'line',  eyes: 'small', accent: 0x4e342e }, // Terrax
  23: { acc: 'tentacles',  mouth: 'line',  eyes: 'glow',  accent: 0x004d40 }, // Abyssal
  24: { acc: 'halo',       mouth: 'smile', eyes: 'glow',  accent: 0xff80ab }, // Seraphic
  25: { acc: 'wings',      mouth: 'fang',  eyes: 'slit',  accent: 0x004d40 }, // Wyvern
  26: { acc: 'stars',      mouth: 'smile', eyes: 'glow',  accent: 0x9fa8da }, // Nebulon
  27: { acc: 'crown',      mouth: 'beak',  eyes: 'big',   accent: 0xffd54f }, // Gryphon
  28: { acc: 'crystals',   mouth: 'smile', eyes: 'glow',  accent: 0xb3e5fc }, // Celestine
  29: { acc: 'voidaura',   mouth: 'fang',  eyes: 'glow',  accent: 0x6a1b9a }, // Oblivion
};

function makeBrainrotFigure(br) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: br.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const f = FEATURES[br.id] || { acc: 'none', mouth: 'line', eyes: 'small', accent: 0xffffff };
  const accent = new THREE.MeshLambertMaterial({ color: f.accent });

  // Head
  let head;
  if (br.shape === 'sphere') head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), mat);
  else if (br.shape === 'cone') head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 12), mat);
  else head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat);
  head.position.y = 0.9; head.castShadow = true;
  g.add(head);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.5), mat);
  body.position.y = 0.15; body.castShadow = true;
  g.add(body);

  // Eyes
  if (f.eyes === 'big') {
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
    const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
    e1.position.set(-0.18, 0.95, 0.45); e2.position.set(0.18, 0.95, 0.45);
    g.add(e1); g.add(e2);
    const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), pupilMat);
    const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), pupilMat);
    p1.position.set(-0.18, 0.95, 0.55); p2.position.set(0.18, 0.95, 0.55);
    g.add(p1); g.add(p2);
  } else if (f.eyes === 'glow') {
    const glowMat = new THREE.MeshBasicMaterial({ color: f.accent });
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), glowMat);
    const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), glowMat);
    e1.position.set(-0.16, 0.95, 0.5); e2.position.set(0.16, 0.95, 0.5);
    g.add(e1); g.add(e2);
  } else if (f.eyes === 'slit') {
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), eyeMat);
    const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), eyeMat);
    e1.position.set(-0.15, 0.95, 0.5); e2.position.set(0.15, 0.95, 0.5);
    g.add(e1); g.add(e2);
  } else {
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const e1 = new THREE.Mesh(eyeGeo, dark);
    const e2 = new THREE.Mesh(eyeGeo, dark);
    e1.position.set(-0.15, 0.95, 0.45); e2.position.set(0.15, 0.95, 0.45);
    g.add(e1); g.add(e2);
  }

  // Mouth
  if (f.mouth === 'smile') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), dark);
    m.position.set(0, 0.78, 0.5);
    g.add(m);
  } else if (f.mouth === 'frown') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), dark);
    m.position.set(0, 0.74, 0.5);
    m.rotation.z = 0.3;
    g.add(m);
    const m2 = m.clone(); m2.rotation.z = -0.3; g.add(m2);
  } else if (f.mouth === 'fang') {
    const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const x of [-0.08, 0.08]) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 4), fangMat);
      t.position.set(x, 0.74, 0.5);
      t.rotation.x = Math.PI;
      g.add(t);
    }
  } else if (f.mouth === 'beak') {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), accent);
    beak.position.set(0, 0.8, 0.55);
    beak.rotation.x = Math.PI / 2;
    g.add(beak);
  } else if (f.mouth === 'line') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.04), dark);
    m.position.set(0, 0.76, 0.5);
    g.add(m);
  }

  // Accessories per creature
  switch (f.acc) {
    case 'horns': {
      for (const x of [-0.25, 0.25]) {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), accent);
        h.position.set(x, 1.4, 0); h.castShadow = true;
        g.add(h);
      }
      break;
    }
    case 'rays': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), accent);
        r.position.set(Math.cos(a) * 0.65, 1.0, Math.sin(a) * 0.65);
        r.rotation.z = -a;
        g.add(r);
      }
      break;
    }
    case 'petals': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), accent);
        p.position.set(Math.cos(a) * 0.55, 1.4, Math.sin(a) * 0.55);
        p.scale.set(1, 0.5, 1);
        g.add(p);
      }
      break;
    }
    case 'gem': {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), accent);
      c.position.y = 1.55; c.castShadow = true;
      g.add(c);
      break;
    }
    case 'darkgem': {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshLambertMaterial({ color: f.accent, emissive: f.accent, emissiveIntensity: 0.4 }));
      c.position.y = 1.6; c.castShadow = true;
      g.add(c);
      break;
    }
    case 'wings': {
      for (const sign of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.06), accent);
        w.position.set(sign * 0.45, 0.4, 0);
        w.rotation.z = sign * 0.3;
        w.castShadow = true;
        g.add(w);
      }
      break;
    }
    case 'spikes': {
      for (const x of [-0.2, 0, 0.2]) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 4), accent);
        s.position.set(x, 1.5, 0); s.castShadow = true;
        g.add(s);
      }
      break;
    }
    case 'leaves': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const lf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 4), accent);
        lf.position.set(Math.cos(a) * 0.5, 1.35, Math.sin(a) * 0.5);
        lf.rotation.x = -0.6 * Math.cos(a);
        lf.rotation.z = -0.6 * Math.sin(a);
        g.add(lf);
      }
      break;
    }
    case 'aura': {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.05, 8, 24),
        new THREE.MeshBasicMaterial({ color: f.accent }),
      );
      ring.position.y = 0; ring.rotation.x = -Math.PI / 2;
      g.add(ring);
      const ring2 = ring.clone(); ring2.scale.setScalar(0.7); ring2.position.y = 0.05;
      g.add(ring2);
      break;
    }
    case 'halo': {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.04, 8, 24),
        new THREE.MeshBasicMaterial({ color: f.accent }),
      );
      ring.position.y = 1.5; ring.rotation.x = Math.PI / 2;
      g.add(ring);
      break;
    }
    case 'flames': {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 5),
          new THREE.MeshBasicMaterial({ color: f.accent }));
        fl.position.set(Math.cos(a) * 0.25, 1.55, Math.sin(a) * 0.25);
        g.add(fl);
      }
      break;
    }
    case 'wisps': {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), accent);
        w.position.set(Math.cos(a) * 0.7, 1.0 + Math.sin(a * 2) * 0.3, Math.sin(a) * 0.7);
        g.add(w);
      }
      break;
    }
    case 'bolt': {
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 3),
        new THREE.MeshBasicMaterial({ color: f.accent }));
      b.position.set(0, 1.55, 0);
      g.add(b);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08),
        new THREE.MeshBasicMaterial({ color: f.accent }));
      b2.position.set(0.1, 1.4, 0); b2.rotation.z = 0.5;
      g.add(b2);
      break;
    }
    case 'thorns': {
      for (let i = 0; i < 8; i++) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), accent);
        const a = Math.random() * Math.PI * 2;
        const r = 0.55, h = 0.7 + Math.random() * 0.7;
        t.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
        t.rotation.z = -a; t.rotation.x = Math.random();
        g.add(t);
      }
      break;
    }
    case 'darkaura': {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10),
        new THREE.MeshBasicMaterial({ color: f.accent, transparent: true, opacity: 0.35 }));
      cloud.position.y = 0.9;
      g.add(cloud);
      break;
    }
    case 'cloud': {
      for (const [x, z] of [[-0.3, 0.1], [0.3, 0.1], [0, -0.3]]) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0xffffff }));
        c.position.set(x, 1.55, z);
        g.add(c);
      }
      break;
    }
    case 'plates': {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.06), accent);
        p.position.set(Math.cos(a) * 0.45, 0.4, Math.sin(a) * 0.45);
        p.rotation.y = a;
        g.add(p);
      }
      break;
    }
    case 'fins': {
      for (const sign of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 5), accent);
        fin.position.set(sign * 0.5, 1.0, 0);
        fin.rotation.z = sign * 1.0;
        g.add(fin);
      }
      break;
    }
    case 'rocks': {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2), accent);
        r.position.set(Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45);
        r.rotation.set(Math.random(), Math.random(), Math.random());
        g.add(r);
      }
      break;
    }
    case 'tentacles': {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.5, 6), accent);
        t.position.set(Math.cos(a) * 0.32, -0.1, Math.sin(a) * 0.32);
        g.add(t);
      }
      break;
    }
    case 'wings_ext': // unused fallback
    case 'crown': {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6),
        new THREE.MeshLambertMaterial({ color: f.accent, emissive: 0x553300, emissiveIntensity: 0.4 }));
      band.position.y = 1.5;
      g.add(band);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4),
          new THREE.MeshLambertMaterial({ color: f.accent, emissive: 0x553300, emissiveIntensity: 0.4 }));
        sp.position.set(Math.cos(a) * 0.25, 1.7, Math.sin(a) * 0.25);
        g.add(sp);
      }
      break;
    }
    case 'stars': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + i * 0.3;
        const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07),
          new THREE.MeshBasicMaterial({ color: f.accent }));
        s.position.set(Math.cos(a) * 0.7, 1.0 + Math.sin(i) * 0.5, Math.sin(a) * 0.7);
        g.add(s);
      }
      break;
    }
    case 'crystals': {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), accent);
        c.position.set(Math.cos(a) * 0.35, 1.5 + i * 0.05, Math.sin(a) * 0.35);
        g.add(c);
      }
      break;
    }
    case 'voidaura': {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
      cloud.position.y = 0.7;
      g.add(cloud);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8),
        new THREE.MeshBasicMaterial({ color: f.accent, transparent: true, opacity: 0.7 }));
      inner.position.y = 0.9;
      g.add(inner);
      break;
    }
  }

  return g;
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
