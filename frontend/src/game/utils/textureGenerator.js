export function generateGameTextures(scene) {
  // 1. Generate Character Walk Spritesheet (32x32 frames, 3 frames per direction, 4 directions)
  // Directions: 0 = Down, 1 = Left, 2 = Right, 3 = Up
  if (!scene.textures.exists('character_spritesheet')) {
    const canvas = document.createElement('canvas');
    canvas.width = 96;  // 3 frames * 32px
    canvas.height = 128; // 4 directions * 32px
    const ctx = canvas.getContext('2d');

    // Helper to draw a single character frame
    const drawCharFrame = (ctx, fx, fy, dir, frameNum) => {
      ctx.save();
      ctx.translate(fx * 32, fy * 32);

      // Body (suit/clothes)
      ctx.fillStyle = '#ffffff'; // White default, tinted dynamically in Phaser
      ctx.beginPath();
      ctx.roundRect(8, 12, 16, 14, 4);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fbcfe8'; // Skin tone
      ctx.beginPath();
      ctx.arc(16, 8, 6, 0, Math.PI * 2);
      ctx.fill();

      // Hair (dark brown)
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(16, 6, 6, Math.PI, 0);
      ctx.fill();

      // Eyes (looking in the moving direction)
      ctx.fillStyle = '#000000';
      if (dir === 0) { // Down
        ctx.fillRect(13, 7, 2, 2);
        ctx.fillRect(17, 7, 2, 2);
      } else if (dir === 1) { // Left
        ctx.fillRect(11, 7, 2, 2);
        ctx.fillRect(14, 7, 2, 2);
      } else if (dir === 2) { // Right
        ctx.fillRect(16, 7, 2, 2);
        ctx.fillRect(19, 7, 2, 2);
      } else if (dir === 3) { // Up
        // Back of head, no eyes
      }

      // Legs / Walking movement animation
      ctx.fillStyle = '#1e293b'; // Pants
      let leftLegY = 26;
      let rightLegY = 26;
      if (frameNum === 1) {
        leftLegY = 24;
        rightLegY = 27;
      } else if (frameNum === 2) {
        leftLegY = 27;
        rightLegY = 24;
      }

      // Left leg
      ctx.fillRect(10, 24, 4, leftLegY - 24 + 3);
      // Right leg
      ctx.fillRect(18, 24, 4, rightLegY - 24 + 3);

      ctx.restore();
    };

    // Draw all directions and frames
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 3; frame++) {
        drawCharFrame(ctx, frame, dir, dir, frame);
      }
    }

    scene.textures.addSpriteSheet('character_spritesheet', canvas, {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  // 2. Generate Tileset Image (32x32 tiles, 4x4 grid = 128x128px)
  if (!scene.textures.exists('mansion_tiles')) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Tile 1: Floor (dark rich wood parquet pattern)
    ctx.fillStyle = '#1c1917'; // Base
    ctx.fillRect(32, 0, 32, 32);
    ctx.fillStyle = '#292524'; // Wood stripes
    ctx.fillRect(34, 2, 28, 12);
    ctx.fillRect(34, 18, 28, 12);
    ctx.fillStyle = '#44403c'; // Details
    ctx.strokeRect(32, 0, 32, 32);

    // Tile 2: Wall (elegant dark stone block)
    ctx.fillStyle = '#292524'; // Stone dark
    ctx.fillRect(64, 0, 32, 32);
    ctx.fillStyle = '#44403c'; // Brick borders
    ctx.strokeRect(64, 0, 32, 32);
    ctx.fillRect(68, 6, 24, 8);
    ctx.fillRect(68, 18, 24, 8);

    // Tile 3: Border/Decorative Wall top
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = '#78716c';
    ctx.fillRect(96, 0, 32, 8); // Gold/Stone lining
    ctx.fillStyle = '#44403c';
    ctx.fillRect(96, 8, 32, 24);

    scene.textures.addImage('mansion_tiles', canvas);
  }
}

export function generateTilemapJSON(roomCode, mapConfig) {
  // Let's create a 50x38 grid map (1600x1200 world size with 32x32 tiles)
  const width = 50;
  const height = 38;
  const size = width * height;

  const floorData = new Array(size).fill(2); // Tile index 2 (mansion_tiles grid index 1 is x=32,y=0 floor)
  const wallData = new Array(size).fill(0); // 0 means empty/no wall

  // Generate outer borders
  for (let x = 0; x < width; x++) {
    wallData[x] = 3; // Top wall
    wallData[(height - 1) * width + x] = 3; // Bottom wall
  }
  for (let y = 0; y < height; y++) {
    wallData[y * width] = 3; // Left wall
    wallData[y * width + (width - 1)] = 3; // Right wall
  }

  if (mapConfig && mapConfig.rooms && Array.isArray(mapConfig.rooms)) {
    mapConfig.rooms.forEach(room => {
      // Coordinate clamp logic to avoid mapping out of bounds
      const rx = Math.max(1, Math.min(width - 2, room.x || 0));
      const ry = Math.max(1, Math.min(height - 2, room.y || 0));
      const rw = Math.max(4, Math.min(width - rx - 1, room.width || 6));
      const rh = Math.max(4, Math.min(height - ry - 1, room.height || 6));

      // Draw horizontal walls (top & bottom of room)
      for (let x = rx; x < rx + rw; x++) {
        if (ry < height - 1) wallData[ry * width + x] = 3;
        if (ry + rh - 1 < height - 1) wallData[(ry + rh - 1) * width + x] = 3;
      }
      // Draw vertical walls (left & right of room)
      for (let y = ry; y < ry + rh; y++) {
        if (rx < width - 1) wallData[y * width + rx] = 3;
        if (rx + rw - 1 < width - 1) wallData[y * width + (rx + rw - 1)] = 3;
      }

      // Add door openings: 2-tile wide openings in the middle of each wall (clamped/checked)
      // Top wall door opening
      if (ry > 1) {
        const doorX = rx + Math.floor(rw / 2);
        wallData[ry * width + doorX] = 0;
        wallData[ry * width + doorX - 1] = 0;
      }
      // Bottom wall door opening
      if (ry + rh - 1 < height - 2) {
        const doorX = rx + Math.floor(rw / 2);
        wallData[(ry + rh - 1) * width + doorX] = 0;
        wallData[(ry + rh - 1) * width + doorX - 1] = 0;
      }
      // Left wall door opening
      if (rx > 1) {
        const doorY = ry + Math.floor(rh / 2);
        wallData[doorY * width + rx] = 0;
        wallData[(doorY - 1) * width + rx] = 0;
      }
      // Right wall door opening
      if (rx + rw - 1 < width - 2) {
        const doorY = ry + Math.floor(rh / 2);
        wallData[doorY * width + (rx + rw - 1)] = 0;
        wallData[(doorY - 1) * width + (rx + rw - 1)] = 0;
      }
    });
  } else {
    // Fallback: Generate interior wall dividers to partition rooms (Lobby/Investigation rooms)
    for (let y = 5; y < 15; y++) {
      wallData[y * width + 15] = 3; // Vertical separator
    }
    for (let x = 15; x < 35; x++) {
      wallData[15 * width + x] = 3; // Horizontal divider
    }
  }

  // Tiled map JSON structure (v1.2+ format compatible with Phaser)
  return {
    compressionlevel: -1,
    height: height,
    infinite: false,
    layers: [
      {
        data: floorData,
        height: height,
        id: 1,
        name: "floor",
        opacity: 1,
        type: "tilelayer",
        visible: true,
        width: width,
        x: 0,
        y: 0
      },
      {
        data: wallData,
        height: height,
        id: 2,
        name: "walls",
        opacity: 1,
        type: "tilelayer",
        visible: true,
        width: width,
        x: 0,
        y: 0
      }
    ],
    nextlayerid: 3,
    nextobjectid: 1,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.2.4",
    tileheight: 32,
    tilesets: [
      {
        columns: 4,
        firstgid: 1,
        image: "mansion_tiles",
        imageheight: 128,
        imagewidth: 128,
        margin: 0,
        name: "mansion_tiles",
        spacing: 0,
        tilecount: 16,
        tileheight: 32,
        tilewidth: 32
      }
    ],
    tilewidth: 32,
    type: "map",
    version: 1.2,
    width: width
  };
}
