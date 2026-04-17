// AI Bot for Safe Blast — state machine with BFS pathfinding

import { TILE, BLOCK, BLOCK_HP, cartToIso, isoDepth } from './IsoUtils.js';

const STATES = {
  IDLE: 'idle',
  PATROL: 'patrol',
  DEFEND: 'defend',
  ATTACK: 'attack',
  MINE_SAFE: 'mine_safe',
  MINE_BLOCK: 'mine_block',
  COLLECT: 'collect',
  BUILD: 'build',
  RETREAT: 'retreat',
};

export class Bot {
  constructor(scene, team, difficulty, startX, startY) {
    this.scene = scene;
    this.team = team; // 'blue' or 'red'
    this.difficulty = difficulty; // 1-20
    this.cartX = startX;
    this.cartY = startY;
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;
    this.state = STATES.IDLE;
    this.path = [];
    this.pathIndex = 0;
    this.speed = 60 + difficulty * 2; // tiles per second * 100
    this.attackCooldown = 0;
    this.decisionTimer = 0;
    this.targetEntity = null;
    this.mineTarget = null;

    // Difficulty scaling
    this.reactionTime = Math.max(300, 1800 - difficulty * 75);
    this.aggression = 0.2 + difficulty * 0.04;
    this.damage = 6 + Math.floor(difficulty * 0.7);
    this.minePower = 8 + difficulty;

    // Create sprite
    this.sprite = null;
    this.nameTag = null;
    this.hpBar = null;
    this.hpBarBg = null;
  }

  createSprite(texture) {
    const iso = cartToIso(this.cartX, this.cartY);
    const ox = this.scene.mapOffsetX;
    const oy = this.scene.mapOffsetY;

    this.sprite = this.scene.add.image(iso.x + ox, iso.y + oy - 24, texture)
      .setScale(0.8);
    if (this.team === 'red') this.sprite.setTint(0xff8888);

    // Name tag
    const label = this.team === 'blue' ? 'Ally Bot' : 'Enemy';
    const color = this.team === 'blue' ? '#42a5f5' : '#ff4444';
    this.nameTag = this.scene.add.text(0, 0, label, {
      fontSize: '8px', color, fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 2, y: 1 },
    }).setOrigin(0.5);

    // HP bar
    this.hpBarBg = this.scene.add.rectangle(0, 0, 30, 4, 0x333333).setStrokeStyle(1, 0x111111);
    this.hpBar = this.scene.add.rectangle(0, 0, 30, 4, this.team === 'blue' ? 0x42a5f5 : 0xff4444);
  }

  update(delta) {
    if (!this.alive) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.decisionTimer -= delta;

    // Make a decision periodically
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.reactionTime;
      this.decide();
    }

    // Execute current state
    this.executeState(delta);

    // Update sprite position
    this.updateSprite();
  }

  decide() {
    const map = this.scene.mapData;
    const hpRatio = this.hp / this.maxHp;

    // Retreat if low HP
    if (hpRatio < 0.25) {
      this.state = STATES.RETREAT;
      const spawn = this.team === 'blue' ? map.blueSpawn : map.redSpawn;
      this.pathTo(spawn.x, spawn.y);
      return;
    }

    // Find nearest enemy
    const enemies = this.scene.getEntities(this.team === 'blue' ? 'red' : 'blue');
    let nearestEnemy = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.abs(e.cartX - this.cartX) + Math.abs(e.cartY - this.cartY);
      if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
    }

    // If enemy is close, attack
    if (nearestEnemy && nearestDist < 2) {
      this.state = STATES.ATTACK;
      this.targetEntity = nearestEnemy;
      return;
    }

    // Random decision based on aggression
    const roll = Math.random();
    if (roll < this.aggression && nearestEnemy) {
      // Try to mine enemy safe
      const safePos = this.team === 'blue' ? map.redSafe : map.blueSafe;
      this.state = STATES.MINE_SAFE;
      this.pathTo(safePos.x, safePos.y);
    } else if (roll < this.aggression + 0.2) {
      // Defend own safe
      const safePos = this.team === 'blue' ? map.blueSafe : map.redSafe;
      this.state = STATES.DEFEND;
      this.pathTo(safePos.x + (this.team === 'blue' ? 1 : -1), safePos.y);
    } else {
      // Collect resources
      this.state = STATES.COLLECT;
      const nearestGen = this.findNearestGenerator();
      if (nearestGen) {
        this.pathTo(nearestGen.x, nearestGen.y);
      } else {
        this.state = STATES.PATROL;
        this.pathToRandom();
      }
    }
  }

  executeState(delta) {
    switch (this.state) {
      case STATES.ATTACK:
        if (this.targetEntity && this.targetEntity.alive) {
          const d = Math.abs(this.targetEntity.cartX - this.cartX) +
                    Math.abs(this.targetEntity.cartY - this.cartY);
          if (d < 1.8 && this.attackCooldown <= 0) {
            this.doAttack(this.targetEntity);
          } else if (d >= 1.8) {
            this.moveToward(this.targetEntity.cartX, this.targetEntity.cartY, delta);
          }
        } else {
          this.state = STATES.IDLE;
        }
        break;

      case STATES.MINE_SAFE:
        this.followPath(delta);
        // Check if near enemy safe
        const enemySafe = this.team === 'blue' ?
          this.scene.mapData.redSafe : this.scene.mapData.blueSafe;
        const dSafe = Math.abs(this.cartX - enemySafe.x) + Math.abs(this.cartY - enemySafe.y);
        if (dSafe < 2 && this.attackCooldown <= 0) {
          this.doMine(enemySafe);
        }
        break;

      case STATES.DEFEND:
      case STATES.COLLECT:
      case STATES.PATROL:
      case STATES.RETREAT:
        this.followPath(delta);
        break;

      default:
        break;
    }
  }

  doAttack(target) {
    this.attackCooldown = 600;
    target.takeDamage(this.damage, this);
    // Visual: flash
    if (target.sprite) {
      target.sprite.setTint(0xff0000);
      this.scene.time.delayedCall(150, () => {
        if (target.sprite) target.sprite.clearTint();
        if (target.team === 'red' && target.sprite) target.sprite.setTint(0xff8888);
      });
    }
  }

  doMine(safePos) {
    this.attackCooldown = 400;
    this.scene.damageSafe(safePos, this.minePower);
  }

  takeDamage(amount, attacker) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
    // Knockback
    if (attacker) {
      const dx = this.cartX - attacker.cartX;
      const dy = this.cartY - attacker.cartY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.cartX += (dx / len) * 0.5;
      this.cartY += (dy / len) * 0.5;
    }
    // React — attack whoever hit us
    if (attacker && this.state !== STATES.RETREAT) {
      this.state = STATES.ATTACK;
      this.targetEntity = attacker;
    }
  }

  die() {
    this.alive = false;
    if (this.sprite) this.sprite.setAlpha(0.3);
    if (this.nameTag) this.nameTag.setAlpha(0.3);
    if (this.hpBar) this.hpBar.setAlpha(0);
    if (this.hpBarBg) this.hpBarBg.setAlpha(0);

    // Respawn after delay if team safe is intact
    this.scene.time.delayedCall(3000, () => {
      if (this.scene.isSafeAlive(this.team)) {
        this.respawn();
      }
    });
  }

  respawn() {
    const spawn = this.team === 'blue' ?
      this.scene.mapData.blueSpawn : this.scene.mapData.redSpawn;
    this.cartX = spawn.x;
    this.cartY = spawn.y;
    this.hp = this.maxHp;
    this.alive = true;
    this.state = STATES.IDLE;
    this.attackCooldown = 0;
    if (this.sprite) this.sprite.setAlpha(1);
    if (this.nameTag) this.nameTag.setAlpha(1);
    if (this.hpBar) this.hpBar.setAlpha(1);
    if (this.hpBarBg) this.hpBarBg.setAlpha(1);
  }

  // Simple movement toward a point
  moveToward(tx, ty, delta) {
    const dx = tx - this.cartX;
    const dy = ty - this.cartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) return;

    const step = (this.speed / 100) * (delta / 1000);
    const nx = this.cartX + (dx / dist) * step;
    const ny = this.cartY + (dy / dist) * step;

    if (this.scene.canMoveTo(nx, ny)) {
      this.cartX = nx;
      this.cartY = ny;
    }
  }

  followPath(delta) {
    if (!this.path.length || this.pathIndex >= this.path.length) return;

    const target = this.path[this.pathIndex];
    this.moveToward(target.x + 0.5, target.y + 0.5, delta);

    const dx = (target.x + 0.5) - this.cartX;
    const dy = (target.y + 0.5) - this.cartY;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
      this.pathIndex++;
    }
  }

  pathTo(tx, ty) {
    this.path = this.bfs(Math.floor(this.cartX), Math.floor(this.cartY), tx, ty);
    this.pathIndex = 0;
  }

  pathToRandom() {
    const map = this.scene.mapData;
    for (let i = 0; i < 20; i++) {
      const rx = Math.floor(Math.random() * map.width);
      const ry = Math.floor(Math.random() * map.height);
      if (map.ground[ry][rx] !== TILE.VOID && map.ground[ry][rx] !== TILE.WATER) {
        this.pathTo(rx, ry);
        return;
      }
    }
  }

  findNearestGenerator() {
    const gens = this.scene.mapData.generators;
    let best = null;
    let bestDist = Infinity;
    for (const g of gens) {
      const d = Math.abs(g.x - this.cartX) + Math.abs(g.y - this.cartY);
      if (d < bestDist) { bestDist = d; best = g; }
    }
    return best;
  }

  // BFS pathfinding
  bfs(sx, sy, gx, gy) {
    const map = this.scene.mapData;
    const w = map.width;
    const h = map.height;
    const visited = new Set();
    const queue = [{ x: sx, y: sy, path: [] }];
    visited.add(`${sx},${sy}`);

    const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];

    while (queue.length > 0) {
      const cur = queue.shift();

      if (cur.x === gx && cur.y === gy) return cur.path;

      // Stop if adjacent to goal (for mining/attacking)
      if (Math.abs(cur.x - gx) + Math.abs(cur.y - gy) === 1) {
        return cur.path;
      }

      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = `${nx},${ny}`;

        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (visited.has(key)) continue;
        if (map.ground[ny][nx] === TILE.VOID || map.ground[ny][nx] === TILE.WATER) continue;

        // Can walk through blocks only if they are the target
        const block = map.blocks[ny][nx];
        if (block !== BLOCK.NONE && !(nx === gx && ny === gy)) continue;

        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...cur.path, { x: nx, y: ny }] });
      }
    }

    return []; // No path found
  }

  updateSprite() {
    if (!this.sprite) return;
    const iso = cartToIso(this.cartX, this.cartY);
    const ox = this.scene.mapOffsetX;
    const oy = this.scene.mapOffsetY;

    this.sprite.setPosition(iso.x + ox, iso.y + oy - 24);
    this.sprite.setDepth(isoDepth(this.cartX, this.cartY, 0.5));

    if (this.nameTag) {
      this.nameTag.setPosition(iso.x + ox, iso.y + oy - 50);
      this.nameTag.setDepth(isoDepth(this.cartX, this.cartY, 0.6));
    }

    if (this.hpBarBg && this.hpBar) {
      const barY = iso.y + oy - 42;
      this.hpBarBg.setPosition(iso.x + ox, barY);
      this.hpBarBg.setDepth(isoDepth(this.cartX, this.cartY, 0.6));

      const ratio = this.hp / this.maxHp;
      this.hpBar.width = 30 * ratio;
      this.hpBar.setPosition(iso.x + ox - (30 - 30 * ratio) / 2, barY);
      this.hpBar.setDepth(isoDepth(this.cartX, this.cartY, 0.61));
      this.hpBar.fillColor = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffc107 : 0xf44336;
    }
  }

  destroy() {
    if (this.sprite) this.sprite.destroy();
    if (this.nameTag) this.nameTag.destroy();
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
  }
}
