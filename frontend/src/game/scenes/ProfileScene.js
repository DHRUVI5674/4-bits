import { generateGameTextures } from '../utils/textureGenerator';
import PlayerSprite, { registerPlayerAnimations } from '../entities/PlayerSprite';

export default class ProfileScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ProfileScene' });
  }

  preload() {
    generateGameTextures(this);
  }

  create() {
    registerPlayerAnimations(this.anims);

    // Get customizations from registry
    const app = this.registry.get('appearance') || {
      skinTone: 0xffe0bd,
      hairStyle: 'hair_none',
      hairColor: 0x451a03,
      outfit: 'outfit_trenchcoat',
      outfitColor: 0x8a2029
    };
    
    // Add character sprite
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    
    this.sprite = new PlayerSprite(this, cx, cy, app);
    this.sprite.setScale(8); // Huge scale for preview
    
    this.facingDirs = ['walk_down', 'walk_left', 'walk_right', 'walk_up'];
    this.dirIndex = this.registry.get('direction') || 0;
    this.sprite.playAnim(this.facingDirs[this.dirIndex]);
    this.sprite.setFlipX(this.facingDirs[this.dirIndex] === 'walk_left');

    // Listen for registry changes to update live
    this.registry.events.on('changedata', (parent, key, data) => {
      if (key === 'appearance') {
        this.sprite.setAppearance(data);
      } else if (key === 'direction') {
        this.dirIndex = data;
        this.sprite.playAnim(this.facingDirs[this.dirIndex]);
        this.sprite.setFlipX(this.facingDirs[this.dirIndex] === 'walk_left');
      }
    });
  }
}

