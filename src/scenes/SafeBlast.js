import Phaser from 'phaser';
import { createSafeBlastScene } from '../safeblast3d/scene.js';
import { createSafeBlastUI } from '../safeblast3d/ui.js';
import { generateMap } from '../iso/MapData.js';

// Thin Phaser glue - the real gameplay runs in Three.js.
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
    this._threeCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
    document.body.appendChild(this._threeCanvas);

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
      onLose: ({ level }) => {},
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  handleWin(level, coins) {
    this.brData.coins += coins;
    this.brData.bestLevels = this.brData.bestLevels || {};
    if (!this.brData.bestLevels[level]) this.brData.bestLevels[level] = true;
    this.registry.set('brainrotData', this.brData);

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
    if (this.three) { this.three.dispose(); this.three = null; }
    if (this.ui) { this.ui.destroy(); this.ui = null; }
    if (this._threeCanvas && this._threeCanvas.parentNode) {
      this._threeCanvas.remove();
      this._threeCanvas = null;
    }
    if (this.game && this.game.canvas) {
      this.game.canvas.style.display = this._prevDisplay || '';
    }
  }
}
