import Phaser from 'phaser';
import { BootScene } from './scenes/Boot.js';
import { WorldScene } from './scenes/World.js';
import { BattleScene } from './scenes/Battle.js';
import { InventoryScene } from './scenes/Inventory.js';
import { HUDScene } from './scenes/HUD.js';

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
  scene: [BootScene, WorldScene, BattleScene, InventoryScene, HUDScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
