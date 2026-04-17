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
import { CreateMovieScene } from './scenes/CreateMovie.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, HomepageScene, LoginScene, AvatarScene, Avatar3DScene, WorldScene, BattleScene, InventoryScene, HUDScene, AdminPanelScene, BrainrotHubScene, SafeBlastScene, CreateMovieScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
