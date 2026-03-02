import Phaser from 'phaser';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    const w = this.cameras.main.width;

    // Zone name display
    this.zoneText = this.add.text(w / 2, 12, 'Starter Town', {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Orb count
    this.orbText = this.add.text(10, 10, '', {
      fontSize: '11px', color: '#ff8a80', backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    // Creature count
    this.creatureText = this.add.text(10, 32, '', {
      fontSize: '11px', color: '#80cbc4', backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    // Controls hint
    this.add.text(w - 10, 10, 'WASD/Arrows: Move | I: Inventory', {
      fontSize: '9px', color: '#666666',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Listen for zone changes
    const worldScene = this.scene.get('World');
    worldScene.events.on('zone-change', (zone) => {
      this.zoneText.setText(zone);
      // Flash effect on zone change
      this.tweens.add({
        targets: this.zoneText,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
      });
    });
  }

  update() {
    const playerData = this.registry.get('playerData');
    if (playerData) {
      this.orbText.setText(`Orbs: ${playerData.orbs}`);
      this.creatureText.setText(`Creatures: ${playerData.creatures.length}`);
    }
  }
}
