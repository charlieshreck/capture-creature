import Phaser from 'phaser';

// The Brainrot hub is rendered in Three.js, but it lives inside a Phaser
// scene so the rest of the game can jump in and out of it normally.
// Three.js and the hub code are dynamically imported so Phaser-only code
// paths never pay the cost of downloading the 3D engine.
export class BrainrotHubScene extends Phaser.Scene {
  constructor() {
    super('BrainrotHub');
  }

  create() {
    this.brData = this.registry.get('brainrotData') || { coins: 0, owned: [], bestLevels: {} };
    this.username = this.registry.get('username');

    const phaserCanvas = this.game.canvas;
    this._prevDisplay = phaserCanvas.style.display;
    phaserCanvas.style.display = 'none';

    this._threeCanvas = document.createElement('canvas');
    this._threeCanvas.id = 'brainrot3d-canvas';
    this._threeCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#6b3a78;';
    document.body.appendChild(this._threeCanvas);

    this._loadingEl = document.createElement('div');
    this._loadingEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;z-index:200;pointer-events:none;';
    this._loadingEl.textContent = 'Loading 3D hub...';
    document.body.appendChild(this._loadingEl);

    this._cancelled = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    this.loadAndStart();
  }

  async loadAndStart() {
    try {
      const [{ createBrainrot3DScene }, { createBrainrotUI }] = await Promise.all([
        import('../brainrot3d/scene.js'),
        import('../brainrot3d/ui.js'),
      ]);
      if (this._cancelled) return;
      if (this._loadingEl) { this._loadingEl.remove(); this._loadingEl = null; }

      this.ui = createBrainrotUI({
        brData: this.brData,
        username: this.username,
        onBack: () => this.exitTo('Homepage'),
        onPlayLevel: (lvl) => this.exitTo('SafeBlast', { level: lvl }),
        onBuy: (br) => this.buyBrainrot(br),
      });

      this.three = createBrainrot3DScene({
        canvas: this._threeCanvas,
        onNearPedestal: (br) => this.ui.setNearPedestal(br),
        onLeavePedestal: () => this.ui.clearNearPedestal(),
      });
    } catch (err) {
      if (this._loadingEl) this._loadingEl.textContent = 'Failed to load 3D hub: ' + (err && err.message || err);
    }
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

  buyBrainrot(br) {
    if (this.brData.coins < br.price) return;
    if (this.brData.owned.includes(br.id)) return;
    this.brData.coins -= br.price;
    this.brData.owned.push(br.id);
    this.registry.set('brainrotData', this.brData);

    this.ui.refresh();
    this.ui.setOwned(br.id);
    this.three.markOwned(br.id);

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
}
