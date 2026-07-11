import Phaser from 'phaser';
import Player from '../entities/Player';
import { generateGameTextures, generateTilemapJSON } from '../utils/textureGenerator';

export default class InvestigationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InvestigationScene' });
    this.playersMap = new Map();
    this.localPlayer = null;
    this.socket = null;
    this.roomCode = null;
    this.playerId = null;
    this.lastEmitTime = 0;
    this.emitThrottleMs = 50;

    this.activeHotspot = null;
    this.overlappingThisFrame = null;
  }

  init(data) {
    this.socket = data.socket;
    this.roomCode = data.roomCode;
    this.playerId = data.playerId;
    this.initialPlayers = data.players || [];
    this.suspects = data.suspects || [];
    this.clues = data.clues || [];
    this.phase = data.phase || 'investigation';
    this.mapConfig = data.mapConfig || null;
  }

  preload() {
    generateGameTextures(this);
    const mapData = generateTilemapJSON(this.roomCode, this.mapConfig);
    this.cache.tilemap.add('investigation_map', { format: Phaser.Tilemaps.Formats.TILED_JSON, data: mapData });
  }

  create() {
    const worldWidth = 1600;
    const worldHeight = 1200;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    // 1. Create Walk Animations
    if (!this.anims.exists('walk_down')) {
      this.anims.create({
        key: 'walk_down',
        frames: this.anims.generateFrameNumbers('character_spritesheet', { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1
      });
      this.anims.create({
        key: 'walk_left',
        frames: this.anims.generateFrameNumbers('character_spritesheet', { start: 3, end: 5 }),
        frameRate: 8,
        repeat: -1
      });
      this.anims.create({
        key: 'walk_right',
        frames: this.anims.generateFrameNumbers('character_spritesheet', { start: 6, end: 8 }),
        frameRate: 8,
        repeat: -1
      });
      this.anims.create({
        key: 'walk_up',
        frames: this.anims.generateFrameNumbers('character_spritesheet', { start: 9, end: 11 }),
        frameRate: 8,
        repeat: -1
      });
    }

    // 2. Load Tiled Map
    const map = this.make.tilemap({ key: 'investigation_map' });
    const tileset = map.addTilesetImage('mansion_tiles', 'mansion_tiles');
    
    // Create layers
    const floorLayer = map.createLayer('floor', tileset, 0, 0);
    this.wallsLayer = map.createLayer('walls', tileset, 0, 0);
    
    // Enable collisions on wallsLayer
    this.wallsLayer.setCollisionByExclusion([-1]);

    // 3. Create Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Joystick overlay removed

    // 5. Spawn suspects as static interactive sprites
    this.hotspots = this.physics.add.staticGroup();
    
    // Distribute suspects around the map
    this.suspects.forEach((sus, index) => {
      let sx = 300 + (index * 250) % 1000;
      let sy = 300 + (Math.floor(index / 4) * 200);

      if (this.mapConfig && this.mapConfig.suspectSpawns) {
        const spawn = this.mapConfig.suspectSpawns.find(s => s.suspectName.toLowerCase() === sus.name.toLowerCase());
        if (spawn) {
          sx = spawn.x;
          sy = spawn.y;
        }
      }

      // Draw suspect circle placeholder
      const gfx = this.add.graphics();
      gfx.fillStyle(0x7f1d1d, 1); // Dark Red
      gfx.lineStyle(2, 0xef4444, 1);
      gfx.fillCircle(sx, sy, 20);
      gfx.strokeCircle(sx, sy, 20);

      const nameTxt = this.add.text(sx, sy - 30, sus.name, {
        fontSize: '10px',
        color: '#f87171',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);

      const zone = this.add.zone(sx, sy, 80, 80);
      zone.setData('hotspot', {
        type: 'suspect',
        name: sus.name,
        data: sus
      });
      this.hotspots.add(zone);
    });

    // 6. Spawn clues/evidence hotspots
    // Create pre-defined search coordinates for objects
    const placements = (this.mapConfig && this.mapConfig.cluePlacements) || [
      { clueName: "Desk", itemName: "Desk", x: 400, y: 700 },
      { clueName: "Safe", itemName: "Safe", x: 600, y: 700 },
      { clueName: "Laptop", itemName: "Laptop", x: 800, y: 700 },
      { clueName: "Bookshelf", itemName: "Bookshelf", x: 1000, y: 700 },
      { clueName: "Waste Basket", itemName: "Waste Basket", x: 400, y: 850 },
      { clueName: "Coffee Table", itemName: "Coffee Table", x: 600, y: 850 },
      { clueName: "Fireplace", itemName: "Fireplace", x: 800, y: 850 }
    ];

    placements.forEach((placement, index) => {
      const cx = placement.x;
      const cy = placement.y;
      const item = placement.itemName;

      const gfx = this.add.graphics();
      gfx.fillStyle(0xd97706, 0.8); // Amber
      gfx.fillRect(cx - 15, cy - 15, 30, 30);

      this.add.text(cx, cy - 25, item, {
        fontSize: '9px',
        color: '#fbbf24',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 3, y: 1 }
      }).setOrigin(0.5);

      const zone = this.add.zone(cx, cy, 70, 70);
      zone.setData('hotspot', {
        type: 'inspect',
        name: item,
        target: item
      });
      this.hotspots.add(zone);
    });

    // 7. Spawn players
    this.initialPlayers.forEach(p => {
      this.spawnPlayer(p);
    });

    // 8. Overlaps listener
    this.physics.add.overlap(this.localPlayer, this.hotspots, (player, zone) => {
      this.overlappingThisFrame = zone.getData('hotspot');
    });

    // 9. Setup Socket listeners
    if (this.socket) {
      this.socket.on('player:position', (data) => {
        if (data.sceneId === 'InvestigationScene') {
          this.updateRemotePlayerPosition(data);
        }
      });
      this.socket.on('player-left', (data) => {
        this.removePlayer(data.playerId);
      });
      this.socket.on('phase-updated', (newPhase) => {
        this.phase = newPhase;
      });
    }
  }

  update(time) {
    if (!this.localPlayer) return;

    // Freeze local and remote movement during meetings
    if (this.phase === 'discussion' || this.phase === 'voting' || this.phase === 'result') {
      this.localPlayer.move(0, 0);
      this.playersMap.forEach((player, pId) => {
        if (pId !== this.playerId) {
          player.move(0, 0);
        }
      });
      return;
    }

    let vx = 0;
    let vy = 0;
    const speed = 220;

    // 1. Process Keyboard Input
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Joystick input processing removed

    // 3. Apply Local Movement
    this.localPlayer.move(vx, vy);

    // 4. Interpolate Remote Players
    this.playersMap.forEach((player, pId) => {
      if (pId !== this.playerId && player.targetX !== undefined) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;

        player.x = Phaser.Math.Linear(player.x, player.targetX, 0.2);
        player.y = Phaser.Math.Linear(player.y, player.targetY, 0.2);

        // Animate remote character walking
        player.animate(dx, dy, player.targetDirection);
      }
    });

    // 5. Emit position to Server (throttled)
    if (vx !== 0 || vy !== 0) {
      if (time - this.lastEmitTime > this.emitThrottleMs) {
        const dir = this.localPlayer.getDirection(vx, vy) || 'down';
        if (this.socket) {
          this.socket.emit('player:move', {
            x: this.localPlayer.x,
            y: this.localPlayer.y,
            direction: dir,
            sceneId: 'InvestigationScene'
          });
        }
        this.lastEmitTime = time;
      }
    }

    // 6. Handle Overlap Event Bridge
    if (this.overlappingThisFrame) {
      if (!this.activeHotspot || this.activeHotspot.name !== this.overlappingThisFrame.name) {
        this.activeHotspot = this.overlappingThisFrame;
        this.game.events.emit('overlap-start', this.activeHotspot);
      }
    } else {
      if (this.activeHotspot) {
        this.activeHotspot = null;
        this.game.events.emit('overlap-end');
      }
    }

    // Reset collision state for next frame evaluation
    this.overlappingThisFrame = null;
  }

  spawnPlayer(p) {
    if (!p) return;
    const pId = p.playerId || p.id;
    if (!pId) return;
    if (this.playersMap.has(pId)) return;

    const isLocal = pId === this.playerId;
    const spawnX = p.x || 800;
    const spawnY = p.y || 600;
    const tintColor = this.getColorFromId(pId);

    const playerSprite = new Player(this, spawnX, spawnY, pId, p.name || 'Unknown', isLocal, tintColor);
    playerSprite.hideReadyStatus();

    // Collide with tilemap walls
    if (this.wallsLayer) {
      this.physics.add.collider(playerSprite, this.wallsLayer);
    }

    this.playersMap.set(pId, playerSprite);

    if (isLocal) {
      this.localPlayer = playerSprite;
      this.cameras.main.startFollow(playerSprite, true, 0.1, 0.1);
    }
  }

  removePlayer(pId) {
    const playerSprite = this.playersMap.get(pId);
    if (playerSprite) {
      playerSprite.destroy();
      this.playersMap.delete(pId);
    }
  }

  updateRemotePlayerPosition(data) {
    const player = this.playersMap.get(data.playerId);
    if (player && !player.isLocal) {
      player.targetX = data.x;
      player.targetY = data.y;
      player.targetDirection = data.direction;
    }
  }

  getColorFromId(id) {
    if (!id) return 0xffffff;
    let hash = 0;
    const idStr = String(id);
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b,
      0x8b5cf6, 0xec4899, 0x06b6d4, 0x14b8a6
    ];
    return colors[Math.abs(hash) % colors.length];
  }

  shutdown() {
    const lastPositions = {};
    this.playersMap.forEach((sprite, pId) => {
      lastPositions[pId] = { x: sprite.x, y: sprite.y };
    });
    this.game.registry.set('lastPositions', lastPositions);

    this.scene.stop('VirtualJoystickScene');
    if (this.socket) {
      this.socket.off('player:position');
      this.socket.off('player-left');
      this.socket.off('phase-updated');
    }
  }
}
