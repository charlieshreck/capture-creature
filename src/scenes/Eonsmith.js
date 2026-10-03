import Phaser from 'phaser';

// Eonsmith: 3D settlement builder. Unlike the other 3D games it runs on its
// own page (eonsmith.html) inside a full-screen iframe. That keeps its global
// CSS and window keyboard/mouse listeners sealed off from the rest of the
// game, and removing the iframe shuts the whole thing down cleanly.
export class EonsmithScene extends Phaser.Scene {
  constructor() {
    super('Eonsmith');
  }

  create() {
    const phaserCanvas = this.game.canvas;
    this._prevDisplay = phaserCanvas.style.display;
    phaserCanvas.style.display = 'none';

    this._frame = document.createElement('iframe');
    this._frame.src = './eonsmith.html';
    this._frame.title = 'Eonsmith';
    this._frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;display:block;background:#0b0e13;';
    // Give the game keyboard focus as soon as it loads
    this._frame.addEventListener('load', () => this._frame && this._frame.focus());
    document.body.appendChild(this._frame);

    // Back button sits top-right, where Eonsmith's own top bar is empty
    this._backBtn = document.createElement('button');
    this._backBtn.textContent = '◀ HUB';
    this._backBtn.style.cssText = 'position:fixed;top:10px;right:16px;z-index:300;padding:6px 14px;font:700 13px system-ui,sans-serif;color:#ffd479;background:rgba(20,26,36,0.85);border:1px solid rgba(255,212,121,0.5);border-radius:10px;cursor:pointer;';
    this._backBtn.addEventListener('click', () => this.scene.start('Homepage'));
    document.body.appendChild(this._backBtn);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  teardown() {
    if (this._frame) { this._frame.remove(); this._frame = null; }
    if (this._backBtn) { this._backBtn.remove(); this._backBtn = null; }
    if (this.game && this.game.canvas) {
      this.game.canvas.style.display = this._prevDisplay || '';
    }
  }
}
