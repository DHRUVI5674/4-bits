import Phaser from 'phaser';
import { generateGameTextures } from '../utils/textureGenerator';
import { buildTilemapJSON } from '../utils/mapBuilder';
import { mansionMap } from '../maps/mansionMap';
import PlayerSprite, { registerPlayerAnimations } from '../entities/PlayerSprite';

export default class LandingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LandingScene' });
  }

  preload() {
    generateGameTextures(this);
    const mapData = buildTilemapJSON(mansionMap);
    this.cache.tilemap.add('landing_map', { format: Phaser.Tilemaps.Formats.TILED_JSON, data: mapData });
  }

  create() {
    // Register layered animations
    registerPlayerAnimations(this.anims);

    // Load Map
    const map = this.make.tilemap({ key: 'landing_map' });
    const tileset = map.addTilesetImage('mansion_tiles', 'mansion_tiles');

    map.createLayer('floor', tileset, 0, 0);
    map.createLayer('walls', tileset, 0, 0);
    map.createLayer('furniture', tileset, 0, 0);
    map.createLayer('decoration', tileset, 0, 0);

    // Get focus room from registry (passed down from React)
    const focusRoomId = this.registry.get('focusRoom') || 'library';
    const room = mansionMap.rooms.find(r => r.id === focusRoomId) || mansionMap.rooms[0];

    // Setup Camera on Focus Room
    const TILE = 32;
    const roomX = room.x * TILE;
    const roomY = room.y * TILE;
    const roomW = room.w * TILE;
    const roomH = room.h * TILE;

    const cx = roomX + (roomW / 2);
    const cy = roomY + (roomH / 2);
    this.cameras.main.centerOn(cx, cy);
    this.cameras.main.setZoom(2.5); // Zoom in on the room

    this.defaultCamX = cx;
    this.defaultCamY = cy;

    // Add Characters with Emotes
    const colors = [0xff4444, 0x4444ff, 0x44ff44]; // Red, Blue, Green
    const positions = [
      // Left side, facing right
      { x: cx - 120, y: cy + 10, dir: 'walk_right', flip: false },
      // Left side, higher up, facing right
      { x: cx - 100, y: cy - 40, dir: 'walk_right', flip: false },
      // Right side, facing left (by using walk_right and flipping)
      { x: cx + 120, y: cy, dir: 'walk_right', flip: true }
    ];

    positions.forEach((pos, i) => {
      // Create random appearances for the dancing characters
      const apps = [
        { skinTone: 0xffcd94, outfit: 'outfit_trenchcoat', outfitColor: 0x8a2029, hairStyle: 'hair_slicked', hairColor: 0x451a03 },
        { skinTone: 0x8d5524, outfit: 'outfit_vest', outfitColor: 0x1e293b, hairStyle: 'hair_short', hairColor: 0x000000 },
        { skinTone: 0xffe0bd, outfit: 'outfit_casual', outfitColor: 0x047857, hairStyle: 'hair_bob', hairColor: 0xca8a04 }
      ];
      
      const sprite = new PlayerSprite(this, pos.x, pos.y, apps[i]);
      sprite.playAnim(pos.dir);
      if (pos.flip) sprite.setFlipX(true);

      // Rhythmic "dance" tween (smooth bobbing and gentle rotation instead of rapid flipping)
      this.tweens.add({
        targets: sprite,
        y: pos.y - 12,
        duration: 350 + Math.random() * 50,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 150
      });

      this.tweens.add({
        targets: sprite,
        angle: { from: -10, to: 10 },
        duration: 700 + Math.random() * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 100
      });
    });

    // Dark Vignette & Lamp Lighting Overlays
    const overlay = this.add.graphics();
    // Dark base overlay (mid-dark grey for multiply blend mode)
    overlay.fillStyle(0x443333, 1); 
    overlay.fillRect(0, 0, map.widthInPixels, map.heightInPixels);

    // Main warm lamp glow (placed slightly off-center dynamically based on room)
    const lampX = roomX + (roomW * 0.7);
    const lampY = roomY + (roomH * 0.7);
    
    // Draw white circles where the lights should be
    // Main desk lamp (soft radial gradient effect using concentric circles)
    for (let r = 160; r > 0; r -= 20) {
      overlay.fillStyle(0xffffff, 0.15); // Layered opacity
      overlay.fillCircle(lampX, lampY, r);
    }
    
    positions.forEach(pos => {
      // Soft spotlights for characters (anchored at their feet)
      for (let r = 100; r > 0; r -= 25) {
        overlay.fillStyle(0xffffff, 0.2);
        overlay.fillCircle(pos.x, pos.y + 16, r);
      }
    });
    
    overlay.generateTexture('shadow_mask', map.widthInPixels, map.heightInPixels);
    overlay.destroy();

    const shadowImage = this.add.image(0, 0, 'shadow_mask').setOrigin(0, 0);
    shadowImage.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Warm glow sprites
    this.glow = this.add.graphics();
    this.glow.setBlendMode(Phaser.BlendModes.ADD);

    // Draw main desk lamp warm glow (layered)
    this.glow.fillStyle(0xfcd34d, 0.1);
    this.glow.fillCircle(lampX, lampY, 140);
    this.glow.fillStyle(0xfcd34d, 0.15);
    this.glow.fillCircle(lampX, lampY, 80);
    this.glow.fillStyle(0xfcd34d, 0.3);
    this.glow.fillCircle(lampX, lampY, 30);

    // Draw warm ambient spotlights over the dancing characters
    positions.forEach(pos => {
      this.glow.fillStyle(0xfcd34d, 0.1);
      this.glow.fillCircle(pos.x, pos.y + 16, 90);
      this.glow.fillStyle(0xfcd34d, 0.15);
      this.glow.fillCircle(pos.x, pos.y + 16, 40);
    });

    // Subtle Flicker animation (more stable and less intense)
    this.tweens.add({
      targets: this.glow,
      alpha: { from: 0.9, to: 1 },
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Dust Motes Particles
    if (!this.textures.exists('dust')) {
      const g = this.make.graphics({ x:0, y:0, add:false });
      g.fillStyle(0xffe6c2, 1);
      g.fillRect(0,0,2,2);
      g.generateTexture('dust', 2, 2);
    }
    this.add.particles(0, 0, 'dust', {
      x: { min: roomX, max: roomX + roomW },
      y: { min: roomY, max: roomY + roomH },
      lifespan: 6000,
      speedY: { min: -10, max: 10 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0, end: 1 },
      alpha: { start: 0.6, end: 0 },
      quantity: 1,
      frequency: 200,
      blendMode: 'ADD'
    });

  }

  destroy() {
    // Clean up if necessary
  }
}
