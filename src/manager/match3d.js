// 3D first-person training match. Pulls 8 players from the user's squad
// (4v4), drops them on a pitch, and lets the user play as one of them.
// After the match ends (2 minutes or first to 5 goals), the caller can
// award rating bumps based on per-player stats.
//
// Controls:
//   W forward, S back, A left, D right
//   Mouse drag to look around (or click canvas for pointer-lock)
//   E shoot, B pass, Space jump (small)
//
// Stats tracked per player: goals, shots, passes, tackles, sprints, saves.

import * as THREE from 'three';

const PITCH_W = 60;
const PITCH_L = 90;
const GOAL_W = 14;
const GOAL_H = 5;
const PLAYER_HEIGHT = 1.8;
const MATCH_SECONDS = 120;
const SCORE_LIMIT = 5;
// How close the ball has to be for shoot/pass/touch/dribble to register.
// 2 yards ≈ 1.83 m / units in our scene.
const ACTION_RADIUS = 1.83;
// You can't reach the ball if it's above your head (no headers/volleys).
const REACH_HEIGHT = PLAYER_HEIGHT;

// opts: { squad, parent, controlledId?, onFinish(stats, scoreA, scoreB) }
export function startMatchTraining(opts) {
  const { squad, parent, controlledId, onFinish } = opts;

  // Pick 10 players (5v5). Each team is filled to match the slot
  // formation [GK, DEF, MID, MID, FWD]. Controlled player goes into the
  // matching slot on team A.
  const picked = pickTenPlayers(squad, controlledId);
  const teamA = picked.slice(0, 5);
  const teamB = picked.slice(5, 10);
  const controlled = teamA.find((p) => p.id === controlledId) || teamA[0];

  // ---- DOM scaffolding ----
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: #000; z-index: 11000;
    display: flex; flex-direction: column;
  `;
  parent.appendChild(overlay);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'flex: 1; display: block; cursor: crosshair;';
  overlay.appendChild(canvas);

  // HUD overlay (DOM)
  const hud = document.createElement('div');
  hud.style.cssText = `
    position: absolute; top: 12px; left: 0; right: 0;
    display: flex; justify-content: center; gap: 16px;
    font-family: system-ui, sans-serif; color: #fff;
    pointer-events: none; user-select: none;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  `;
  overlay.appendChild(hud);
  const scoreEl = document.createElement('div');
  scoreEl.style.cssText = 'font-size: 24px; font-weight: 900; padding: 6px 14px; background: rgba(0,0,0,0.5); border-radius: 8px;';
  hud.appendChild(scoreEl);
  const timeEl = document.createElement('div');
  timeEl.style.cssText = 'font-size: 16px; font-weight: 700; padding: 8px 14px; background: rgba(0,0,0,0.5); border-radius: 8px;';
  hud.appendChild(timeEl);

  const help = document.createElement('div');
  help.style.cssText = `
    position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
    color: #cce; font-size: 12px; background: rgba(0,0,0,0.5);
    padding: 6px 12px; border-radius: 8px; pointer-events: none;
    font-family: system-ui, sans-serif;
  `;
  help.textContent = 'WASD move • Drag • E shoot • B pass • C touch • T dribble (toggle) • Y slide tackle • Hold Q call for ball • Space jump';
  overlay.appendChild(help);

  const playerLabel = document.createElement('div');
  playerLabel.style.cssText = `
    position: absolute; top: 60px; left: 12px; color: #48ffaf;
    font-family: system-ui, sans-serif; font-size: 13px; font-weight: 700;
    background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 6px;
    pointer-events: none;
  `;
  playerLabel.textContent = `You: ${controlled.name} (${controlled.pos}) • Rating ${controlled.rating}`;
  overlay.appendChild(playerLabel);

  // Live reward flash (e.g., tackle hold +1)
  const rewardFlash = document.createElement('div');
  rewardFlash.style.cssText = `
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    color: #48ffaf; font-family: system-ui, sans-serif; font-size: 28px;
    font-weight: 900; letter-spacing: 2px; pointer-events: none;
    text-shadow: 0 2px 6px rgba(0,0,0,0.85);
    opacity: 0; transition: opacity 0.25s, transform 0.6s;
  `;
  overlay.appendChild(rewardFlash);
  function flashReward(text) {
    rewardFlash.textContent = text;
    rewardFlash.style.opacity = '1';
    rewardFlash.style.transform = 'translate(-50%, -75%)';
    setTimeout(() => {
      rewardFlash.style.opacity = '0';
      rewardFlash.style.transform = 'translate(-50%, -50%)';
    }, 1100);
  }

  const exitBtn = document.createElement('button');
  exitBtn.textContent = 'END MATCH';
  exitBtn.style.cssText = `
    position: absolute; top: 12px; right: 12px;
    background: #ff5252; color: #1a0000; border: none;
    padding: 8px 14px; font-weight: 800; cursor: pointer;
    border-radius: 6px; font-family: system-ui, sans-serif;
  `;
  overlay.appendChild(exitBtn);

  // Name-tag layer (HTML divs that follow players)
  const tagLayer = document.createElement('div');
  tagLayer.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';
  overlay.appendChild(tagLayer);

  // ---- Three.js ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6cb7ff);
  scene.fog = new THREE.Fog(0x6cb7ff, 100, 280);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 400);

  // Lighting
  const sun = new THREE.DirectionalLight(0xfff1c0, 1.5);
  sun.position.set(40, 90, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 220;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xddeeff, 0x224422, 0.55));

  // ---- Pitch with grass stripes ----
  const grass = makeStripedGrassTexture();
  const pitchMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_W * 1.4, PITCH_L * 1.4),
    new THREE.MeshLambertMaterial({ map: grass }),
  );
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.receiveShadow = true;
  scene.add(pitchMesh);

  // Surrounding tarmac/concrete around the pitch
  const surround = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_W * 2.2, PITCH_L * 2.0),
    new THREE.MeshLambertMaterial({ color: 0x4d3a2a }),
  );
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -0.01;
  surround.receiveShadow = true;
  scene.add(surround);

  // Stadium stands — coloured low walls all the way around
  buildStands(scene);

  // ---- Pitch markings ----
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });

  function addLines(points) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    scene.add(new THREE.Line(geo, lineMat));
  }
  // Outer touchlines
  addLines([
    new THREE.Vector3(-PITCH_W / 2, 0.02, -PITCH_L / 2),
    new THREE.Vector3( PITCH_W / 2, 0.02, -PITCH_L / 2),
    new THREE.Vector3( PITCH_W / 2, 0.02,  PITCH_L / 2),
    new THREE.Vector3(-PITCH_W / 2, 0.02,  PITCH_L / 2),
    new THREE.Vector3(-PITCH_W / 2, 0.02, -PITCH_L / 2),
  ]);
  addLines([new THREE.Vector3(-PITCH_W / 2, 0.02, 0), new THREE.Vector3( PITCH_W / 2, 0.02, 0)]);

  // Centre circle + spot
  const circle = new THREE.Mesh(
    new THREE.RingGeometry(7.5, 7.65, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  );
  circle.rotation.x = -Math.PI / 2; circle.position.y = 0.02; scene.add(circle);
  scene.add(makeSpot(0, 0));

  // Penalty + 6-yard boxes + penalty spot for each end
  function addBoxes(zSign) {
    const PA_W = 26, PA_D = 11;       // penalty area
    const GA_W = 14, GA_D = 4.5;      // 6-yard box
    const goalLine = (PITCH_L / 2) * zSign;
    const paZ = goalLine - PA_D * zSign;
    const gaZ = goalLine - GA_D * zSign;
    addLines([
      new THREE.Vector3(-PA_W / 2, 0.02, goalLine),
      new THREE.Vector3(-PA_W / 2, 0.02, paZ),
      new THREE.Vector3( PA_W / 2, 0.02, paZ),
      new THREE.Vector3( PA_W / 2, 0.02, goalLine),
    ]);
    addLines([
      new THREE.Vector3(-GA_W / 2, 0.02, goalLine),
      new THREE.Vector3(-GA_W / 2, 0.02, gaZ),
      new THREE.Vector3( GA_W / 2, 0.02, gaZ),
      new THREE.Vector3( GA_W / 2, 0.02, goalLine),
    ]);
    // Penalty spot
    scene.add(makeSpot(0, goalLine - 8 * zSign));
    // Penalty arc — partial circle
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(6.5, 6.65, 32, 1, Math.PI * (zSign > 0 ? 1.25 : 0.25), Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
    );
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(0, 0.02, goalLine - 8 * zSign);
    scene.add(arc);
  }
  addBoxes(1); addBoxes(-1);

  // Corner arcs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 12, 1, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
    );
    arc.rotation.x = -Math.PI / 2;
    let baseRot = 0;
    if (sx > 0 && sz < 0) baseRot = Math.PI * 1.5;
    else if (sx < 0 && sz < 0) baseRot = Math.PI;
    else if (sx < 0 && sz > 0) baseRot = Math.PI * 0.5;
    arc.rotation.z = baseRot;
    arc.position.set(sx * PITCH_W / 2, 0.02, sz * PITCH_L / 2);
    scene.add(arc);
  }

  function makeSpot(x, z) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.025, z);
    return m;
  }

  // ---- Goals + nets + corner flags ----
  function buildGoal(z) {
    const g = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const left  = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, GOAL_H, 12), postMat);
    const right = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, GOAL_H, 12), postMat);
    left.position.set(-GOAL_W / 2,  GOAL_H / 2, z);
    right.position.set( GOAL_W / 2, GOAL_H / 2, z);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, GOAL_W, 12), postMat);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, GOAL_H, z);
    left.castShadow = right.castShadow = bar.castShadow = true;
    g.add(left); g.add(right); g.add(bar);
    // Net (wireframe box behind the goal)
    const netDepth = 3.5;
    const dirZ = z < 0 ? -1 : 1;
    const netGeo = new THREE.BoxGeometry(GOAL_W, GOAL_H, netDepth);
    const wire = new THREE.WireframeGeometry(netGeo);
    const net = new THREE.LineSegments(wire,
      new THREE.LineBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.55 }));
    net.position.set(0, GOAL_H / 2, z + dirZ * (netDepth / 2));
    g.add(net);
    return g;
  }
  scene.add(buildGoal(-PITCH_L / 2));
  scene.add(buildGoal( PITCH_L / 2));

  // Corner flags
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    pole.position.set(sx * PITCH_W / 2, 0.7, sz * PITCH_L / 2);
    pole.castShadow = true; scene.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff3344, side: THREE.DoubleSide }),
    );
    flag.position.set(sx * PITCH_W / 2 + sx * 0.3, 1.2, sz * PITCH_L / 2);
    scene.add(flag);
  }

  // ---- Players ----
  // Team A defends z=-PITCH_L/2 (so attacks toward +z)
  // Team B defends z=+PITCH_L/2
  //
  // Each team is 5: 1 GK, 1 DEF, 2 MID, 1 FWD.
  const players = [];
  const SLOTS_A = [
    { role: 'GK',  pos: { x:  0,           z: -PITCH_L / 2 + 5 } },
    { role: 'DEF', pos: { x:  0,           z: -PITCH_L / 2 + 18 } },
    { role: 'MID', pos: { x: -PITCH_W / 4, z: -PITCH_L / 6 } },
    { role: 'MID', pos: { x:  PITCH_W / 4, z: -PITCH_L / 6 } },
    { role: 'FWD', pos: { x:  0,           z: -2 } },
  ];
  const SLOTS_B = SLOTS_A.map((s) => ({ role: s.role, pos: { x: -s.pos.x, z: -s.pos.z } }));

  function createPlayer(p, team, idx, isControlled) {
    const colours = team === 'A'
      ? { shirt: 0x1565c0, pants: 0xffffff, sock: 0x1565c0 }
      : { shirt: 0xc62828, pants: 0xffffff, sock: 0xc62828 };
    const group = new THREE.Group();
    let legL = null, legR = null, armL = null, armR = null;
    if (!isControlled) {
      // Torso
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.9, 0.45),
        new THREE.MeshLambertMaterial({ color: colours.shirt }),
      );
      torso.position.y = 1.15; torso.castShadow = true;
      group.add(torso);
      // Jersey number badge (small white square on the back)
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.35),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      badge.position.set(0, 1.25, -0.23);
      badge.rotation.y = Math.PI;
      group.add(badge);
      // Head + hair
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.55, 0.5),
        new THREE.MeshLambertMaterial({ color: 0xf0c080 }),
      );
      head.position.y = 1.92; head.castShadow = true;
      group.add(head);
      const hairColor = [0x222222, 0x6d4c41, 0xeeeeee, 0xffeb99, 0x8d6e63][idx % 5];
      const hair = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.18, 0.52),
        new THREE.MeshLambertMaterial({ color: hairColor }),
      );
      hair.position.y = 2.18;
      group.add(hair);
      // Arms — pivot from shoulder so we can swing them
      const armGeo = new THREE.BoxGeometry(0.22, 0.85, 0.22);
      armGeo.translate(0, -0.42, 0);    // pivot at top
      const armMat = new THREE.MeshLambertMaterial({ color: 0xf0c080 });
      armL = new THREE.Mesh(armGeo, armMat);
      armR = new THREE.Mesh(armGeo, armMat);
      armL.position.set(-0.55, 1.55, 0);
      armR.position.set( 0.55, 1.55, 0);
      armL.castShadow = armR.castShadow = true;
      group.add(armL); group.add(armR);
      // Legs (shorts + socks compound)
      const shortsGeo = new THREE.BoxGeometry(0.32, 0.4, 0.32);
      shortsGeo.translate(0, -0.2, 0);
      const sockGeo = new THREE.BoxGeometry(0.28, 0.5, 0.28);
      sockGeo.translate(0, -0.65, 0);
      const shortsMat = new THREE.MeshLambertMaterial({ color: colours.pants });
      const sockMat   = new THREE.MeshLambertMaterial({ color: colours.sock });
      legL = new THREE.Mesh(shortsGeo, shortsMat);
      legR = new THREE.Mesh(shortsGeo, shortsMat);
      const sockL = new THREE.Mesh(sockGeo, sockMat);
      const sockR = new THREE.Mesh(sockGeo, sockMat);
      legL.add(sockL); legR.add(sockR);
      legL.position.set(-0.2, 0.9, 0);
      legR.position.set( 0.2, 0.9, 0);
      legL.castShadow = legR.castShadow = true;
      group.add(legL); group.add(legR);
      // Boots
      const bootGeo = new THREE.BoxGeometry(0.32, 0.15, 0.55);
      const bootMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
      const bootL = new THREE.Mesh(bootGeo, bootMat);
      const bootR = new THREE.Mesh(bootGeo, bootMat);
      bootL.position.set(-0.2, 0.075, 0.07);
      bootR.position.set( 0.2, 0.075, 0.07);
      bootL.castShadow = bootR.castShadow = true;
      group.add(bootL); group.add(bootR);
    }

    // Position from team formation slot
    const slots = team === 'A' ? SLOTS_A : SLOTS_B;
    const f = slots[idx].pos;
    group.position.set(f.x, 0, f.z);
    group.rotation.y = team === 'A' ? Math.PI : 0;
    scene.add(group);

    // Name tag DOM element
    const tag = document.createElement('div');
    tag.style.cssText = `
      position: absolute; transform: translate(-50%, -100%);
      background: rgba(0,0,0,0.65); color: #fff; padding: 2px 8px;
      border-radius: 4px; font-size: 11px; font-weight: 700;
      font-family: system-ui, sans-serif;
      border: 1px solid ${team === 'A' ? '#48a0ff' : '#ff5252'};
      white-space: nowrap;
    `;
    tag.textContent = `${p.name} (${p.rating})`;
    if (isControlled) tag.style.display = 'none';
    tagLayer.appendChild(tag);

    return {
      data: p, team, idx, group, tag, isControlled,
      home: f,
      vy: 0, onGround: true,
      legL, legR, armL, armR,
      walkPhase: 0, lastX: f.x, lastZ: f.z,
      stats: { goals: 0, shots: 0, passes: 0, tackles: 0, sprints: 0, saves: 0 },
    };
  }

  for (let i = 0; i < 5; i++) players.push(createPlayer(teamA[i], 'A', i, teamA[i].id === controlled.id));
  for (let i = 0; i < 5; i++) players.push(createPlayer(teamB[i], 'B', i, false));

  const me = players.find((p) => p.isControlled);

  // ---- Ball ----
  const ball = {
    pos: new THREE.Vector3(0, 0.3, 0),
    vel: new THREE.Vector3(),
    radius: 0.3,
    lastKickerTeam: null,
  };
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
  );
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  // ---- Controls ----
  const keys = new Set();
  let yaw = me.team === 'A' ? 0 : Math.PI;     // facing toward opponent goal
  let pitch = -0.05;
  let dragging = false, lastMx = 0, lastMy = 0;

  let dribbleOn = false;
  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (keys.has(k)) return;          // ignore key-repeat for toggles
    keys.add(k);
    if ([' ', 'space'].includes(k) || e.code === 'Space') e.preventDefault();
    if (e.code === 'Space' && me.onGround) { me.vy = 4; me.onGround = false; }
    if (k === 'e') tryShoot();
    if (k === 'b') tryPass();
    if (k === 'c') tryTouch();
    if (k === 't') dribbleOn = !dribbleOn;
    if (k === 'y') trySlideTackle();
  };
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const onMouseDown = (e) => { dragging = true; lastMx = e.clientX; lastMy = e.clientY; };
  const onMouseUp = () => { dragging = false; };
  const onMouseMove = (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastMx) * 0.005;
    pitch = Math.max(-0.6, Math.min(0.4, pitch - (e.clientY - lastMy) * 0.004));
    lastMx = e.clientX; lastMy = e.clientY;
  };
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  function resize() {
    const w = overlay.clientWidth, h = overlay.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Game logic ----
  let scoreA = 0, scoreB = 0;
  let raf = 0;
  let lastT = performance.now();
  const matchStart = performance.now();
  let kickoffPause = 0;

  function canReachBall() {
    return ballDistance(me) <= ACTION_RADIUS && ball.pos.y <= REACH_HEIGHT;
  }

  function tryShoot() {
    if (!canReachBall()) return;
    const dir = forwardVec(yaw);
    ball.vel.copy(dir).multiplyScalar(28);
    ball.vel.y = 6;
    ball.lastKickerTeam = me.team;
    me.stats.shots++;
    dribbleOn = false;            // releasing the ball ends the dribble
  }

  function tryTouch() {
    if (!canReachBall()) return;
    const dir = forwardVec(yaw);
    ball.vel.x = dir.x * 6;
    ball.vel.z = dir.z * 6;
    ball.vel.y = Math.max(ball.vel.y, 0.5);
    ball.lastKickerTeam = me.team;
    dribbleOn = false;
  }

  function tryDribble(dt) {
    // While T held, glue the ball to a point just in front of feet.
    if (!canReachBall()) return;
    const fwd = forwardVec(yaw);
    const tx = me.group.position.x + fwd.x * 0.9;
    const tz = me.group.position.z + fwd.z * 0.9;
    ball.pos.x += (tx - ball.pos.x) * Math.min(1, 18 * dt);
    ball.pos.z += (tz - ball.pos.z) * Math.min(1, 18 * dt);
    ball.pos.y = ball.radius;
    ball.vel.set(0, 0, 0);
    ball.lastKickerTeam = me.team;
  }

  function tryPass() {
    if (!canReachBall()) return;
    // Find nearest teammate
    let best = null, bestD = Infinity;
    for (const pl of players) {
      if (pl === me || pl.team !== me.team) continue;
      const d = pl.group.position.distanceTo(me.group.position);
      if (d < bestD) { bestD = d; best = pl; }
    }
    if (!best) return;
    const dir = best.group.position.clone().sub(me.group.position).normalize();
    ball.vel.copy(dir).multiplyScalar(18);
    ball.vel.y = 2;
    ball.lastKickerTeam = me.team;
    me.stats.passes++;
    dribbleOn = false;
  }

  // Y — slide tackle. The player physically slides forward on the floor
  // for ~0.55s. While sliding, contact with the ball means you collect it
  // (auto-dribble on); contact with an opponent ball-carrier means you
  // nick it off them and start dribbling immediately.
  let slideRecover = 0;
  let slideTimer = 0;
  let slideDir = null;
  // Tackle-reward: every successful tackle starts a 2-second hold timer.
  // If the user still has the ball when it expires, +1 rating live.
  let tackleAwardAt = 0;
  const TACKLE_REWARD_DELAY = 2000;
  function trySlideTackle() {
    if (slideRecover > 0 || slideTimer > 0) return;
    slideTimer = 0.55;
    slideRecover = 1.1;
    slideDir = forwardVec(yaw);
  }

  function forwardVec(y) {
    return new THREE.Vector3(-Math.sin(y), 0, -Math.cos(y));
  }

  function ballDistance(pl) {
    const d = ball.pos.clone().sub(pl.group.position); d.y = 0;
    return d.length();
  }

  function aiTick(dt) {
    const callingForBall = keys.has('q');
    // Closest player on each team chases the ball
    const nearestOf = { A: null, B: null };
    for (const p of players) {
      const d = ballDistance(p);
      if (!nearestOf[p.team] || d < ballDistance(nearestOf[p.team])) nearestOf[p.team] = p;
    }
    const now = performance.now();

    for (const p of players) {
      if (p.isControlled) continue;
      p.actionCD = (p.actionCD || 0) - dt;
      const dribbling = (p.dribbleUntil || 0) > now;
      const hasBall = ballDistance(p) < 1.4;
      const goalZ = p.team === 'A' ? PITCH_L / 2 : -PITCH_L / 2;

      // Pick a target to move toward
      let tx, tz;
      if (dribbling) {
        // Drive toward opponent goal
        tx = p.group.position.x * 0.92;
        tz = goalZ;
      } else if (p === nearestOf[p.team]) {
        tx = ball.pos.x; tz = ball.pos.z;
      } else {
        tx = p.home.x + Math.sin(now * 0.001 + p.idx) * 4;
        tz = p.home.z;
      }
      const dx = tx - p.group.position.x, dz = tz - p.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.3) {
        const speed = ((p === nearestOf[p.team] || dribbling) ? 7 : 5) * dt;
        const f = speed / dist;
        p.group.position.x += dx * f;
        p.group.position.z += dz * f;
        p.group.rotation.y = Math.atan2(dx, dz);
      }

      // While dribbling, glue ball just in front of feet
      if (dribbling) {
        const fx = Math.sin(p.group.rotation.y) * 0.9;
        const fz = Math.cos(p.group.rotation.y) * 0.9;
        ball.pos.x = p.group.position.x + fx;
        ball.pos.z = p.group.position.z + fz;
        ball.pos.y = ball.radius;
        ball.vel.set(0, 0, 0);
        ball.lastKickerTeam = p.team;
        p.stats.passes += dt * 0.05;        // small dribble credit
      }

      // When in possession and not currently dribbling, pick an action
      if (hasBall && !dribbling && p.actionCD <= 0) {
        // 1. If user is calling for the ball and we're a teammate, ALWAYS pass to user.
        if (callingForBall && p.team === me.team && p !== me) {
          const dToMe = me.group.position.distanceTo(p.group.position);
          if (dToMe < 40 && dToMe > 1) {
            const aim = me.group.position.clone().sub(p.group.position); aim.y = 0;
            aim.normalize();
            ball.vel.copy(aim).multiplyScalar(16 + Math.min(8, dToMe * 0.4));
            ball.vel.y = 2;
            ball.lastKickerTeam = p.team;
            p.stats.passes++;
            p.actionCD = 0.5;
            continue;
          }
        }
        const distToGoal = Math.abs(p.group.position.z - goalZ);
        const r = Math.random();
        // 2. Shoot if near goal
        if (distToGoal < PITCH_L / 5 && r < 0.35) {
          const targetX = (Math.random() - 0.5) * GOAL_W;
          const aim = new THREE.Vector3(targetX, 0, goalZ).sub(p.group.position).normalize();
          ball.vel.copy(aim).multiplyScalar(20 + Math.random() * 10);
          ball.vel.y = 3 + Math.random() * 3;
          ball.lastKickerTeam = p.team;
          p.stats.shots++;
        }
        // 3. Pass (most common option)
        else if (r < 0.85) {
          // Find best teammate forward of current position
          let best = null, bestScore = -Infinity;
          for (const t of players) {
            if (t === p || t.team !== p.team) continue;
            const fwdScore = (p.team === 'A' ? t.group.position.z : -t.group.position.z);
            const dpass = t.group.position.distanceTo(p.group.position);
            if (dpass < 4 || dpass > 35) continue;
            const score = fwdScore - dpass * 0.2;
            if (score > bestScore) { bestScore = score; best = t; }
          }
          if (best) {
            const aim = best.group.position.clone().sub(p.group.position); aim.y = 0;
            aim.normalize();
            ball.vel.copy(aim).multiplyScalar(15 + Math.random() * 4);
            ball.vel.y = 2;
            ball.lastKickerTeam = p.team;
            p.stats.passes++;
          }
        }
        // 4. Otherwise dribble for ~1.2s
        else {
          p.dribbleUntil = now + 1100 + Math.random() * 600;
        }
        p.actionCD = 0.55 + Math.random() * 0.35;
      }
    }
  }

  function ballPhysics(dt) {
    if (kickoffPause > 0) {
      kickoffPause -= dt;
      ball.vel.set(0, 0, 0);
      return;
    }
    ball.vel.y -= 9.8 * dt;
    ball.pos.add(ball.vel.clone().multiplyScalar(dt));
    if (ball.pos.y < ball.radius) {
      ball.pos.y = ball.radius;
      ball.vel.y *= -0.5;
      // Friction
      ball.vel.x *= 0.96;
      ball.vel.z *= 0.96;
      if (Math.abs(ball.vel.y) < 0.2) ball.vel.y = 0;
    }
    // Goal detection
    if (Math.abs(ball.pos.x) < GOAL_W / 2 && ball.pos.y < GOAL_H) {
      if (ball.pos.z < -PITCH_L / 2) {
        scoreB++;
        const scorer = creditGoal('B');
        if (scorer === me) bumpForGoal();
        kickoff();
      } else if (ball.pos.z > PITCH_L / 2) {
        scoreA++;
        const scorer = creditGoal('A');
        if (scorer === me) bumpForGoal();
        kickoff();
      }
    }
    // Out of pitch -> reset
    if (Math.abs(ball.pos.x) > PITCH_W / 2 + 4 || Math.abs(ball.pos.z) > PITCH_L / 2 + 4) {
      kickoff();
    }
  }

  function creditGoal(scoringTeam) {
    if (ball.lastKickerTeam !== scoringTeam) return null;
    let best = null, bestD = Infinity;
    for (const p of players) {
      if (p.team !== scoringTeam) continue;
      const d = p.group.position.distanceTo(ball.pos);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) {
      best.stats.goals++;
      return best;
    }
    return null;
  }

  function bumpForGoal() {
    if (me.data.rating < 117) {
      me.data.rating++;
      if (me.data.rating > me.data.potential) me.data.potential = me.data.rating;
      flashReward(`⚽ GOAL! +1 RATING — ${me.data.rating}`);
      playerLabel.textContent = `You: ${me.data.name} (${me.data.pos}) • Rating ${me.data.rating}`;
    } else {
      flashReward('⚽ GOAL!');
    }
  }

  function kickoff() {
    ball.pos.set(0, 0.3, 0);
    ball.vel.set(0, 0, 0);
    kickoffPause = 0.6;
    ball.lastKickerTeam = null;
    // Reset players to home positions
    for (const p of players) {
      p.group.position.set(p.home.x, 0, p.home.z);
    }
  }

  function controlledMovement(dt) {
    const speed = (keys.has('shift') ? 11 : 7) * dt;
    let mx = 0, mz = 0;
    if (keys.has('w')) mz -= 1;
    if (keys.has('s')) mz += 1;
    if (keys.has('a')) mx -= 1;
    if (keys.has('d')) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const wx = mz * sin + mx * cos;
      const wz = mz * cos - mx * sin;
      me.group.position.x = Math.max(-PITCH_W / 2 - 2, Math.min(PITCH_W / 2 + 2, me.group.position.x + wx * speed));
      me.group.position.z = Math.max(-PITCH_L / 2 - 2, Math.min(PITCH_L / 2 + 2, me.group.position.z + wz * speed));
      if (keys.has('shift')) me.stats.sprints += dt * 2;
    }
    // Slide-tackle cooldown
    if (slideRecover > 0) slideRecover = Math.max(0, slideRecover - dt);

    // Slide motion (overrides normal movement input)
    if (slideTimer > 0) {
      slideTimer = Math.max(0, slideTimer - dt);
      const slideSpeed = 14 * dt;
      me.group.position.x = Math.max(-PITCH_W / 2 - 2,
        Math.min(PITCH_W / 2 + 2, me.group.position.x + slideDir.x * slideSpeed));
      me.group.position.z = Math.max(-PITCH_L / 2 - 2,
        Math.min(PITCH_L / 2 + 2, me.group.position.z + slideDir.z * slideSpeed));
      // Ball contact during slide — pick it up and start dribbling
      if (ballDistance(me) < 1.8 && ball.pos.y < 1.2) {
        dribbleOn = true;
        ball.lastKickerTeam = me.team;
      }
      // Knock ball off opponent in contact
      for (const p of players) {
        if (p === me || p.team === me.team) continue;
        if (p.group.position.distanceTo(me.group.position) < 1.8 && ballDistance(p) < 2.0) {
          dribbleOn = true;
          me.stats.tackles++;
          tackleAwardAt = performance.now() + TACKLE_REWARD_DELAY;
          // Snap ball just in front of me to begin auto-dribble
          const f = forwardVec(yaw);
          ball.pos.x = me.group.position.x + f.x * 0.9;
          ball.pos.z = me.group.position.z + f.z * 0.9;
          ball.pos.y = ball.radius;
          ball.vel.set(0, 0, 0);
          ball.lastKickerTeam = me.team;
          break;
        }
      }
      // Apply dribble glue this frame too if it just turned on
      if (dribbleOn) tryDribble(dt);
      // Apply gravity while sliding
      me.vy -= 9.8 * dt;
      me.group.position.y += me.vy * dt;
      if (me.group.position.y < 0) { me.group.position.y = 0; me.vy = 0; me.onGround = true; }
      return;     // skip the normal movement / tackle blocks below
    }

    // Opponent tackles me: each opposing player rolls a 20% chance once
    // per second while they're in range. So normally they DON'T tackle —
    // only about a 1-in-5 attempt while they crowd you.
    const nowMs = performance.now();
    if (dribbleOn || ballDistance(me) < 1.5) {
      for (const p of players) {
        if (p === me || p.team === me.team) continue;
        if (p.group.position.distanceTo(me.group.position) > 1.5) {
          p._tackleRollAt = 0;        // reset when out of range
          continue;
        }
        if (nowMs - (p._tackleRollAt || 0) < 1000) continue;
        p._tackleRollAt = nowMs;
        if (Math.random() < 0.05) {
          const fwd = forwardVec(p.group.rotation.y);
          ball.vel.x = fwd.x * 6;
          ball.vel.z = fwd.z * 6;
          ball.vel.y = 1;
          ball.lastKickerTeam = p.team;
          p.stats.tackles++;
          dribbleOn = false;
          break;
        }
      }
    }

    // Dribble toggle (press T to start/stop)
    if (dribbleOn) tryDribble(dt);

    // I can tackle too if I'm right next to an opposing ball-carrier
    for (const p of players) {
      if (p === me || p.team === me.team) continue;
      if (p.group.position.distanceTo(me.group.position) < 1.6 && ballDistance(p) < 1.4) {
        ball.vel.x *= -0.5; ball.vel.z *= -0.5;
        me.stats.tackles++;
      }
    }

    // Vertical
    me.vy -= 9.8 * dt;
    me.group.position.y += me.vy * dt;
    if (me.group.position.y < 0) { me.group.position.y = 0; me.vy = 0; me.onGround = true; }
  }

  function updateTags() {
    const tmp = new THREE.Vector3();
    for (const p of players) {
      if (p.isControlled) continue;
      tmp.copy(p.group.position);
      tmp.y = 2.6;
      tmp.project(camera);
      if (tmp.z > 1 || tmp.z < -1) { p.tag.style.display = 'none'; continue; }
      p.tag.style.display = '';
      const x = (tmp.x * 0.5 + 0.5) * overlay.clientWidth;
      const y = (-tmp.y * 0.5 + 0.5) * overlay.clientHeight;
      p.tag.style.left = x + 'px';
      p.tag.style.top = y + 'px';
    }
  }

  function loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const elapsed = (now - matchStart) / 1000;
    if (elapsed > MATCH_SECONDS || scoreA >= SCORE_LIMIT || scoreB >= SCORE_LIMIT) {
      finish();
      return;
    }

    controlledMovement(dt);
    aiTick(dt);
    ballPhysics(dt);

    // Tackle reward: bump rating live if user held the ball for 2s after a tackle
    if (tackleAwardAt > 0) {
      const stillHasBall = dribbleOn || ballDistance(me) < 2.5;
      if (!stillHasBall) {
        tackleAwardAt = 0;            // lost it — no reward
      } else if (now >= tackleAwardAt) {
        if (me.data.rating < 117) {
          me.data.rating++;
          if (me.data.rating > me.data.potential) me.data.potential = me.data.rating;
          flashReward(`+1 RATING — ${me.data.rating}`);
          playerLabel.textContent = `You: ${me.data.name} (${me.data.pos}) • Rating ${me.data.rating}`;
        }
        tackleAwardAt = 0;
      }
    }

    // Camera at player's head position. Drop low while sliding to feel
    // like you're on the floor.
    const slideHeadDrop = slideTimer > 0 ? PLAYER_HEIGHT * 0.65 : 0;
    const headY = me.group.position.y + PLAYER_HEIGHT - slideHeadDrop;
    camera.position.set(me.group.position.x, headY, me.group.position.z);
    const lookDir = new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(camera.position.clone().add(lookDir));

    // Walking animation — swing legs / arms based on how far they moved this frame
    for (const p of players) {
      if (!p.legL) continue;
      const dx = p.group.position.x - p.lastX;
      const dz = p.group.position.z - p.lastZ;
      const moved = Math.hypot(dx, dz);
      p.lastX = p.group.position.x; p.lastZ = p.group.position.z;
      if (moved > 0.001) p.walkPhase += moved * 6;
      else p.walkPhase *= 0.85;
      const swing = Math.sin(p.walkPhase) * 0.55;
      p.legL.rotation.x = -swing;
      p.legR.rotation.x =  swing;
      if (p.armL) p.armL.rotation.x =  swing * 0.8;
      if (p.armR) p.armR.rotation.x = -swing * 0.8;
    }

    // Spin the ball when it's moving so it looks like it's rolling
    const ballSpeed = ball.vel.length();
    if (ballSpeed > 0.05) {
      const axis = new THREE.Vector3(-ball.vel.z, 0, ball.vel.x).normalize();
      ballMesh.rotateOnWorldAxis(axis, ballSpeed * dt * 0.5);
    }

    // Keep ball mesh in sync
    ballMesh.position.copy(ball.pos);

    // HUD
    scoreEl.textContent = `${scoreA}  -  ${scoreB}`;
    const left = Math.max(0, MATCH_SECONDS - elapsed);
    timeEl.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;

    updateTags();

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  // ---- Cleanup / finish ----
  function finish() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('resize', resize);
    overlay.remove();
    renderer.dispose();
    // Build stats map keyed by player id
    const stats = {};
    for (const p of players) stats[p.data.id] = p.stats;
    if (onFinish) onFinish(stats, scoreA, scoreB);
  }
  exitBtn.addEventListener('click', finish);
}

// Build a grass texture with light/dark mowing stripes.
function makeStripedGrassTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  for (let y = 0; y < c.height; y++) {
    const stripe = Math.floor(y / 16) % 2 === 0 ? '#3aa342' : '#2f8b38';
    ctx.fillStyle = stripe;
    ctx.fillRect(0, y, c.width, 1);
  }
  // Add a tiny noise pattern
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '20,80,30' : '120,180,90'},0.15)`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 14);
  return tex;
}

// Stadium stands — colored low walls all around the pitch, tiered.
function buildStands(scene) {
  const W = PITCH_W, L = PITCH_L;
  const tiers = [
    { offset: 16, height: 5,  color: 0x37474f },     // back tier
    { offset: 12, height: 3,  color: 0x546e7a },     // mid
    { offset:  9, height: 1.5, color: 0x78909c },    // front
  ];
  for (const t of tiers) {
    // North + South stands
    for (const sz of [-1, 1]) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(W + 2 * t.offset, t.height, 2),
        new THREE.MeshLambertMaterial({ color: t.color }),
      );
      m.position.set(0, t.height / 2, sz * (L / 2 + t.offset));
      m.receiveShadow = true; scene.add(m);
    }
    // East + West stands
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(2, t.height, L + 2 * t.offset),
        new THREE.MeshLambertMaterial({ color: t.color }),
      );
      m.position.set(sx * (W / 2 + t.offset), t.height / 2, 0);
      m.receiveShadow = true; scene.add(m);
    }
  }
  // Crowd — speckled rows of tiny boxes on the back tier
  const crowdColors = [0xef5350, 0x42a5f5, 0xffa726, 0xab47bc, 0x66bb6a, 0xfff176];
  function addCrowd(side, count, lengthAxis) {
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) - 0.5;
      const c = crowdColors[Math.floor(Math.random() * crowdColors.length)];
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.8, 0.7),
        new THREE.MeshLambertMaterial({ color: c }),
      );
      if (lengthAxis === 'x') {
        m.position.set(t * (W + 30), 5.5, side * (L / 2 + 16));
      } else {
        m.position.set(side * (W / 2 + 16), 5.5, t * (L + 30));
      }
      scene.add(m);
    }
  }
  addCrowd(-1, 60, 'x');
  addCrowd( 1, 60, 'x');
  addCrowd(-1, 80, 'z');
  addCrowd( 1, 80, 'z');
}

// Pick 10 players (5 per team). Returns them in slot order:
// [GK, DEF, MID, MID, FWD] for team A, then the same for team B.
// The controlled player is placed in their matching slot on team A so
// they get the camera + position they actually play.
function pickTenPlayers(squad, controlledId) {
  const SLOT_ROLES = ['GK', 'DEF', 'MID', 'MID', 'FWD'];
  const used = new Set();
  // Group by position, sorted by rating desc
  const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of squad) (byPos[p.pos] || (byPos[p.pos] = [])).push(p);
  for (const k in byPos) byPos[k].sort((a, b) => b.rating - a.rating);

  // Pull a player suited to a role (prefer matching position, fall back
  // to anyone). Marks them used.
  function takeForRole(role, prefer) {
    if (prefer && !used.has(prefer.id)) {
      used.add(prefer.id);
      return prefer;
    }
    const cands = byPos[role] || [];
    for (const p of cands) {
      if (!used.has(p.id)) { used.add(p.id); return p; }
    }
    // Fallback: any unused player
    const all = squad.filter((p) => !used.has(p.id));
    if (all.length === 0) return null;
    const r = all[Math.floor(Math.random() * all.length)];
    used.add(r.id);
    return r;
  }

  const teamA = new Array(5).fill(null);
  const teamB = new Array(5).fill(null);

  // Place the controlled player on team A in their natural slot.
  const ctrl = squad.find((p) => p.id === controlledId);
  if (ctrl) {
    let placedSlot = SLOT_ROLES.findIndex((r) => r === ctrl.pos && !teamA[SLOT_ROLES.indexOf(r)]);
    // Find the FIRST empty matching slot
    placedSlot = -1;
    for (let i = 0; i < SLOT_ROLES.length; i++) {
      if (SLOT_ROLES[i] === ctrl.pos && !teamA[i]) { placedSlot = i; break; }
    }
    // If no exact match (e.g. their position isn't in the formation), use any empty slot
    if (placedSlot < 0) {
      for (let i = 0; i < SLOT_ROLES.length; i++) if (!teamA[i]) { placedSlot = i; break; }
    }
    teamA[placedSlot] = ctrl;
    used.add(ctrl.id);
  }

  // Fill remaining team A slots with random-but-suitable players each match
  // (shuffle order so the same player isn't always picked).
  const slotOrder = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
  for (const i of slotOrder) {
    if (teamA[i]) continue;
    teamA[i] = takeForRole(SLOT_ROLES[i]);
  }

  // Fill team B
  for (let i = 0; i < 5; i++) teamB[i] = takeForRole(SLOT_ROLES[i]);

  // Filter out nulls (squad too small) but realistically you'd never get here
  // because the picker enforces ≥ 8 players (we want 10 ideally).
  return [...teamA, ...teamB].filter((p) => p);
}
