import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, playerId, name, isLocal = false, appearance = null) {
    super(scene, x, y);
    this.scene = scene;
    this.playerId = playerId;
    this.name = name;
    this.isLocal = isLocal;
    
    // Default appearance fallback for dummies or missing data
    this.app = {
      skinTone: 0xffffff,
      hairStyle: 'hair_none',
      hairColor: 0xffffff,
      outfit: 'outfit_none',
      outfitColor: 0xffffff,
      ...appearance
    };

    // Layer 1: Body
    this.bodySprite = scene.add.sprite(0, 0, 'base_body');
    this.bodySprite.setTint(this.app.skinTone);
    
    // Layer 2: Outfit
    this.outfitSprite = scene.add.sprite(0, 0, this.app.outfit);
    if (this.app.outfitColor) this.outfitSprite.setTint(this.app.outfitColor);
    
    // Layer 3: Hair
    this.hairSprite = scene.add.sprite(0, 0, this.app.hairStyle);
    if (this.app.hairColor) this.hairSprite.setTint(this.app.hairColor);

    this.add([this.bodySprite, this.outfitSprite, this.hairSprite]);
    
    this.setScale(2.2);
    this.setSize(32, 48); // Container bounds for physics

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
    // Use a very small hitbox centered at the feet so they don't snag on corners
    this.body.setSize(12, 12);
    this.body.setOffset(10, 24);
  }

  preUpdate(time, delta) {
    // Containers don't have preUpdate by default, but if registered, we don't need to manually move labels since they are children now!
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
    const moving = Math.abs(vx) > 5 || Math.abs(vy) > 5;
    const currentDir = dir || this.getDirection(vx, vy) || 'down';
    
    const playLayer = (sprite, prefix, ignoreIfPlaying) => {
      if (sprite && sprite.texture.key !== 'outfit_none' && sprite.texture.key !== 'hair_none') {
        const animKey = `${prefix}_${sprite.texture.key}`;
        if (this.scene.anims.exists(animKey)) {
          sprite.play({ key: animKey, ignoreIfPlaying });
        } else {
          sprite.stop();
          sprite.setFrame(0);
        }
      }
    };

    if (moving) {
      const animPrefix = `walk_${currentDir}`;
      playLayer(this.bodySprite, animPrefix, true);
      playLayer(this.outfitSprite, animPrefix, true);
      playLayer(this.hairSprite, animPrefix, true);
      
      const flip = (currentDir === 'left');
      this.bodySprite.setFlipX(flip);
      this.outfitSprite.setFlipX(flip);
      this.hairSprite.setFlipX(flip);
    } else {
      this.bodySprite.stop();
      this.outfitSprite.stop();
      this.hairSprite.stop();
      
      let frame = 0;
      if (currentDir === 'down') frame = 0;
      else if (currentDir === 'left') frame = 3;
      else if (currentDir === 'right') frame = 6;
      else if (currentDir === 'up') frame = 9;
      
      this.bodySprite.setFrame(frame);
      this.outfitSprite.setFrame(frame);
      this.hairSprite.setFrame(frame);
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

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this.statusLabel) this.statusLabel.destroy();
    super.destroy(fromScene);
  }
}
