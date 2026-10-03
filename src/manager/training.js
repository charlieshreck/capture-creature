// Multi-skill training mini-game. Opens a modal with seven skill drills.
// Player completes any of them within a 2-minute session, then FINISH
// applies the training. Position-core skills decide whether the player
// improves; non-core skills decide how big the bump is.

import { POSITION_CORE } from './game.js';

const SKILLS = [
  { id: 'finishing',   name: 'Finishing',   color: '#ff5252' },
  { id: 'dribbling',   name: 'Dribbling',   color: '#ffab40' },
  { id: 'passing',     name: 'Passing',     color: '#48a0ff' },
  { id: 'pace',        name: 'Pace',        color: '#48ffaf' },
  { id: 'physicality', name: 'Physicality', color: '#b388ff' },
  { id: 'saves',       name: 'Saves',       color: '#fff176' },
  { id: 'defending',   name: 'Defending',   color: '#ff7043' },
];

const PALETTE = {
  bg: '#0a0f1c',
  panel: '#111a2f',
  panel2: '#1b2745',
  border: '#2d3a5e',
  text: '#e6ecff',
  dim: '#8a9bc7',
  accent: '#48ffaf',
  warn: '#ffab40',
  danger: '#ff5252',
};

function el(tag, css, text) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text != null) e.textContent = text;
  return e;
}

function btn(label, color, fill = false) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `
    background: ${fill ? color : 'transparent'};
    color: ${fill ? '#0a0a1a' : color};
    border: 1.5px solid ${color}; border-radius: 6px;
    padding: 6px 12px; font-weight: 800; font-size: 12px;
    letter-spacing: 1px; cursor: pointer;
  `;
  return b;
}

// Show the multi-drill modal. opts: { player, intensity, parent, onFinish(scores) }
export function showTrainingMinigame(opts) {
  const { player, intensity, parent, onFinish } = opts;

  const overlay = el('div', `
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center; z-index: 10000;
  `);
  parent.appendChild(overlay);

  const box = el('div', `
    background: ${PALETTE.panel}; border: 2px solid ${PALETTE.accent};
    border-radius: 12px; padding: 18px 20px;
    width: 760px; max-width: 96vw; max-height: 92vh; overflow: auto;
    display: flex; flex-direction: column; gap: 10px;
  `);
  overlay.appendChild(box);

  // Header
  box.appendChild(el('div',
    `font-size: 11px; color: ${PALETTE.dim}; letter-spacing: 2px;`,
    `${intensity === 'hard' ? 'HARD' : 'NORMAL'} TRAINING SESSION`));
  const titleRow = el('div', 'display: flex; align-items: baseline; gap: 10px;');
  titleRow.appendChild(el('div', 'font-size: 20px; font-weight: 900;', player.name));
  titleRow.appendChild(el('div', `font-size: 12px; color: ${PALETTE.dim};`,
    `${player.pos} • Rating ${player.rating} • Potential ${player.potential}`));
  box.appendChild(titleRow);

  const core = POSITION_CORE[player.pos] || [];
  box.appendChild(el('div', `font-size: 12px; color: ${PALETTE.dim};`,
    `Core skills (decide if you improve): ${core.map((s) => skillName(s)).join(', ')}. ` +
    'Other skills add to the size of the bump if you nail them too.'));

  // Timer + buttons row
  const controlRow = el('div', `
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0; border-top: 1px solid ${PALETTE.border};
    border-bottom: 1px solid ${PALETTE.border};
  `);
  const timerEl = el('div', `font-size: 14px; font-weight: 800; color: ${PALETTE.accent};`, '2:00');
  controlRow.appendChild(timerEl);
  controlRow.appendChild(el('div', 'flex: 1;'));
  const cancelBtn = btn('CANCEL', PALETTE.danger);
  const finishBtn = btn('FINISH SESSION', PALETTE.accent, true);
  controlRow.appendChild(cancelBtn);
  controlRow.appendChild(finishBtn);
  box.appendChild(controlRow);

  // Skill grid
  const grid = el('div', `
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  `);
  box.appendChild(grid);

  const scores = {};       // skillId -> 0..5
  const cards = {};

  for (const s of SKILLS) {
    const isCore = core.includes(s.id);
    const card = el('div', `
      background: ${PALETTE.panel2};
      border: 2px solid ${isCore ? s.color : PALETTE.border};
      border-radius: 10px; padding: 10px;
      display: flex; flex-direction: column; gap: 6px;
    `);
    card.appendChild(el('div', `
      font-size: 10px; letter-spacing: 1px;
      color: ${isCore ? s.color : PALETTE.dim};
    `, isCore ? 'CORE SKILL' : 'BONUS SKILL'));
    card.appendChild(el('div', `font-size: 14px; font-weight: 800; color: ${s.color};`, s.name));
    const scoreEl = el('div', `font-size: 11px; color: ${PALETTE.dim};`, 'Not done');
    card.appendChild(scoreEl);
    const startBtn = btn('START', s.color, true);
    startBtn.style.padding = '6px 10px';
    card.appendChild(startBtn);
    startBtn.addEventListener('click', () => {
      // Pause main timer while drill runs
      pauseTimer();
      runDrill(s.id, parent, (sc) => {
        resumeTimer();
        scores[s.id] = sc;
        scoreEl.textContent = `Score: ${sc}/5`;
        scoreEl.style.color = sc >= 4 ? PALETTE.accent
          : sc >= 2 ? PALETTE.warn : PALETTE.danger;
        startBtn.textContent = 'REDO';
      });
    });
    cards[s.id] = card;
    grid.appendChild(card);
  }

  // Timer logic
  const totalMs = 120_000;
  let elapsed = 0;
  let lastTick = performance.now();
  let raf = 0, paused = false;

  function pauseTimer() { paused = true; }
  function resumeTimer() { paused = false; lastTick = performance.now(); }

  function tick() {
    const now = performance.now();
    if (!paused) elapsed += now - lastTick;
    lastTick = now;
    const left = Math.max(0, totalMs - elapsed);
    const secs = Math.ceil(left / 1000);
    timerEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    if (left <= 0) {
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  function close() {
    cancelAnimationFrame(raf);
    overlay.remove();
  }

  cancelBtn.addEventListener('click', close);

  function finish() {
    close();
    if (onFinish) onFinish(scores);
  }
  finishBtn.addEventListener('click', finish);
}

function skillName(id) {
  const s = SKILLS.find((x) => x.id === id);
  return s ? s.name : id;
}

// ----- Individual drills. Each opens a sub-modal, returns a 0..5 score. -----

function runDrill(skillId, parent, onScore) {
  const overlay = el('div', `
    position: fixed; inset: 0; background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center; z-index: 11000;
  `);
  parent.appendChild(overlay);

  const skill = SKILLS.find((s) => s.id === skillId);
  const box = el('div', `
    background: ${PALETTE.panel}; border: 2px solid ${skill.color};
    border-radius: 12px; padding: 16px 18px;
    width: 540px; max-width: 96vw;
    display: flex; flex-direction: column; gap: 8px;
  `);
  overlay.appendChild(box);

  box.appendChild(el('div', `font-size: 11px; color: ${PALETTE.dim}; letter-spacing: 2px;`,
    'DRILL — ' + skill.name.toUpperCase()));

  const info = el('div', `font-size: 12px; color: ${PALETTE.dim};`);
  box.appendChild(info);

  const status = el('div', `font-size: 14px; font-weight: 800;`, '');
  box.appendChild(status);

  const canvas = document.createElement('canvas');
  canvas.width = 500; canvas.height = 240;
  canvas.style.cssText = `
    background: #1b3a1b; border: 2px solid ${PALETTE.border};
    border-radius: 8px; cursor: crosshair; display: block;
    width: 100%; max-width: 500px; margin: 0 auto;
  `;
  canvas.tabIndex = 0;
  box.appendChild(canvas);

  const skipBtn = btn('GIVE UP', PALETTE.danger);
  const skipRow = el('div', 'display: flex; justify-content: flex-end;');
  skipRow.appendChild(skipBtn);
  box.appendChild(skipRow);
  skipBtn.addEventListener('click', () => done(0));

  let raf = 0;
  let done_ = false;
  function done(score) {
    if (done_) return;
    done_ = true;
    cancelAnimationFrame(raf);
    overlay.remove();
    onScore(Math.max(0, Math.min(5, Math.round(score))));
  }

  // Dispatch to drill implementations
  const ctx = canvas.getContext('2d');
  switch (skillId) {
    case 'finishing':   return drillFinishing(ctx, canvas, info, status, (s) => done(s), (id) => raf = id);
    case 'saves':       return drillSaves(ctx, canvas, info, status, done, (id) => raf = id);
    case 'dribbling':   return drillDribbling(ctx, canvas, info, status, done, (id) => raf = id);
    case 'passing':     return drillPassing(ctx, canvas, info, status, done, (id) => raf = id);
    case 'pace':        return drillPace(ctx, canvas, info, status, done, (id) => raf = id);
    case 'physicality': return drillPhysicality(ctx, canvas, info, status, done, (id) => raf = id);
    case 'defending':   return drillDefending(ctx, canvas, info, status, done, (id) => raf = id);
  }
}

// ===== Drill: Finishing =====
function drillFinishing(ctx, canvas, info, status, done, setRaf) {
  info.textContent = '5 shots. Click in the goal — beat the keeper.';
  const goal = { left: 60, right: 440, top: 30, bottom: 200 };
  const keeperW = 90;
  let kx = (goal.left + goal.right) / 2;
  let kv = 3;
  let shots = 0, hits = 0;
  let flashUntil = 0, flashText = '', flashColor = '';
  const start = performance.now();
  const dur = 12000;

  function loop() {
    const now = performance.now();
    if (now - start > dur || shots >= 5) return done(hits);
    kx += kv;
    if (kx < goal.left + keeperW / 2 + 4 || kx > goal.right - keeperW / 2 - 4) kv *= -1;
    ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.strokeRect(goal.left, goal.top, goal.right - goal.left, goal.bottom - goal.top);
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(kx - keeperW / 2, goal.top + 8, keeperW, goal.bottom - goal.top - 16);
    if (now < flashUntil) {
      ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = flashColor; ctx.fillText(flashText, canvas.width / 2, 110);
    }
    status.textContent = `Shot ${shots}/5  •  Goals ${hits}  •  ${Math.ceil((dur - (now - start)) / 1000)}s`;
    setRaf(requestAnimationFrame(loop));
  }
  setRaf(requestAnimationFrame(loop));

  canvas.addEventListener('click', (e) => {
    if (shots >= 5) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top)  * (canvas.height / r.height);
    let label, color;
    if (x < goal.left || x > goal.right || y < goal.top || y > goal.bottom) { label = 'MISS'; color = '#ffab40'; }
    else if (x > kx - keeperW / 2 - 4 && x < kx + keeperW / 2 + 4)         { label = 'SAVED'; color = '#ff5252'; }
    else                                                                    { label = 'GOAL'; color = '#48ffaf'; hits++; }
    flashText = label; flashColor = color;
    flashUntil = performance.now() + 500;
    shots++;
  });
}

// ===== Drill: Saves =====
function drillSaves(ctx, canvas, info, status, done, setRaf) {
  info.textContent = 'Click each ball before it crosses the line.';
  const lineX = 70;
  const balls = [];
  let saved = 0, missed = 0;
  const start = performance.now();
  const dur = 12000;
  let nextSpawn = start + 200;

  function spawn() {
    balls.push({
      x: canvas.width + 10,
      y: 50 + Math.random() * 140,
      vx: -120 - Math.random() * 80,        // px/sec
      vy: (Math.random() - 0.5) * 30,
      r: 10,
      alive: true,
    });
  }

  let lastT = start;
  function loop() {
    const now = performance.now();
    const dt = (now - lastT) / 1000; lastT = now;
    if (now - start > dur || saved + missed >= 5) return done(saved);
    const aliveCount = balls.reduce((n, b) => n + (b.alive ? 1 : 0), 0);
    if (now > nextSpawn && saved + missed + aliveCount < 5) {
      spawn(); nextSpawn = now + 1500 + Math.random() * 800;
    }
    ctx.fillStyle = '#1b3a1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Goal line
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(lineX, 20); ctx.lineTo(lineX, canvas.height - 20); ctx.stroke();
    ctx.fillStyle = 'rgba(255,82,82,0.18)';
    ctx.fillRect(0, 0, lineX, canvas.height);
    for (const b of balls) {
      if (!b.alive) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < lineX) { b.alive = false; missed++; continue; }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    status.textContent = `Saves ${saved}/5  •  Missed ${missed}  •  ${Math.ceil((dur - (now - start)) / 1000)}s`;
    setRaf(requestAnimationFrame(loop));
  }
  setRaf(requestAnimationFrame(loop));

  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top)  * (canvas.height / r.height);
    for (const b of balls) {
      if (!b.alive) continue;
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy < (b.r + 6) * (b.r + 6)) {
        b.alive = false; saved++; break;
      }
    }
  });
}

// ===== Drill: Dribbling =====
function drillDribbling(ctx, canvas, info, status, done, setRaf) {
  info.textContent = 'Use WASD or arrow keys to weave. Touch the cones in order.';
  let px = 40, py = canvas.height / 2;
  const cones = [];
  for (let i = 0; i < 6; i++) {
    cones.push({ x: 100 + i * 65, y: i % 2 ? 60 : canvas.height - 60, hit: false });
  }
  let nextCone = 0;
  const keys = new Set();
  const start = performance.now();
  const dur = 15000;
  const onKD = (e) => { keys.add(e.key.toLowerCase()); if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); };
  const onKU = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKD);
  window.addEventListener('keyup', onKU);
  canvas.focus();

  let lastT = start;
  function loop() {
    const now = performance.now();
    const dt = (now - lastT) / 1000; lastT = now;
    if (now - start > dur || nextCone >= cones.length) {
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
      // Score: cones touched in order, mapped to 0-5
      return done(Math.min(5, Math.floor(nextCone * 5 / cones.length)));
    }
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      px += (dx / len) * 180 * dt;
      py += (dy / len) * 180 * dt;
      px = Math.max(10, Math.min(canvas.width - 10, px));
      py = Math.max(10, Math.min(canvas.height - 10, py));
    }
    // Touch detection
    if (nextCone < cones.length) {
      const c = cones[nextCone];
      if (Math.hypot(px - c.x, py - c.y) < 20) { c.hit = true; nextCone++; }
    }
    ctx.fillStyle = '#1b3a1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    cones.forEach((c, i) => {
      ctx.fillStyle = c.hit ? '#48ffaf' : (i === nextCone ? '#ffab40' : '#ff7043');
      ctx.beginPath(); ctx.moveTo(c.x, c.y - 12); ctx.lineTo(c.x - 10, c.y + 8); ctx.lineTo(c.x + 10, c.y + 8); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = '#48a0ff';
    ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
    status.textContent = `Cones ${nextCone}/${cones.length}  •  ${Math.ceil((dur - (now - start)) / 1000)}s`;
    setRaf(requestAnimationFrame(loop));
  }
  setRaf(requestAnimationFrame(loop));
}

// ===== Drill: Passing =====
function drillPassing(ctx, canvas, info, status, done, setRaf) {
  info.textContent = 'Click each yellow target before it disappears.';
  let target = null;
  let hits = 0, total = 0;
  const start = performance.now();
  const dur = 12000;
  const TARGET_LIFE = 1100;
  const MAX = 7;

  function spawnTarget() {
    target = {
      x: 60 + Math.random() * (canvas.width - 120),
      y: 40 + Math.random() * (canvas.height - 80),
      r: 22, born: performance.now(),
    };
    total++;
  }
  spawnTarget();

  function loop() {
    const now = performance.now();
    if (now - start > dur || total > MAX) return done(Math.min(5, Math.round(hits * 5 / MAX)));
    if (target && now - target.born > TARGET_LIFE) {
      target = null;
      if (total < MAX) setTimeout(spawnTarget, 250);
    }
    ctx.fillStyle = '#1b3a1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (target) {
      const k = (now - target.born) / TARGET_LIFE;
      ctx.fillStyle = '#fff176';
      ctx.beginPath(); ctx.arc(target.x, target.y, target.r * (1 - k * 0.4), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
    }
    status.textContent = `Hits ${hits}/${MAX}  •  ${Math.ceil((dur - (now - start)) / 1000)}s`;
    setRaf(requestAnimationFrame(loop));
  }
  setRaf(requestAnimationFrame(loop));

  canvas.addEventListener('click', (e) => {
    if (!target) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top)  * (canvas.height / r.height);
    if (Math.hypot(x - target.x, y - target.y) < target.r + 4) {
      hits++; target = null;
      if (total < MAX) setTimeout(spawnTarget, 250);
    }
  });
}

// ===== Drill: Pace =====
function drillPace(ctx, canvas, info, status, done, setRaf) {
  info.textContent = 'Mash SPACEBAR (or click the canvas) to sprint!';
  const start = performance.now();
  const dur = 8000;
  const goalPresses = 30;
  let presses = 0;

  const onKey = (e) => { if (e.code === 'Space' || e.key === ' ') { presses++; e.preventDefault(); } };
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('click', () => { presses++; });
  canvas.focus();

  function loop() {
    const now = performance.now();
    if (now - start > dur || presses >= goalPresses) {
      window.removeEventListener('keydown', onKey);
      return done(Math.min(5, Math.round(presses * 5 / goalPresses)));
    }
    const t = Math.min(1, presses / goalPresses);
    ctx.fillStyle = '#1b3a1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(40, 100, canvas.width - 80, 40);
    // Runner
    ctx.fillStyle = '#48ffaf';
    const runX = 40 + (canvas.width - 80) * t;
    ctx.beginPath(); ctx.arc(runX, 120, 14, 0, Math.PI * 2); ctx.fill();
    // Bar fill
    ctx.fillStyle = '#48ffaf';
    ctx.fillRect(40, 100, (canvas.width - 80) * t, 6);
    status.textContent = `Presses ${presses}/${goalPresses}  •  ${Math.ceil((dur - (now - start)) / 1000)}s`;
    setRaf(requestAnimationFrame(loop));
  }
  setRaf(requestAnimationFrame(loop));
}

// ===== Drill: Physicality =====
function drillPhysicality(ctx, canvas, info, status, done, setRaf) {
  info.textContent = 'Stay balanced! Press LEFT / RIGHT (or A / D) to counter the push.';
  let tilt = 0;            // -1 (full left) .. +1 (full right)
  let push = 0.05;
  let timeInZone = 0;
  const dur = 10000;
  const start = performance.now();

  const keys = new Set();
  const onKD = (e) => { keys.add(e.key.toLowerCase()); if (['arrowleft','arrowright','a','d'].includes(e.key.toLowerCase())) e.preventDefault(); };
  const onKU = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKD);
  window.addEventListener('keyup', onKU);
  canvas.focus();

  let lastT = start;
  function loop() {
    const now = performance.now();
    const dt = (now - lastT) / 1000; lastT = now;
    if (now - start > dur) {
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
      return done(Math.min(5, Math.round(timeInZone * 5 / 7)));     // need 7s in zone for max
    }
    // Random push
    push += (Math.random() - 0.5) * 0.6 * dt;
    push = Math.max(-1.2, Math.min(1.2, push));
    tilt += push * dt;
    if (keys.has('arrowleft') || keys.has('a')) tilt -= 1.5 * dt;
    if (keys.has('arrowright') || keys.has('d')) tilt += 1.5 * dt;
    if (Math.abs(tilt) > 1) tilt = Math.sign(tilt);   // clamp; you "fall over"
    if (Math.abs(tilt) < 0.35) timeInZone += dt;
    ctx.fillStyle = '#1b3a1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Balance bar
    const cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 180, cy); ctx.lineTo(cx + 180, cy); ctx.stroke();
    // Safe zone
    ctx.fillStyle = 'rgba(72,255,175,0.20)';
    ctx.fillRect(cx - 60, cy - 30, 120, 60);
    // Indicator
    const ix = cx + tilt * 180;
    ctx.fillStyle = Math.abs(tilt) < 0.35 ? '#48ffaf' : Math.abs(tilt) > 0.85 ? '#ff5252' : '#ffab40';
    ctx.beginPath(); ctx.arc(ix, cy, 16, 0, Math.PI * 2); ctx.fill();
    status.textContent = `Balanced ${timeInZone.toFixed(1)}s  •  ${Math.ceil((dur - (now - start)) / 1000)}s left`;
    setRaf(requestAnimationFrame(loop));
  }
  setRaf(requestAnimationFrame(loop));
}

// ===== Drill: Defending =====
function drillDefending(ctx, canvas, info, status, done, setRaf) {
  info.textContent = 'Click each red attacker before they reach you.';
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const attackers = [];
  let stops = 0, breached = 0;
  const start = performance.now();
  const dur = 12000;
  let nextSpawn = start + 200;
  const MAX = 6;

  function spawn() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(canvas.width, canvas.height) * 0.6;
    attackers.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      speed: 70 + Math.random() * 30,
      r: 12, alive: true,
    });
  }

  let lastT = start;
  function loop() {
    const now = performance.now();
    const dt = (now - lastT) / 1000; lastT = now;
    if (now - start > dur || stops + breached >= MAX) {
      return done(Math.min(5, Math.round(stops * 5 / MAX)));
    }
    if (now > nextSpawn && stops + breached + attackers.filter((a) => a.alive).length < MAX) {
      spawn(); nextSpawn = now + 1300 + Math.random() * 700;
    }
    ctx.fillStyle = '#1b3a1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // You (defender) at centre
    ctx.fillStyle = '#48a0ff';
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    // Danger zone
    ctx.strokeStyle = 'rgba(255,82,82,0.4)';
    ctx.beginPath(); ctx.arc(cx, cy, 35, 0, Math.PI * 2); ctx.stroke();
    for (const a of attackers) {
      if (!a.alive) continue;
      // Move toward centre
      const dx = cx - a.x, dy = cy - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 35) { a.alive = false; breached++; continue; }
      a.x += (dx / d) * a.speed * dt;
      a.y += (dy / d) * a.speed * dt;
      ctx.fillStyle = '#ff5252';
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    status.textContent = `Stops ${stops}/${MAX}  •  Breached ${breached}  •  ${Math.ceil((dur - (now - start)) / 1000)}s`;
    setRaf(requestAnimationFrame(loop));
  }
  setRaf(requestAnimationFrame(loop));

  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top)  * (canvas.height / r.height);
    for (const a of attackers) {
      if (!a.alive) continue;
      if (Math.hypot(x - a.x, y - a.y) < a.r + 6) {
        a.alive = false; stops++; break;
      }
    }
  });
}
