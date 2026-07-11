import Phaser from 'phaser';
import Player from '../entities/Player';
import { generateGameTextures, generateTilemapJSON } from '../utils/textureGenerator';

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    this.playersMap = new Map();
    this.localPlayer = null;
    this.socket = null;
    this.roomCode = null;
    this.playerId = null;
    this.lastEmitTime = 0;
    this.emitThrottleMs = 50; // Throttling at 20Hz
  }

  init(data) {
    this.socket = data.socket;
    this.roomCode = data.roomCode;
    this.playerId = data.playerId;
    this.initialPlayers = data.players || [];
  }

  preload() {
    generateGameTextures(this);
    const mapData = generateTilemapJSON(this.roomCode);
    this.cache.tilemap.add('lobby_map', { format: Phaser.Tilemaps.Formats.TILED_JSON, data: mapData });
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
    const map = this.make.tilemap({ key: 'lobby_map' });
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

    // 5. Spawn initial players
    this.initialPlayers.forEach(p => {
      this.spawnPlayer(p);
    });

    // 6. Setup Socket Listeners
    if (this.socket) {
      this.socket.on('player-joined', (data) => {
        this.spawnPlayer(data.player);
      });

      this.socket.on('player-left', (data) => {
        this.removePlayer(data.playerId);
      });

      this.socket.on('player:position', (data) => {
        if (data.sceneId === 'LobbyScene') {
          this.updateRemotePlayerPosition(data);
        }
      });

      this.socket.on('player-ready-updated', (data) => {
        const remotePlayer = this.playersMap.get(data.playerId);
        if (remotePlayer) {
          remotePlayer.setReadyStatus(data.isReady);
        }
      });

      // Sync ready statuses for existing players
      this.initialPlayers.forEach(p => {
        const sprite = this.playersMap.get(p.playerId);
        if (sprite) {
          sprite.setReadyStatus(p.isReady);
        }
      });
    } else {
      // Center camera on lobby center
      this.cameras.main.centerOn(800, 600);

      // Spawn 3 autonomous dummy players wandering in the background (Blue, Orange, Red)
      const dummyData = [
        { playerId: 'dummy-blue', name: 'Investigator Blue', tint: 0x3b82f6, x: 800, y: 600 },
        { playerId: 'dummy-orange', name: 'Investigator Orange', tint: 0xf59e0b, x: 720, y: 550 },
        { playerId: 'dummy-red', name: 'Investigator Red', tint: 0xef4444, x: 880, y: 650 }
      ];

      dummyData.forEach(d => {
        const playerSprite = new Player(this, d.x, d.y, d.playerId, d.name, false, d.tint);
        playerSprite.bodySprite.setScale(2.5); // Make characters bigger for background aesthetic
        playerSprite.hideReadyStatus();
        if (this.wallsLayer) {
          this.physics.add.collider(playerSprite, this.wallsLayer);
        }
        this.playersMap.set(d.playerId, playerSprite);

        // Simple wandering AI
        this.time.addEvent({
          delay: Phaser.Math.Between(1500, 3000),
          callback: () => {
            if (playerSprite.active && playerSprite.body) {
              const dist = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, 800, 600);
              let angle;
              if (dist > 250) {
                // Steer back to center if wandered too far
                angle = Phaser.Math.Angle.Between(playerSprite.x, playerSprite.y, 800, 600);
              } else {
                angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
              }
              const speed = Phaser.Math.Between(80, 140);
              const vx = Math.cos(angle) * speed;
              const vy = Math.sin(angle) * speed;
              playerSprite.move(vx, vy);
            }
          },
          loop: true
        });
      });
    }
  }

  update(time) {
    if (!this.localPlayer) return;

    let vx = 0;
    let vy = 0;
    const speed = 250;

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

        // Linear Interpolation (lerp) toward target position
        player.x = Phaser.Math.Linear(player.x, player.targetX, 0.2);
        player.y = Phaser.Math.Linear(player.y, player.targetY, 0.2);

        // Walk animation for remote player if moving
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
            sceneId: 'LobbyScene'
          });
        }
        this.lastEmitTime = time;
      }
    }
  }

  spawnPlayer(p) {
    const id = p.playerId || p.id;
    if (!id || this.playersMap.has(id)) return;

    const isLocal = id === this.playerId;
    const spawnX = p.x || 800;
    const spawnY = p.y || 600;

    // Use a unique colored tint color based on the hash of their ID
    const tintColor = this.getColorFromId(id);

    const playerSprite = new Player(this, spawnX, spawnY, id, p.name, isLocal, tintColor);
    playerSprite.setReadyStatus(p.isReady);

    // Collide with tilemap walls
    if (this.wallsLayer) {
      this.physics.add.collider(playerSprite, this.wallsLayer);
    }

    this.playersMap.set(id, playerSprite);

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
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Curated color list to avoid plain colors
    const colors = [
      0xef4444, // red
      0x3b82f6, // blue
      0x10b981, // green
      0xf59e0b, // amber
      0x8b5cf6, // purple
      0xec4899, // pink
      0x06b6d4, // cyan
      0x14b8a6  // teal
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  shutdown() {
    this.scene.stop('VirtualJoystickScene');
    if (this.socket) {
      this.socket.off('player-joined');
      this.socket.off('player-left');
      this.socket.off('player:position');
      this.socket.off('player-ready-updated');
    }
  }
}
