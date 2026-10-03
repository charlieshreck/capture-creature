import Phaser from 'phaser';

// Wizards: 3D overworld with hidden spell cards + 25-level wizard duels.
// Mounts a Three.js canvas over the Phaser canvas (same pattern as
// BrainrotHub) and swaps between overworld and battle modes on the same
// canvas.
export class WizardsScene extends Phaser.Scene {
  constructor() {
    super('Wizards');
  }

  create() {
    this.username = this.registry.get('username') || 'Player';
    this.collected = this.loadCollected();
    this.levelProgress = this.loadLevelProgress();

    const phaserCanvas = this.game.canvas;
    this._prevDisplay = phaserCanvas.style.display;
    phaserCanvas.style.display = 'none';

    this._threeCanvas = document.createElement('canvas');
    this._threeCanvas.id = 'wizards3d-canvas';
    this._threeCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#88bbe6;';
    document.body.appendChild(this._threeCanvas);

    this._loadingEl = document.createElement('div');
    this._loadingEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui;font-size:14px;z-index:200;pointer-events:none;';
    this._loadingEl.textContent = 'Loading wizards world...';
    document.body.appendChild(this._loadingEl);

    this._cancelled = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    this.mountOverworld();
  }

  async mountOverworld() {
    try {
      const [{ createWizards3DScene }, { createWizardsUI }] = await Promise.all([
        import('../wizards3d/scene.js'),
        import('../wizards3d/ui.js'),
      ]);
      if (this._cancelled) return;
      if (this._loadingEl) { this._loadingEl.remove(); this._loadingEl = null; }

      this.ui = createWizardsUI({
        collected: this.collected,
        levelProgress: this.levelProgress,
        onBack: () => this.scene.start('Homepage'),
        onPickLevel: (lvl) => this.enterBattle(lvl),
      });

      this.three = createWizards3DScene({
        canvas: this._threeCanvas,
        avatar: this.registry.get('avatar') || { outfit: 0, hat: 0 },
        collected: this.collected.slice(),
        onCollect: (id) => this.handleCollect(id),
        onNearSpell: (s) => this.ui.setNearSpell(s),
        onLeaveSpell: () => this.ui.clearNearSpell(),
      });
    } catch (err) {
      if (this._loadingEl) this._loadingEl.textContent = 'Failed to load wizards: ' + (err && err.message || err);
    }
  }

  unmountOverworld() {
    if (this.three) { this.three.dispose(); this.three = null; }
    if (this.ui) { this.ui.destroy(); this.ui = null; }
  }

  async enterBattle(level) {
    if (this.collected.length === 0) return;       // safety
    this.unmountOverworld();
    this._currentLevel = level;
    try {
      const [{ createBattleScene }, { createBattleUI }, sceneMod] = await Promise.all([
        import('../wizards3d/battle.js'),
        import('../wizards3d/ui.js'),
        import('../wizards3d/scene.js'),
      ]);
      if (this._cancelled) return;
      const cfg = sceneMod.getLevelConfig(level);

      const battleUi = createBattleUI({
        level,
        themeName: cfg.theme.name,
        playerSpells: this.collected.slice(),
        onCast: (id) => this.battle && this.battle.playerCast(id),
        onRetreat: () => this.exitBattle({ won: false, retreated: true }),
        onContinue: () => this.exitBattle({ won: true }),
        onRetry: () => { this.exitBattle({ won: false, retreated: true }); this.enterBattle(level); },
      });
      this.battleUi = battleUi;

      this.battle = createBattleScene({
        canvas: this._threeCanvas,
        level,
        playerSpells: this.collected.slice(),
        playerAvatar: this.registry.get('avatar') || { outfit: 0, hat: 0 },
        onState: (s) => this.battleUi.update(s),
        onEnd: ({ won }) => {
          if (won) {
            if (level > this.levelProgress) {
              this.levelProgress = level;
              this.saveLevelProgress();
            }
          }
          this.battleUi.showEnd({ won });
        },
      });
    } catch (err) {
      console.error(err);
    }
  }

  exitBattle() {
    if (this.battle) { this.battle.dispose(); this.battle = null; }
    if (this.battleUi) { this.battleUi.destroy(); this.battleUi = null; }
    this.mountOverworld();
  }

  handleCollect(id) {
    if (this.collected.includes(id)) return;
    this.collected.push(id);
    this.saveCollected();
    if (this.ui) this.ui.onCollected(id);
  }

  storageKey() {
    return 'cc_wizards_' + (this.username || '_').toLowerCase();
  }

  loadCollected() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
      if (parsed && Array.isArray(parsed.collected)) return parsed.collected.filter((x) => typeof x === 'string');
    } catch {}
    return [];
  }

  saveCollected() {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.collected));
    } catch {}
  }

  loadLevelProgress() {
    try {
      const raw = localStorage.getItem(this.storageKey() + '_levels');
      if (!raw) return 0;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? Math.max(0, Math.min(25, n)) : 0;
    } catch {}
    return 0;
  }

  saveLevelProgress() {
    try {
      localStorage.setItem(this.storageKey() + '_levels', String(this.levelProgress));
    } catch {}
  }

  teardown() {
    this._cancelled = true;
    if (this.battle) { this.battle.dispose(); this.battle = null; }
    if (this.battleUi) { this.battleUi.destroy(); this.battleUi = null; }
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
