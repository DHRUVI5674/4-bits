import Phaser from 'phaser';

export default class PlayerSprite extends Phaser.GameObjects.Container {
  constructor(scene, x, y, appearance) {
    super(scene, x, y);
    
    // Default appearance fallback
    const app = {
      skinTone: 0xffffff,
      hairStyle: 'hair_none',
      hairColor: 0xffffff,
      outfit: 'outfit_none',
      outfitColor: 0xffffff,
      ...appearance
    };

    // Base Body
    this.bodySprite = scene.add.sprite(0, 0, 'base_body');
    this.bodySprite.setTint(app.skinTone);
    
    // Outfit
    this.outfitSprite = scene.add.sprite(0, 0, app.outfit);
    if (app.outfitColor) this.outfitSprite.setTint(app.outfitColor);
    
    // Hair
    this.hairSprite = scene.add.sprite(0, 0, app.hairStyle);
    if (app.hairColor) this.hairSprite.setTint(app.hairColor);

    this.add([this.bodySprite, this.outfitSprite, this.hairSprite]);
    
    // Ensure the container has a size for physics or interaction
    this.setSize(32, 48);
    
    scene.add.existing(this);
  }

  playAnim(animKey, ignoreIfPlaying) {
    // Determine the animation prefix (walk_down, etc.)
    // We assume the animation keys for body, outfit, and hair are the same, OR we just 
    // play the base animation directly if we registered the animations globally.
    // Wait, animations in Phaser are tied to a key.
    // We should create animations using the specific spritesheet keys!
    
    this.bodySprite.play({ key: animKey + '_base_body', ignoreIfPlaying });
    
    // Outfit and Hair might be 'none', so we only play if they have valid frames
    if (this.outfitSprite.texture.key !== 'outfit_none') {
      this.outfitSprite.play({ key: animKey + '_' + this.outfitSprite.texture.key, ignoreIfPlaying });
    }
    
    if (this.hairSprite.texture.key !== 'hair_none') {
      this.hairSprite.play({ key: animKey + '_' + this.hairSprite.texture.key, ignoreIfPlaying });
    }
  }

  stopAnim() {
    this.bodySprite.stop();
    this.outfitSprite.stop();
    this.hairSprite.stop();
  }
  
  setFlipX(value) {
    this.bodySprite.setFlipX(value);
    this.outfitSprite.setFlipX(value);
    this.hairSprite.setFlipX(value);
  }

  setAppearance(app) {
    if (app.skinTone) this.bodySprite.setTint(app.skinTone);
    
    if (app.outfit) {
      this.outfitSprite.setTexture(app.outfit);
      if (app.outfitColor) this.outfitSprite.setTint(app.outfitColor);
    }
    
    if (app.hairStyle) {
      this.hairSprite.setTexture(app.hairStyle);
      if (app.hairColor) this.hairSprite.setTint(app.hairColor);
    }
  }
}

// Utility to globally register all layer animations
export function registerPlayerAnimations(anims) {
  const layers = [
    'base_body',
    'outfit_trenchcoat', 'outfit_vest', 'outfit_casual', 'outfit_suit',
    'hair_short', 'hair_slicked', 'hair_bob', 'hair_long'
  ];

  layers.forEach(layer => {
    if (!anims.exists('walk_down_' + layer)) {
      anims.create({ key: 'walk_down_' + layer, frames: anims.generateFrameNumbers(layer, { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
      anims.create({ key: 'walk_left_' + layer, frames: anims.generateFrameNumbers(layer, { start: 3, end: 5 }), frameRate: 8, repeat: -1 });
      anims.create({ key: 'walk_right_' + layer, frames: anims.generateFrameNumbers(layer, { start: 6, end: 8 }), frameRate: 8, repeat: -1 });
      anims.create({ key: 'walk_up_' + layer, frames: anims.generateFrameNumbers(layer, { start: 9, end: 11 }), frameRate: 8, repeat: -1 });
    }
  });
}
