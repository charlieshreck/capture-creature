import Phaser from 'phaser';
import { BootScene } from './scenes/Boot.js';
import { WorldScene } from './scenes/World.js';
import { BattleScene } from './scenes/Battle.js';
import { InventoryScene } from './scenes/Inventory.js';
import { HUDScene } from './scenes/HUD.js';
import { AdminPanelScene } from './scenes/AdminPanel.js';
import { HomepageScene } from './scenes/Homepage.js';
import { LoginScene } from './scenes/Login.js';
import { AvatarScene } from './scenes/Avatar.js';
import { Avatar3DScene } from './scenes/Avatar3D.js';
import { BrainrotHubScene } from './scenes/BrainrotHub.js';
import { SafeBlastScene } from './scenes/SafeBlast.js';
import { WizardsScene } from './scenes/Wizards.js';
import { ManagerScene } from './scenes/Manager.js';
import { FCComputerScene } from './scenes/FCComputer.js';
import { EonsmithScene } from './scenes/Eonsmith.js';

const config = {
  type: Phaser.AUTO,
  parent: document.body,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, HomepageScene, LoginScene, AvatarScene, Avatar3DScene, WorldScene, BattleScene, InventoryScene, HUDScene, AdminPanelScene, BrainrotHubScene, SafeBlastScene, WizardsScene, ManagerScene, FCComputerScene, EonsmithScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
};

const game = new Phaser.Game(config);

// Browser back/forward navigates Phaser scenes
// Skip Boot (it's internal), HUD (it's an overlay), and BattleScene (needs
// encounter data that isn't in history state).
const HISTORY_SKIP = new Set(['Boot', 'HUD', 'Battle']);
let suppressPush = false;

game.events.once(Phaser.Core.Events.READY, () => {
  history.replaceState({ scene: 'Boot' }, '');
  for (const sc of game.scene.scenes) {
    sc.events.on(Phaser.Scenes.Events.CREATE, () => {
      const key = sc.sys.settings.key;
      if (HISTORY_SKIP.has(key)) return;
      if (suppressPush) { suppressPush = false; return; }
      if (history.state && history.state.scene === key) return;
      history.pushState({ scene: key }, '', '#' + key.toLowerCase());
    });
  }
});

window.addEventListener('popstate', (e) => {
  const target = (e.state && e.state.scene) || 'Homepage';
  if (HISTORY_SKIP.has(target)) return;
  const active = game.scene.getScenes(true)[0];
  if (!active || active.sys.settings.key === target) return;
  suppressPush = true;
  active.scene.start(target);
});
