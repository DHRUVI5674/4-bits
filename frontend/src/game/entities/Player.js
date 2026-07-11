import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, playerId, name, isLocal = false, tintColor = 0xffffff) {
    super(scene, x, y);
    this.scene = scene;
    this.playerId = playerId;
    this.name = name;
    this.isLocal = isLocal;

    // 1. Create Player Sprite from spritesheet
    this.bodySprite = scene.add.sprite(0, 0, 'character_spritesheet', 0);
    this.bodySprite.setScale(1.5); // Make the character sprite 1.5x larger
    this.bodySprite.setTint(tintColor);
    this.add(this.bodySprite);

    // 2. Add Name Label above player
    this.nameLabel = scene.add.text(0, -40, name, {
      fontSize: '11px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.add(this.nameLabel);

    // 3. Add Ready Status indicator (for lobby)
    this.statusLabel = scene.add.text(0, -56, '', {
      fontSize: '9px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add(this.statusLabel);

    // 4. Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body size (scaled proportionately)
    this.body.setCollideWorldBounds(true);
    this.body.setSize(36, 36);
    this.body.setOffset(-18, -12);
  }

  setReadyStatus(isReady) {
    if (!this.statusLabel || !this.statusLabel.scene) return;
    if (isReady) {
      this.statusLabel.setText('READY').setColor('#4ade80');
    } else {
      this.statusLabel.setText('WAITING').setColor('#9ca3af');
    }
  }

  hideReadyStatus() {
    if (this.statusLabel && this.statusLabel.scene) {
      this.statusLabel.setVisible(false);
    }
  }

  animate(vx, vy, dir) {
    if (!this.bodySprite) return;

    const moving = Math.abs(vx) > 5 || Math.abs(vy) > 5;
    if (moving) {
      const currentDir = dir || this.getDirection(vx, vy) || 'down';
      this.bodySprite.play(`walk_${currentDir}`, true);
    } else {
      this.bodySprite.stop();
      const currentDir = dir || 'down';
      if (currentDir === 'down') this.bodySprite.setFrame(0);
      else if (currentDir === 'left') this.bodySprite.setFrame(3);
      else if (currentDir === 'right') this.bodySprite.setFrame(6);
      else if (currentDir === 'up') this.bodySprite.setFrame(9);
    }
  }

  move(vx, vy, dir) {
    if (this.body) {
      this.body.setVelocity(vx, vy);
      this.animate(vx, vy, dir);
    }
  }

  getDirection(vx, vy) {
    if (Math.abs(vx) > Math.abs(vy)) {
      return vx > 0 ? 'right' : 'left';
    } else if (Math.abs(vy) > 0) {
      return vy > 0 ? 'down' : 'up';
    }
    return null;
  }
}
