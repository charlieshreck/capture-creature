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
  constructor({ team, difficulty, startX, startY, world }) {
    this.team = team;
    this.difficulty = difficulty;
    this.cartX = startX + 0.5;
    this.cartY = startY + 0.5;
    this.hp = 100; this.maxHp = 100; this.alive = true;
    this.speed = 2.0 + difficulty * 0.1;
    this.damage = 6 + Math.floor(difficulty * 0.6);
    this.minePower = 6 + Math.floor(difficulty * 0.8);
    this.attackCooldown = 0;
    this.decisionTimer = 0;
    this.state = STATES.PATROL;
    this.target = null;
    this.wanderTarget = null;
    this.world = world;

    const colors = team === 'blue'
      ? { shirt: 0x42a5f5, pants: 0x222244, skin: 0xf0c080 }
      : { shirt: 0xff4444, pants: 0x4a1010, skin: 0xf0c080 };
    this.character = makeCharacter(colors);
    this.group = this.character.group;
    this.body = this.character.body;
    this.walkPhase = 0;

    // Floating HP bar
    const bgGeo = new THREE.PlaneGeometry(0.9, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBg.position.y = 2.8;
    this.group.add(this.hpBg);

    const fgMat = new THREE.MeshBasicMaterial({ color: team === 'blue' ? 0x42a5f5 : 0xff4444 });
    this.hpFg = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.08), fgMat);
    this.hpFg.position.y = 2.8; this.hpFg.position.z = 0.001;
    this.group.add(this.hpFg);
  }

  takeDamage(amount, attacker) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.group.visible = false; return; }
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

  update(dt, { mapData, worldShim, bots, player, damageSafe, damageBlock }) {
    if (!this.alive) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = 0.8 + Math.random() * 1.2;
      this.decide(mapData, bots, player);
    }
    this.act(dt, mapData, bots, player, damageSafe, damageBlock);
    this.walkAnim(dt);
  }

  decide(mapData, bots, player) {
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio < 0.3) { this.state = STATES.RETREAT; return; }

    // Find nearest enemy
    const enemies = this.team === 'blue' ? bots.filter((b) => b.team === 'red' && b.alive) : [player, ...bots.filter((b) => b.team === 'blue' && b.alive && b !== this)];
    let nearest = null, nd = Infinity;
    for (const e of enemies) {
      if (!e || (e.alive === false)) continue;
      const d = Math.hypot(e.cartX - this.cartX, e.cartY - this.cartY);
      if (d < nd) { nd = d; nearest = e; }
    }
    if (nearest && nd < 6) { this.state = STATES.ATTACK; this.target = nearest; return; }

    // Otherwise press toward enemy safe
    this.state = STATES.MINE_SAFE;
  }

  act(dt, mapData, bots, player, damageSafe, damageBlock) {
    let gx, gy;
    if (this.state === STATES.RETREAT) {
      const spawn = this.team === 'blue' ? mapData.blueSpawn : mapData.redSpawn;
      gx = spawn.x + 0.5; gy = spawn.y + 0.5;
      if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 15 * dt);
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

  syncMesh(mapData) {
    const wp = tileToWorld(mapData, this.cartX, this.cartY);
    this.group.position.x = wp.x;
    this.group.position.z = wp.z;
    // HP bar scales with HP. We scale along X and keep it anchored at centre.
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpFg.scale.x = ratio;
    // Billboard HP bars toward camera by aligning to group's negative rotation
    this.hpBg.rotation.y = -this.group.rotation.y;
    this.hpFg.rotation.y = -this.group.rotation.y;
  }
}
