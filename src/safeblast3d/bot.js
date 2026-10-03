import * as THREE from 'three';
import { TILE, BLOCK } from '../iso/IsoUtils.js';
import { tileToWorld } from './world.js';
import { makeCharacter } from './character.js';

// Simplified 3D bot. AI is a lightweight version of the 2D Bot state
// machine: pick a goal, walk toward it, attack if in range. No BFS - just
// steering with axis-separated collision. Good enough for this first 3D
// pass; upgrade later if you miss the smart pathing.
const STATES = { ATTACK: 'attack', MINE_SAFE: 'mine_safe', RETREAT: 'retreat', PATROL: 'patrol' };

export class Bot3D {
  constructor({ team, difficulty, startX, startY, world, abilities }) {
    this.team = team;
    this.difficulty = difficulty;
    this.cartX = startX + 0.5;
    this.cartY = startY + 0.5;
    this.hp = 100; this.maxHp = 100; this.alive = true;
    // Speed caps so levels 21+ don't feel like sprinting bullets
    this.speed = Math.min(3.4, 2.0 + difficulty * 0.1);
    this.damage = 6 + Math.floor(difficulty * 0.6);
    this.minePower = 6 + Math.floor(difficulty * 0.8);
    this.attackCooldown = 0;
    this.decisionTimer = 0;
    this.state = STATES.PATROL;
    this.target = null;
    this.wanderTarget = null;
    this.world = world;
    // Abilities the bot can cast, and their individual cooldowns (seconds)
    this.abilities = Array.isArray(abilities) ? abilities.slice() : [];
    this.abilityCooldown = {};
    for (const id of this.abilities) this.abilityCooldown[id] = 1.5 + Math.random() * 2; // stagger initial casts

    const colors = team === 'blue'
      ? { shirt: 0x42a5f5, pants: 0x222244, skin: 0xf0c080 }
      : { shirt: 0xff4444, pants: 0x4a1010, skin: 0xf0c080 };
    this.character = makeCharacter(colors);
    this.group = this.character.group;
    this.body = this.character.body;
    this.walkPhase = 0;

    // Floating HP bar (billboarded toward the camera in syncMesh)
    const bgGeo = new THREE.PlaneGeometry(0.9, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBg.position.y = 2.8;
    this.group.add(this.hpBg);

    const fgMat = new THREE.MeshBasicMaterial({ color: team === 'blue' ? 0x42a5f5 : 0xff4444 });
    this.hpFg = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.08), fgMat);
    this.hpFg.position.y = 2.8; this.hpFg.position.z = 0.002;
    this.group.add(this.hpFg);

    // HP text sprite (always faces the camera; shows e.g. "85 / 100")
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 256; this.hpCanvas.height = 64;
    this.hpTex = new THREE.CanvasTexture(this.hpCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: this.hpTex, transparent: true });
    this.hpText = new THREE.Sprite(spriteMat);
    this.hpText.scale.set(1.6, 0.4, 1);
    this.hpText.position.y = 3.15;
    this.group.add(this.hpText);
    this.hpTextLast = -1;
    this._drawHpText();
  }

  _drawHpText() {
    if (!this.hpCanvas) return;
    const ctx = this.hpCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = this.team === 'red' ? '#ff8888' : '#88c0ff';
    const text = `${Math.max(0, Math.ceil(this.hp))} / ${this.maxHp}`;
    ctx.strokeText(text, 128, 32);
    ctx.fillText(text, 128, 32);
    if (this.hpTex) this.hpTex.needsUpdate = true;
    this.hpTextLast = this.hp;
  }

  takeDamage(amount, attacker) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      // Begin fall-over animation; group hides at end of timer
      this.dying = true;
      this.deathTimer = 0;
      // Hide the floating health UI immediately
      if (this.hpBg) this.hpBg.visible = false;
      if (this.hpFg) this.hpFg.visible = false;
      if (this.hpText) this.hpText.visible = false;
      return;
    }
    // Knockback
    if (attacker) {
      const dx = this.cartX - attacker.cartX;
      const dy = this.cartY - attacker.cartY;
      const len = Math.hypot(dx, dy) || 1;
      this.cartX += (dx / len) * 0.4;
      this.cartY += (dy / len) * 0.4;
    }
    // Respond
    if (attacker && this.state !== STATES.RETREAT) {
      this.state = STATES.ATTACK;
      this.target = attacker;
    }
  }

  update(dt, { mapData, worldShim, bots, player, damageSafe, damageBlock, castEnemyAbility }) {
    if (this.dying) {
      this.deathTimer += dt;
      // Fall forward over 0.6s, then lie still until 2s
      const t = Math.min(1, this.deathTimer / 0.6);
      // Smoothstep so it accelerates a bit then settles
      const ease = t * t * (3 - 2 * t);
      this.group.rotation.x = -ease * (Math.PI / 2);
      this.group.position.y = -ease * 0.25;
      if (this.deathTimer >= 2.0) this.group.visible = false;
      return;
    }
    if (!this.alive) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    for (const id of this.abilities) {
      this.abilityCooldown[id] = Math.max(0, (this.abilityCooldown[id] || 0) - dt);
    }
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = 0.8 + Math.random() * 1.2;
      this.decide(mapData, bots, player);
    }
    // Ability casting: when attacking a target and an ability is off cooldown,
    // cast at the target. Range differs per ability.
    if (this.state === STATES.ATTACK && this.target && this.target.alive !== false && castEnemyAbility) {
      const d = Math.hypot(this.target.cartX - this.cartX, this.target.cartY - this.cartY);
      const ready = this.abilities.filter((id) => (this.abilityCooldown[id] || 0) <= 0);
      if (ready.length && d > 1.8 && d < 7) {
        const id = ready[Math.floor(Math.random() * ready.length)];
        const cd = castEnemyAbility(this, id, this.target);
        this.abilityCooldown[id] = cd || 4.0;
      }
    }
    this.act(dt, mapData, bots, player, damageSafe, damageBlock);
    this.walkAnim(dt);
  }

  decide(mapData, bots, player) {
    // No retreating - bots fight until they drop.
    // Same rule as the player: can only target the enemy safe once the
    // other side has been wiped out. While the player/enemies are alive,
    // the bot always hunts them.
    const enemies = this.team === 'blue'
      ? bots.filter((b) => b.team === 'red' && b.alive)
      : [player, ...bots.filter((b) => b.team === 'blue' && b.alive && b !== this)]
          .filter((e) => e && e.alive !== false);

    if (enemies.length > 0) {
      let nearest = null, nd = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.cartX - this.cartX, e.cartY - this.cartY);
        if (d < nd) { nd = d; nearest = e; }
      }
      this.state = STATES.ATTACK;
      this.target = nearest;
      return;
    }

    // All enemies down - now allowed to break the safe
    this.state = STATES.MINE_SAFE;
  }

  act(dt, mapData, bots, player, damageSafe, damageBlock) {
    let gx, gy;
    if (this.state === STATES.RETREAT) {
      const spawn = this.team === 'blue' ? mapData.blueSpawn : mapData.redSpawn;
      gx = spawn.x + 0.5; gy = spawn.y + 0.5;
      // No healing - bots stay at whatever HP they retreat with
    } else if (this.state === STATES.ATTACK && this.target && this.target.alive !== false) {
      gx = this.target.cartX; gy = this.target.cartY;
      const d = Math.hypot(gx - this.cartX, gy - this.cartY);
      if (d < 1.4 && this.attackCooldown <= 0) {
        this.attackCooldown = 0.7;
        if (this.target === player) {
          // Damage the player via shim
          this.world.getEntities('blue')[0].takeDamage(this.damage);
        } else if (this.target.takeDamage) {
          this.target.takeDamage(this.damage, this);
        }
        return;
      }
    } else {
      // MINE_SAFE / PATROL: head to enemy safe, mine it when close
      const safe = this.team === 'blue' ? mapData.redSafe : mapData.blueSafe;
      gx = safe.x + 0.5; gy = safe.y + 0.5;
      const d = Math.hypot(gx - this.cartX, gy - this.cartY);
      if (d < 1.8 && this.attackCooldown <= 0) {
        this.attackCooldown = 0.6;
        damageSafe({ x: safe.x, y: safe.y }, this.minePower);
        return;
      }
    }

    // If rooted (e.g., standing in magma), skip movement until it expires.
    if (this.rooted && performance.now() < (this.rootedUntil || 0)) {
      // Still face the goal so they look attentive
      const tdx = gx - this.cartX, tdy = gy - this.cartY;
      const target = Math.atan2(tdx, tdy);
      this.group.rotation.y += (target - this.group.rotation.y) * 0.1;
      return;
    }
    this.rooted = false;

    // Steer toward goal with axis-separated walkability
    const dx = gx - this.cartX;
    const dy = gy - this.cartY;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) return;
    const step = this.speed * dt;
    const nx = this.cartX + (dx / d) * step;
    const ny = this.cartY + (dy / d) * step;
    if (this.world.canMoveTo(nx, this.cartY)) this.cartX = nx;
    if (this.world.canMoveTo(this.cartX, ny)) this.cartY = ny;

    // Face direction of motion
    const target = Math.atan2(dx, dy);
    let diff = target - this.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * 0.2;
    this.walkPhase += dt * 10;
  }

  walkAnim(dt) {
    const swing = Math.sin(this.walkPhase) * 0.5;
    this.character.armL.rotation.x = swing;
    this.character.armR.rotation.x = -swing;
    this.character.legL.rotation.x = -swing;
    this.character.legR.rotation.x = swing;
  }

  syncMesh(mapData, camera) {
    const wp = tileToWorld(mapData, this.cartX, this.cartY);
    this.group.position.x = wp.x;
    this.group.position.z = wp.z;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpFg.scale.x = ratio;

    // Billboard the bars toward the camera so they're readable from any angle.
    if (camera) {
      const tmp = new THREE.Vector3();
      this.hpBg.getWorldPosition(tmp);
      const cx = camera.position.x - tmp.x;
      const cz = camera.position.z - tmp.z;
      const yaw = Math.atan2(cx, cz);
      // Convert world yaw to local yaw by undoing the group rotation.
      const localYaw = yaw - this.group.rotation.y;
      this.hpBg.rotation.set(0, localYaw, 0);
      this.hpFg.rotation.set(0, localYaw, 0);
    }

    // Refresh HP text only when HP actually changes
    if (this.hp !== this.hpTextLast) this._drawHpText();
  }
}
