import * as THREE from 'three';

export const BRAINROTS = [
  { id: 0, name: 'Skibidi',      price: 50,   color: 0xff3366, shape: 'cube'   },
  { id: 1, name: 'Gyatt',        price: 100,  color: 0xffaa00, shape: 'sphere' },
  { id: 2, name: 'Rizz',         price: 150,  color: 0xff66aa, shape: 'cone'   },
  { id: 3, name: 'Sigma',        price: 200,  color: 0x3366ff, shape: 'cube'   },
  { id: 4, name: 'Ohio',         price: 300,  color: 0xff4422, shape: 'sphere' },
  { id: 5, name: 'Fanum Tax',    price: 400,  color: 0x9944ff, shape: 'cone'   },
  { id: 6, name: 'Mewing',       price: 500,  color: 0x00ccff, shape: 'cube'   },
  { id: 7, name: 'Jellybean',    price: 750,  color: 0xffdd33, shape: 'sphere' },
  { id: 8, name: 'Baby Gronk',   price: 1000, color: 0x22ee88, shape: 'cone'   },
  { id: 9, name: 'Livvy Dunne',  price: 2000, color: 0xffffff, shape: 'sphere' },
];

// Builds a 3D "Win A Brainrot" plaza. The player walks around; when close
// to a pedestal the UI fires onNearPedestal(brainrot).
export function createBrainrot3DScene({ onNearPedestal, onLeavePedestal, canvas }) {
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

  // Pedestals in a ring around the center
  const pedestals = [];
  const pedGeo = new THREE.CylinderGeometry(1.1, 1.3, 1.4, 16);
  const pedMat = new THREE.MeshLambertMaterial({ color: 0x8a4a70 });
  const radius = 11;
  for (let i = 0; i < BRAINROTS.length; i++) {
    const br = BRAINROTS[i];
    const angle = (i / BRAINROTS.length) * Math.PI * 2;
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
  const player = buildPlayer();
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
      player.group.position.add(move);
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
    // Walk animation
    const swing = moving ? Math.sin(walkPhase) * 0.6 : 0;
    player.armL.rotation.x = swing;
    player.armR.rotation.x = -swing;
    player.legL.rotation.x = -swing;
    player.legR.rotation.x = swing;
    player.group.position.y = moving ? Math.abs(Math.sin(walkPhase)) * 0.08 : Math.sin(performance.now() * 0.003) * 0.05;

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

function makeBrainrotFigure(br) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: br.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });

  let head;
  if (br.shape === 'sphere') head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), mat);
  else if (br.shape === 'cone') head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 12), mat);
  else head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat);
  head.position.y = 0.9;
  head.castShadow = true;
  g.add(head);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.5), mat);
  body.position.y = 0.15;
  body.castShadow = true;
  g.add(body);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const eyeL = new THREE.Mesh(eyeGeo, dark);
  const eyeR = new THREE.Mesh(eyeGeo, dark);
  eyeL.position.set(-0.15, 0.95, 0.45);
  eyeR.position.set( 0.15, 0.95, 0.45);
  g.add(eyeL); g.add(eyeR);

  return g;
}

function buildPlayer() {
  const group = new THREE.Group();
  const skin  = new THREE.MeshLambertMaterial({ color: 0xf0c080 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x42a5f5 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x333333 });

  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skin);
  head.position.y = 3.0; head.castShadow = true;
  group.add(head);

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
