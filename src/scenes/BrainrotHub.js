import Phaser from 'phaser';
import { createBrainrot3DScene } from '../brainrot3d/scene.js';
import { createBrainrotUI } from '../brainrot3d/ui.js';

// The Brainrot hub is rendered in Three.js, but it lives inside a Phaser
// scene so the rest of the game can jump in and out of it normally.
// Entering: hide the Phaser canvas, spin up Three.js + DOM UI.
// Leaving:  dispose Three.js + DOM, restore the Phaser canvas, switch scene.
export class BrainrotHubScene extends Phaser.Scene {
  constructor() {
    super('BrainrotHub');
  }

  create() {
    this.brData = this.registry.get('brainrotData') || { coins: 0, owned: [], bestLevels: {} };
    this.username = this.registry.get('username');

    // Hide Phaser's canvas - Three.js will own the screen
    const phaserCanvas = this.game.canvas;
    this._prevDisplay = phaserCanvas.style.display;
    phaserCanvas.style.display = 'none';

    // Create the Three.js canvas
    this._threeCanvas = document.createElement('canvas');
    this._threeCanvas.id = 'brainrot3d-canvas';
    this._threeCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
    document.body.appendChild(this._threeCanvas);

    // DOM overlay UI
    this.ui = createBrainrotUI({
      brData: this.brData,
      username: this.username,
      onBack: () => this.exitTo('Homepage'),
      onPlayLevel: (lvl) => this.exitTo('SafeBlast', { level: lvl }),
      onBuy: (br) => this.buyBrainrot(br),
    });

    // Three.js scene
    this.three = createBrainrot3DScene({
      canvas: this._threeCanvas,
      onNearPedestal: (br) => this.ui.setNearPedestal(br),
      onLeavePedestal: () => this.ui.clearNearPedestal(),
    });

    // Phaser fires SHUTDOWN when the scene is replaced (including via
    // browser back). Clean up here so we don't leak the 3D canvas.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
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
