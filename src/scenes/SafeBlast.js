import Phaser from 'phaser';
import { generateMap } from '../iso/MapData.js';

// Thin Phaser glue - the real gameplay runs in Three.js.
// safeblast3d/* is dynamically imported so Three.js only ships when a
// level is opened, not on first page load.
// Parity with the old 2D flow:
//   - init(data.level) still works the same way BrainrotHub launches it.
//   - On win, award coins to brainrotData, mark bestLevels, save to server.
//   - Back / finish returns to BrainrotHub.
export class SafeBlastScene extends Phaser.Scene {
  constructor() {
    super('SafeBlast');
  }

  init(data) {
    this.level = (data && data.level) || 1;
  }

  create() {
    this._resultSaved = false;
    this.brData = this.registry.get('brainrotData') || { coins: 0, owned: [], bestLevels: {} };
    this.username = this.registry.get('username');

    const phaserCanvas = this.game.canvas;
    this._prevDisplay = phaserCanvas.style.display;
    phaserCanvas.style.display = 'none';

    this._threeCanvas = document.createElement('canvas');
    this._threeCanvas.id = 'safeblast3d-canvas';
    this._threeCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#8ec7ff;';
    document.body.appendChild(this._threeCanvas);

    this._loadingEl = document.createElement('div');
    this._loadingEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;z-index:200;pointer-events:none;';
    this._loadingEl.textContent = `Loading level ${this.level}...`;
    document.body.appendChild(this._loadingEl);

    this._cancelled = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    this.loadAndStart();
  }

  async loadAndStart() {
    try {
      const [{ createSafeBlastScene }, { createSafeBlastUI }] = await Promise.all([
        import('../safeblast3d/scene.js'),
        import('../safeblast3d/ui.js'),
      ]);
      if (this._cancelled) return;
      if (this._loadingEl) { this._loadingEl.remove(); this._loadingEl = null; }

      const mapName = (generateMap(this.level) || {}).name || `Level ${this.level}`;

      this.ui = createSafeBlastUI({
        levelName: mapName,
        level: this.level,
        onBack: () => this.exitTo('BrainrotHub'),
        onAttack: () => this.three && this.three.attack(),
        onBuySword: (id) => this.three && this.three.buySword(id),
        onCastAbility: (id) => this.three && this.three.castAbility(id),
        onReleaseHoney: () => this.three && this.three.releaseHoneyTraps && this.three.releaseHoneyTraps(),
        onLevelEnd: (mode, payload) => {
          if (mode === 'retry') this.exitTo('SafeBlast', { level: this.level });
          else this.exitTo('BrainrotHub');
        },
      });

      const equipped = (this.brData.abilities && Array.isArray(this.brData.abilities.equipped))
        ? this.brData.abilities.equipped
        : [];
      this.three = createSafeBlastScene({
        canvas: this._threeCanvas,
        level: this.level,
        username: this.username,
        avatar: this.registry.get('avatar') || { outfit: 0, hat: 0 },
        equippedAbilities: equipped,
        soldierLevel: (this.brData.abilityLevels && this.brData.abilityLevels.soldier) || this.brData.soldierLevel || 1,
        abilityLevels: this.brData.abilityLevels || {},
        healthLevel: this.brData.healthLevel || 0,
        ui: this.ui,
        onWin: ({ level, coins }) => this.handleWin(level, coins),
        onLose: ({ level, coins }) => this.handleLose(level, coins),
      });
    } catch (err) {
      if (this._loadingEl) this._loadingEl.textContent = 'Failed to load level: ' + (err && err.message || err);
    }
  }

  handleWin(level, coins) {
    this._resultSaved = true;
    this.brData.coins += coins;
    this.brData.bestLevels = this.brData.bestLevels || {};
    // Cascade-complete: beating level N marks every level 1..N as beaten
    // (so jumping straight to a higher level fills in the lower badges).
    for (let i = 1; i <= level; i++) {
      if (!this.brData.bestLevels[i]) this.brData.bestLevels[i] = true;
    }
    this.registry.set('brainrotData', this.brData);
    this.saveBrainrot();
  }

  handleLose(level, coins) {
    this._resultSaved = true;
    // Keep any generator coins picked up before dying
    if (coins > 0) {
      this.brData.coins += coins;
      this.registry.set('brainrotData', this.brData);
      this.saveBrainrot();
    }
  }

  saveBrainrot() {
    // Persist to localStorage synchronously before firing the server save
    // so a refresh mid-flight can't drop the update. Record lastServerCoins
    // to detect operator-side coin bumps on next load.
    const snapshot = JSON.parse(JSON.stringify(this.brData));
    try {
      localStorage.setItem('cc_brdata_' + (this.username || '_').toLowerCase(),
        JSON.stringify({ data: snapshot, ts: Date.now(), lastServerCoins: snapshot.coins }));
    } catch {}

    let token = null;
    try { token = localStorage.getItem('cc_session'); } catch {}
    const payload = { token, brainrotData: snapshot };
    return fetch('/api/save-brainrot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).then((r) => r.json()).then((d) => {
      if (this.ui && this.ui.showToast) {
        this.ui.showToast(d && d.ok ? 'Progress saved' : 'Save failed - try again', 1400);
      }
      return d;
    }).catch(() => {
      if (this.ui && this.ui.showToast) this.ui.showToast('Save failed - try again', 1400);
    });
  }

  exitTo(sceneKey, data) {
    this.teardown();
    this.scene.start(sceneKey, data);
  }

  teardown() {
    this._cancelled = true;
    // If the player is backing out mid-level (no win/lose), bank any coins
    // they picked up from generators. Without this those coins vanish.
    if (this.three && !this._resultSaved) {
      const ps = this.three.getState && this.three.getState();
      if (ps && ps.coins > 0) {
        this.brData.coins += ps.coins;
        this.registry.set('brainrotData', this.brData);
        this.saveBrainrot();
      }
    }
    if (this.three) { this.three.dispose(); this.three = null; }
    if (this.ui) { this.ui.destroy(); this.ui = null; }
    if (this._threeCanvas && this._threeCanvas.parentNode) {
      this._threeCanvas.remove();
      this._threeCanvas = null;
    }
    if (this._loadingEl && this._loadingEl.parentNode) {
      this._loadingEl.remove();
      this._loadingEl = null;
    }
    if (this.game && this.game.canvas) {
      this.game.canvas.style.display = this._prevDisplay || '';
    }
  }
}
