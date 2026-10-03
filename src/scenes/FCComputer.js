import Phaser from 'phaser';

// FC Computer — DOM-based overlay. Hides the Phaser canvas while active,
// restores body styles on exit.
export class FCComputerScene extends Phaser.Scene {
  constructor() { super('FCComputer'); }

  create() {
    this.username = this.registry.get('username') || 'Player';
    const phaserCanvas = this.game.canvas;
    this._prevDisplay = phaserCanvas.style.display;
    phaserCanvas.style.display = 'none';

    this._prevBody = {
      display: document.body.style.display,
      justify: document.body.style.justifyContent,
      align: document.body.style.alignItems,
      overflow: document.body.style.overflow,
    };
    document.body.style.display = 'block';
    document.body.style.justifyContent = '';
    document.body.style.alignItems = '';
    document.body.style.overflow = 'hidden';

    this._loadingEl = document.createElement('div');
    this._loadingEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;z-index:200;pointer-events:none;background:#0b1224;';
    this._loadingEl.textContent = 'Loading FC Computer...';
    document.body.appendChild(this._loadingEl);

    this._cancelled = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    this.mount();
  }

  async mount() {
    try {
      const { createFCComputerUI } = await import('../fc/ui.js');
      if (this._cancelled) return;
      if (this._loadingEl) { this._loadingEl.remove(); this._loadingEl = null; }
      this.ui = createFCComputerUI({
        username: this.username,
        onBack: () => this.scene.start('Homepage'),
      });
    } catch (err) {
      if (this._loadingEl) this._loadingEl.textContent = 'Failed to load: ' + (err && err.message || err);
      console.error(err);
    }
  }

  teardown() {
    this._cancelled = true;
    if (this.ui) { this.ui.destroy(); this.ui = null; }
    if (this._loadingEl && this._loadingEl.parentNode) { this._loadingEl.remove(); this._loadingEl = null; }
    if (this.game && this.game.canvas) {
      this.game.canvas.style.display = this._prevDisplay || '';
    }
    if (this._prevBody) {
      document.body.style.display = this._prevBody.display || '';
      document.body.style.justifyContent = this._prevBody.justify || '';
      document.body.style.alignItems = this._prevBody.align || '';
      document.body.style.overflow = this._prevBody.overflow || '';
      this._prevBody = null;
    }
  }
}
