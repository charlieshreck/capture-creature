import * as THREE from 'three';
import { OUTFIT_COLORS, makeHat } from '../avatar3d.js';
import { SPELLS, getLevelConfig } from './scene.js';

const PLAYER_MAX_HP = 100;
const SPELL_COOLDOWN = 2.5;   // seconds — same for player and AI
const AI_REACTION_GAP = 0.6;  // small extra delay so AI feels fair

// Builds the battle arena and runs a real-time duel.
//
// Real-time: each spell has its own 2.5s cooldown. Player clicks a spell
// whenever it's ready. AI fires whenever its own cooldown expires.
//
// Callbacks:
//   onState({ playerHp, aiHp, cooldowns, ... }) — fires every frame
//   onEnd({ won }) — fires when one side hits 0 HP
export function createBattleScene({ canvas, level, playerSpells, playerAvatar, onState, onEnd }) {
  const cfg = getLevelConfig(level);
  const theme = cfg.theme;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.sky, 30, 90);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);

  // Orbit camera around the centre of the arena
  let yaw = 0;
  let pitch = 0.35;
  let distance = 20;
  const lookTarget = new THREE.Vector3(0, 2, 0);

  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(8, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.6));

  // Floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(22, 48),
    new THREE.MeshLambertMaterial({ color: theme.floor }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Outer ring (just visual)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(22, 23.5, 64),
    new THREE.MeshBasicMaterial({ color: theme.accent, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  // Theme-flavoured scenery
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 19;
    const z = Math.sin(a) * 19;
    const r = 0.6 + Math.random() * 1.4;
    const prop = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r),
      new THREE.MeshLambertMaterial({ color: theme.accent }),
    );
    prop.position.set(x, r * 0.6, z);
    prop.castShadow = true;
    scene.add(prop);
  }

  // Wizards
  const playerWiz = buildWizard(playerAvatar || { outfit: 0, hat: 0 });
  playerWiz.group.position.set(-6, 0, 0);
  playerWiz.group.rotation.y = Math.PI / 2;
  scene.add(playerWiz.group);

  const aiAvatar = { outfit: 3, hat: 3 };
  const aiWiz = buildWizard(aiAvatar);
  aiWiz.group.position.set(6, 0, 0);
  aiWiz.group.rotation.y = -Math.PI / 2;
  scene.add(aiWiz.group);

  // State
  let playerHp = PLAYER_MAX_HP;
  let aiHp = cfg.aiHp;
  let over = false;
  let raf = 0;
  const projectiles = [];
  const effects = [];                         // ground cracks, particles, shockwaves
  const flashTimers = new Map();
  const playerCooldowns = {};                 // spellId -> seconds remaining
  for (const id of playerSpells) playerCooldowns[id] = 0;
  let aiCooldown = AI_REACTION_GAP;           // small starting delay

  const fire = () => onState && onState({
    playerHp, aiHp,
    playerMaxHp: PLAYER_MAX_HP, aiMaxHp: cfg.aiHp,
    cooldowns: { ...playerCooldowns },
    cooldownMax: SPELL_COOLDOWN,
    over,
  });
  fire();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Camera controls (drag to orbit, wheel to zoom) ----
  let dragging = false, lastX = 0, lastY = 0;
  const onMouseDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
  const onMouseUp = () => { dragging = false; };
  const onMouseMove = (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.006;
    pitch = Math.max(0.05, Math.min(1.2, pitch - (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  };
  const onWheel = (e) => {
    distance = Math.max(8, Math.min(40, distance + e.deltaY * 0.02));
    e.preventDefault();
  };
  const onTouchStart = (e) => { if (e.touches.length !== 1) return; dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; };
  const onTouchEnd = () => { dragging = false; };
  const onTouchMove = (e) => {
    if (!dragging || e.touches.length !== 1) return;
    yaw -= (e.touches[0].clientX - lastX) * 0.006;
    pitch = Math.max(0.05, Math.min(1.2, pitch - (e.touches[0].clientY - lastY) * 0.005));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  };
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchmove', onTouchMove);

  // Cast a spell projectile from caster -> target. Calls hit() on impact.
  function castSpell(spellId, fromGroup, toGroup, onHit) {
    const spell = SPELLS.find((s) => s.id === spellId);
    if (!spell) { if (onHit) onHit(0); return; }
    const from = fromGroup.position.clone(); from.y += 2.5;
    const to = toGroup.position.clone(); to.y += 2.5;

    const sphere = buildProjectileMesh(spell);
    sphere.position.copy(from);
    scene.add(sphere);
    const light = new THREE.PointLight(spell.color, 2, 8);
    sphere.add(light);

    const start = performance.now();
    const dur = 500;
    projectiles.push({
      sphere,
      tick(now) {
        const t = Math.min(1, (now - start) / dur);
        sphere.position.lerpVectors(from, to, t);
        sphere.position.y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * 1.5;
        sphere.rotation.x += 0.2;
        sphere.rotation.y += 0.15;
        if (t >= 1) {
          scene.remove(sphere);
          spawnImpactEffect(spell, to, toGroup);
          if (onHit) onHit(spell.damage);
          return true;
        }
        return false;
      },
    });
  }

  // Player casts a spell — succeeds only if that spell is off cooldown.
  function playerCast(spellId) {
    if (over) return;
    if (!(spellId in playerCooldowns)) return;
    if (playerCooldowns[spellId] > 0) return;
    playerCooldowns[spellId] = SPELL_COOLDOWN;
    castSpell(spellId, playerWiz.group, aiWiz.group, (dmg) => {
      if (over) return;
      aiHp = Math.max(0, aiHp - dmg);
      flashTimers.set(aiWiz.group, 0.25);
      if (aiHp <= 0) { endBattle(true); }
      fire();
    });
    fire();
  }

  function aiCast() {
    if (over) return;
    const choice = cfg.aiSpells[Math.floor(Math.random() * cfg.aiSpells.length)];
    castSpell(choice, aiWiz.group, playerWiz.group, (dmg) => {
      if (over) return;
      playerHp = Math.max(0, playerHp - dmg);
      flashTimers.set(playerWiz.group, 0.25);
      if (playerHp <= 0) { endBattle(false); }
      fire();
    });
  }

  function endBattle(won) {
    if (over) return;
    over = true;
    fire();
    setTimeout(() => { if (onEnd) onEnd({ won }); }, 900);
  }

  // ---- Render loop ----
  let lastT = performance.now();
  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // Idle bobbing
    playerWiz.group.position.y = Math.sin(now * 0.003) * 0.1;
    aiWiz.group.position.y = Math.sin(now * 0.003 + Math.PI) * 0.1;

    // Cooldowns
    let cdChanged = false;
    for (const id in playerCooldowns) {
      if (playerCooldowns[id] > 0) {
        playerCooldowns[id] = Math.max(0, playerCooldowns[id] - dt);
        cdChanged = true;
      }
    }
    if (!over) {
      aiCooldown -= dt;
      if (aiCooldown <= 0) {
        aiCooldown = SPELL_COOLDOWN;
        aiCast();
      }
    }
    if (cdChanged) fire();

    // Hit flashes
    for (const [group, t] of flashTimers) {
      const left = t - dt;
      if (left <= 0) {
        flashTimers.delete(group);
        setWizardFlash(group, 0);
      } else {
        flashTimers.set(group, left);
        setWizardFlash(group, left / 0.25);
      }
    }

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (projectiles[i].tick(now)) projectiles.splice(i, 1);
    }
    // Impact effects (cracks, debris, shockwaves)
    for (let i = effects.length - 1; i >= 0; i--) {
      if (effects[i].tick(dt)) {
        effects[i].dispose && effects[i].dispose();
        effects.splice(i, 1);
      }
    }

    // Camera orbit
    const cx = lookTarget.x + Math.sin(yaw) * Math.cos(pitch) * distance;
    const cz = lookTarget.z + Math.cos(yaw) * Math.cos(pitch) * distance;
    const cy = lookTarget.y + Math.sin(pitch) * distance;
    camera.position.set(cx, cy, cz);
    camera.lookAt(lookTarget);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // ---- Per-spell impact effects ----
  function spawnImpactEffect(spell, pos, targetGroup) {
    const groundPos = new THREE.Vector3(targetGroup.position.x, 0, targetGroup.position.z);
    switch (spell.id) {
      case 'pebble':
      case 'quake':
        addRockSmash(spell, groundPos, spell.id === 'quake' ? 1.6 : 1.0);
        break;
      case 'spark':
      case 'flame':
        addFireBurst(spell, pos, spell.id === 'flame' ? 1.6 : 1.0);
        break;
      case 'splash':
      case 'tide':
        addSplash(spell, groundPos, spell.id === 'tide' ? 1.6 : 1.0);
        break;
      case 'gust':
        addWindRing(spell, pos);
        break;
      case 'glow':
        addLightFlash(spell, pos);
        break;
      case 'leaf':
        addLeafSwirl(spell, pos);
        break;
      case 'shock':
        addLightning(spell, new THREE.Vector3(pos.x, pos.y + 6, pos.z), pos);
        break;
      default:
        addFireBurst(spell, pos, 1.0);
    }
  }

  function addRockSmash(spell, groundPos, scale) {
    // 1. A chunky rock falls from above and lands at groundPos
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.8 * scale),
      new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
    );
    rock.castShadow = true;
    rock.position.set(groundPos.x, 8, groundPos.z);
    scene.add(rock);

    // 2. Ground cracks — a few long thin black bars laid in a star pattern
    const crackGroup = new THREE.Group();
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0 });
    const crackGeo = new THREE.PlaneGeometry(1, 0.18);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(crackGeo, crackMat.clone());
      c.rotation.x = -Math.PI / 2;
      c.rotation.z = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      c.position.set(groundPos.x, 0.04, groundPos.z);
      c.scale.set(0.01, 1, 1);
      crackGroup.add(c);
    }
    scene.add(crackGroup);

    // 3. Debris pebbles flying out
    const debris = [];
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.15 * scale),
        new THREE.MeshLambertMaterial({ color: 0x8d6e63 }),
      );
      d.position.set(groundPos.x, 0.3, groundPos.z);
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 3;
      d.userData.vx = Math.cos(a) * sp;
      d.userData.vz = Math.sin(a) * sp;
      d.userData.vy = 4 + Math.random() * 3;
      scene.add(d);
      debris.push(d);
    }

    // 4. Dust shockwave ring
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 32),
      new THREE.MeshBasicMaterial({ color: 0xd7c2a3, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(groundPos.x, 0.05, groundPos.z);
    scene.add(ringMesh);

    const fallDur = 0.25;
    const totalLife = 3.5;        // cracks linger ~3.5s
    let elapsed = 0;
    let landed = false;
    effects.push({
      tick(dt) {
        elapsed += dt;
        if (!landed) {
          const t = Math.min(1, elapsed / fallDur);
          rock.position.y = 8 + (0.6 - 8) * t;
          rock.rotation.x += dt * 6;
          rock.rotation.z += dt * 4;
          if (t >= 1) {
            landed = true;
            // Grow cracks instantly on landing
            for (const c of crackGroup.children) {
              c.scale.x = (1.6 + Math.random() * 0.9) * scale;
              c.material.opacity = 0.85;
            }
          }
        } else {
          // Fade cracks slowly
          const fadeT = (elapsed - fallDur) / (totalLife - fallDur);
          for (const c of crackGroup.children) c.material.opacity = 0.85 * (1 - fadeT);

          // Debris ballistic flight
          for (const d of debris) {
            d.userData.vy -= 22 * dt;
            d.position.x += d.userData.vx * dt;
            d.position.z += d.userData.vz * dt;
            d.position.y += d.userData.vy * dt;
            if (d.position.y < 0.1) { d.userData.vy = 0; d.position.y = 0.1; d.userData.vx *= 0.6; d.userData.vz *= 0.6; }
            d.rotation.x += dt * 5;
            d.rotation.y += dt * 4;
          }

          // Expanding ring
          const rt = Math.min(1, (elapsed - fallDur) / 0.6);
          ringMesh.scale.set(1 + rt * 6, 1, 1 + rt * 6);
          ringMesh.material.opacity = 0.8 * (1 - rt);
        }
        return elapsed >= totalLife;
      },
      dispose() {
        scene.remove(rock); scene.remove(crackGroup); scene.remove(ringMesh);
        for (const d of debris) scene.remove(d);
      },
    });
  }

  function addFireBurst(spell, pos, scale) {
    const group = new THREE.Group();
    const sparks = [];
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.18 * scale, 8, 6),
        new THREE.MeshBasicMaterial({ color: spell.color, transparent: true, opacity: 1 }),
      );
      s.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI - Math.PI / 2;
      const sp = (4 + Math.random() * 4) * scale;
      s.userData.vx = Math.cos(a) * Math.cos(e) * sp;
      s.userData.vy = Math.sin(e) * sp + 2;
      s.userData.vz = Math.sin(a) * Math.cos(e) * sp;
      group.add(s); sparks.push(s);
    }
    scene.add(group);
    const light = new THREE.PointLight(spell.color, 4 * scale, 10);
    light.position.copy(pos);
    scene.add(light);
    let t = 0;
    const life = 0.6;
    effects.push({
      tick(dt) {
        t += dt;
        for (const s of sparks) {
          s.userData.vy -= 8 * dt;
          s.position.x += s.userData.vx * dt;
          s.position.y += s.userData.vy * dt;
          s.position.z += s.userData.vz * dt;
          s.material.opacity = 1 - t / life;
        }
        light.intensity = 4 * scale * (1 - t / life);
        return t >= life;
      },
      dispose() { scene.remove(group); scene.remove(light); },
    });
  }

  function addSplash(spell, groundPos, scale) {
    const group = new THREE.Group();
    const drops = [];
    for (let i = 0; i < 18; i++) {
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.14 * scale, 8, 6),
        new THREE.MeshStandardMaterial({ color: spell.color, emissive: spell.color, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 }),
      );
      d.position.set(groundPos.x, 0.3, groundPos.z);
      const a = Math.random() * Math.PI * 2;
      const sp = (3 + Math.random() * 3) * scale;
      d.userData.vx = Math.cos(a) * sp;
      d.userData.vz = Math.sin(a) * sp;
      d.userData.vy = 5 + Math.random() * 3;
      group.add(d); drops.push(d);
    }
    // Puddle on the ground
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(0.6 * scale, 24),
      new THREE.MeshBasicMaterial({ color: spell.color, transparent: true, opacity: 0.7 }),
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(groundPos.x, 0.03, groundPos.z);
    group.add(puddle);
    scene.add(group);
    let t = 0;
    const life = 1.2;
    effects.push({
      tick(dt) {
        t += dt;
        for (const d of drops) {
          d.userData.vy -= 18 * dt;
          d.position.x += d.userData.vx * dt;
          d.position.y += d.userData.vy * dt;
          d.position.z += d.userData.vz * dt;
          if (d.position.y < 0.05) d.material.opacity = 0;
        }
        const pt = t / life;
        puddle.scale.set(1 + pt * 3, 1, 1 + pt * 3);
        puddle.material.opacity = 0.7 * (1 - pt);
        return t >= life;
      },
      dispose() { scene.remove(group); },
    });
  }

  function addWindRing(spell, pos) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.12, 8, 24),
      new THREE.MeshBasicMaterial({ color: spell.color, transparent: true, opacity: 0.9 }),
    );
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    let t = 0;
    const life = 0.5;
    effects.push({
      tick(dt) {
        t += dt;
        const k = t / life;
        ring.scale.set(1 + k * 5, 1 + k * 5, 1);
        ring.material.opacity = 0.9 * (1 - k);
        return t >= life;
      },
      dispose() { scene.remove(ring); },
    });
  }

  function addLightFlash(spell, pos) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 16, 12),
      new THREE.MeshBasicMaterial({ color: spell.color, transparent: true, opacity: 1 }),
    );
    flash.position.copy(pos);
    scene.add(flash);
    const light = new THREE.PointLight(spell.color, 6, 14);
    light.position.copy(pos);
    scene.add(light);
    let t = 0;
    const life = 0.4;
    effects.push({
      tick(dt) {
        t += dt;
        const k = t / life;
        flash.scale.set(1 + k * 2, 1 + k * 2, 1 + k * 2);
        flash.material.opacity = 1 - k;
        light.intensity = 6 * (1 - k);
        return t >= life;
      },
      dispose() { scene.remove(flash); scene.remove(light); },
    });
  }

  function addLeafSwirl(spell, pos) {
    const group = new THREE.Group();
    const leaves = [];
    for (let i = 0; i < 16; i++) {
      const l = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.18),
        new THREE.MeshBasicMaterial({ color: spell.color, transparent: true, opacity: 1, side: THREE.DoubleSide }),
      );
      l.position.copy(pos);
      l.userData.angle = Math.random() * Math.PI * 2;
      l.userData.radius = 0.2 + Math.random() * 0.4;
      l.userData.dy = 1 + Math.random() * 2;
      l.userData.spin = (Math.random() - 0.5) * 8;
      group.add(l); leaves.push(l);
    }
    scene.add(group);
    let t = 0;
    const life = 0.9;
    effects.push({
      tick(dt) {
        t += dt;
        for (const l of leaves) {
          l.userData.angle += dt * 6;
          l.userData.radius += dt * 1.5;
          l.position.x = pos.x + Math.cos(l.userData.angle) * l.userData.radius;
          l.position.z = pos.z + Math.sin(l.userData.angle) * l.userData.radius;
          l.position.y += l.userData.dy * dt;
          l.rotation.z += l.userData.spin * dt;
          l.material.opacity = 1 - t / life;
        }
        return t >= life;
      },
      dispose() { scene.remove(group); },
    });
  }

  function addLightning(spell, from, to) {
    // A jagged zig-zag line + a quick flash light
    const points = [];
    const segs = 8;
    for (let i = 0; i <= segs; i++) {
      const k = i / segs;
      const x = from.x + (to.x - from.x) * k + (i > 0 && i < segs ? (Math.random() - 0.5) * 0.8 : 0);
      const y = from.y + (to.y - from.y) * k;
      const z = from.z + (to.z - from.z) * k + (i > 0 && i < segs ? (Math.random() - 0.5) * 0.8 : 0);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: spell.color, transparent: true, opacity: 1 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    const light = new THREE.PointLight(spell.color, 5, 10);
    light.position.copy(to);
    scene.add(light);
    let t = 0;
    const life = 0.3;
    effects.push({
      tick(dt) {
        t += dt;
        mat.opacity = 1 - t / life;
        light.intensity = 5 * (1 - t / life);
        return t >= life;
      },
      dispose() { scene.remove(line); scene.remove(light); geo.dispose(); mat.dispose(); },
    });
  }

  function buildProjectileMesh(spell) {
    if (spell.id === 'pebble' || spell.id === 'quake') {
      return new THREE.Mesh(
        new THREE.DodecahedronGeometry(spell.id === 'quake' ? 0.7 : 0.45),
        new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
      );
    }
    if (spell.id === 'leaf') {
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 12, 8),
        new THREE.MeshStandardMaterial({ color: spell.color, emissive: spell.color, emissiveIntensity: 0.8 }),
      );
    }
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12),
      new THREE.MeshStandardMaterial({
        color: spell.color, emissive: spell.color, emissiveIntensity: 1.4,
      }),
    );
  }

  return {
    playerCast,
    getPlayerSpells: () => playerSpells.slice(),
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchmove', onTouchMove);
      renderer.dispose();
    },
  };
}

function setWizardFlash(group, amount) {
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive) {
      o.material.emissive.setHex(amount > 0 ? 0xff0000 : (o.userData._origEmissive ?? 0x000000));
    }
  });
}

function buildWizard(avatar) {
  const group = new THREE.Group();
  const colors = OUTFIT_COLORS[avatar.outfit] || OUTFIT_COLORS[0];
  const skin  = new THREE.MeshLambertMaterial({ color: 0xf0c080, emissive: 0x000000 });
  const shirt = new THREE.MeshLambertMaterial({ color: colors.shirt, emissive: 0x000000 });
  const pants = new THREE.MeshLambertMaterial({ color: colors.pants, emissive: 0x000000 });

  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skin);
  head.position.y = 3.0; head.castShadow = true;
  group.add(head);

  if (avatar.hat) {
    const hat = makeHat(avatar.hat, 1.0);
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

  return { group };
}
