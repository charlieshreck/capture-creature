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
        onBack: () => this.exitTo('BrainrotHub'),
        onAttack: () => this.three && this.three.attack(),
        onLevelEnd: (mode, payload) => {
          if (mode === 'retry') this.exitTo('SafeBlast', { level: this.level });
          else this.exitTo('BrainrotHub');
        },
      });

      this.three = createSafeBlastScene({
        canvas: this._threeCanvas,
        level: this.level,
        username: this.username,
        ui: this.ui,
        onWin: ({ level, coins }) => this.handleWin(level, coins),
        onLose: ({ level, coins }) => this.handleLose(level, coins),
      });
    } catch (err) {
      if (this._loadingEl) this._loadingEl.textContent = 'Failed to load level: ' + (err && err.message || err);
    }
  }

  handleWin(level, coins) {
    this.brData.coins += coins;
    this.brData.bestLevels = this.brData.bestLevels || {};
    if (!this.brData.bestLevels[level]) this.brData.bestLevels[level] = true;
    this.registry.set('brainrotData', this.brData);
    this.saveBrainrot();
  }

  handleLose(level, coins) {
    // Keep any generator coins picked up before dying
    if (coins > 0) {
      this.brData.coins += coins;
      this.registry.set('brainrotData', this.brData);
      this.saveBrainrot();
    }
  }

  saveBrainrot() {
    fetch('/api/save-brainrot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, brainrotData: this.brData }),
    }).catch(() => {});
  }

  exitTo(sceneKey, data) {
    this.teardown();
    this.scene.start(sceneKey, data);
  }

  teardown() {
    this._cancelled = true;
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
