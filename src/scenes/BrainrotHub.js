import Phaser from 'phaser';

// Canonical order each ability lives in - used to keep the equipped list
// sorted so re-equipping snaps each ability back into its natural slot
// (with empty slots above shifted down).
const ABILITY_ORDER = ['flame', 'water', 'vine', 'magma', 'soldier', 'demon', 'dragon', 'honey'];
function sortByCanonical(list) {
  list.sort((a, b) => {
    const ia = ABILITY_ORDER.indexOf(a);
    const ib = ABILITY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

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

      // Ensure abilities state exists and is sane
      if (!this.brData.abilities || typeof this.brData.abilities !== 'object') {
        this.brData.abilities = { owned: [], equipped: [] };
      }
      if (!Array.isArray(this.brData.abilities.owned)) this.brData.abilities.owned = [];
      if (!Array.isArray(this.brData.abilities.equipped)) this.brData.abilities.equipped = [];
      // Per-ability upgrade levels (1..5). Migrate the legacy soldierLevel
      // field if present, then default any missing ability to L1.
      if (!this.brData.abilityLevels || typeof this.brData.abilityLevels !== 'object') {
        this.brData.abilityLevels = {};
      }
      if (typeof this.brData.soldierLevel === 'number' && !this.brData.abilityLevels.soldier) {
        this.brData.abilityLevels.soldier = this.brData.soldierLevel;
      }
      for (const id of ABILITY_ORDER) {
        if (typeof this.brData.abilityLevels[id] !== 'number') this.brData.abilityLevels[id] = 1;
      }
      // Player max-HP upgrades (0..100), each +10 HP
      if (typeof this.brData.healthLevel !== 'number') this.brData.healthLevel = 0;
      // Canonicalise existing equipped list so legacy saves snap into order
      sortByCanonical(this.brData.abilities.equipped);

      this.ui = createBrainrotUI({
        brData: this.brData,
        username: this.username,
        onBack: () => this.exitTo('Homepage'),
        onPlayLevel: (lvl) => this.exitTo('SafeBlast', { level: lvl }),
        onBuy: (br) => this.buyBrainrot(br),
        onBuyAbility: (id) => this.buyAbility(id),
        onEquipAbility: (id) => this.equipAbility(id),
        onUnequipAbility: (id) => this.unequipAbility(id),
        onUpgradeAbility: (id) => this.upgradeAbility(id),
        onUpgradeHealth: (count) => this.upgradeHealth(count),
      });

      this.three = createBrainrot3DScene({
        canvas: this._threeCanvas,
        avatar: this.registry.get('avatar') || { outfit: 0, hat: 0 },
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

    this.saveBrainrot();
  }

  buyAbility(id) {
    const ABILITY_PRICES = { flame: 120, water: 160, vine: 180, magma: 240, soldier: 300, demon: 380, dragon: 480, honey: 220 };
    const price = ABILITY_PRICES[id];
    if (price == null) return;
    const ad = this.brData.abilities;
    if (ad.owned.includes(id)) return;
    if (this.brData.coins < price) return;
    this.brData.coins -= price;
    ad.owned.push(id);
    // Auto-equip newly bought ability if there's room
    if (ad.equipped.length < 8) {
      ad.equipped.push(id);
      sortByCanonical(ad.equipped);
    }
    this.registry.set('brainrotData', this.brData);
    this.ui.refresh();
    this.saveBrainrot();
  }

  equipAbility(id) {
    const ad = this.brData.abilities;
    if (!ad.owned.includes(id)) return;
    if (ad.equipped.includes(id)) return;
    if (ad.equipped.length >= 8) return;
    ad.equipped.push(id);
    sortByCanonical(ad.equipped);
    this.registry.set('brainrotData', this.brData);
    this.ui.refreshAbilities();
    this.saveBrainrot();
  }

  upgradeAbility(id) {
    const UPGRADE_COSTS = [0, 500, 2000, 8000, 30000]; // cost to reach L2..L5
    if (!ABILITY_ORDER.includes(id)) return;
    const ad = this.brData.abilities;
    if (!ad.owned.includes(id)) return;
    const lvl = this.brData.abilityLevels[id] || 1;
    if (lvl >= 5) return;
    const cost = UPGRADE_COSTS[lvl];
    if (this.brData.coins < cost) return;
    this.brData.coins -= cost;
    this.brData.abilityLevels[id] = lvl + 1;
    // Keep the soldierLevel mirror in sync for the migration path
    if (id === 'soldier') this.brData.soldierLevel = this.brData.abilityLevels.soldier;
    this.registry.set('brainrotData', this.brData);
    this.ui.refresh();
    this.saveBrainrot();
  }

  // Buy `count` health upgrades. Each upgrade costs (50 + level*10) coins
  // and adds 10 max HP. Caps at 100 upgrades.
  upgradeHealth(count) {
    const requested = Math.max(1, Math.floor(count || 1));
    let bought = 0;
    while (bought < requested) {
      const lvl = this.brData.healthLevel || 0;
      if (lvl >= 100) break;
      const cost = 50 + lvl * 10;
      if (this.brData.coins < cost) break;
      this.brData.coins -= cost;
      this.brData.healthLevel = lvl + 1;
      bought++;
    }
    if (bought > 0) {
      this.registry.set('brainrotData', this.brData);
      this.ui.refresh();
      this.saveBrainrot();
    }
  }

  unequipAbility(id) {
    const ad = this.brData.abilities;
    const i = ad.equipped.indexOf(id);
    if (i === -1) return;
    ad.equipped.splice(i, 1);
    this.registry.set('brainrotData', this.brData);
    this.ui.refreshAbilities();
    this.saveBrainrot();
  }

  saveBrainrot() {
    // Write to localStorage FIRST (synchronous, can't be lost to a refresh),
    // then fire the server save. Record lastServerCoins so we can detect
    // operator-side coin bumps and add them to the client total on reload.
    const snapshot = JSON.parse(JSON.stringify(this.brData));
    try {
      localStorage.setItem('cc_brdata_' + (this.username || '_').toLowerCase(),
        JSON.stringify({ data: snapshot, ts: Date.now(), lastServerCoins: snapshot.coins }));
    } catch {}

    let token = null;
    try { token = localStorage.getItem('cc_session'); } catch {}
    const payload = { token, brainrotData: snapshot };
    fetch('/api/save-brainrot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).then((r) => r.json()).then((d) => {
      if (d && d.ok) {
        if (this.ui && this.ui.showSaveToast) this.ui.showSaveToast('Saved');
      } else {
        if (this.ui && this.ui.showSaveToast) this.ui.showSaveToast('Save failed', true);
      }
    }).catch(() => {
      if (this.ui && this.ui.showSaveToast) this.ui.showSaveToast('Save failed', true);
    });
  }

  exitTo(sceneKey, data) {
    this.teardown();
    this.scene.start(sceneKey, data);
  }
}
