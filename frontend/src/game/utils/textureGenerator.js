export function generateGameTextures(scene) {
  // 1. Generate Character Walk Spritesheet (32x48 frames, 3 frames per dir, 4 dirs)
  // Directions: 0 = Down, 1 = Left, 2 = Right, 3 = Up
  // 1. Generate Modular Character Walk Spritesheets (32x48 frames, 3 frames per dir, 4 dirs)
  // We draw at 16x24 logic size and scale up by 2 to get crisp 2px "pixels".
  const generateSpriteLayer = (key, drawFunction) => {
    if (!scene.textures.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = 96;  // 3 * 32
      canvas.height = 192; // 4 * 48
      const ctx = canvas.getContext('2d');
      // No antialiasing for crisp pixels
      ctx.imageSmoothingEnabled = false;

      for (let dir = 0; dir < 4; dir++) {
        for (let frameNum = 0; frameNum < 3; frameNum++) {
          ctx.save();
          ctx.translate(frameNum * 32, dir * 48);
          ctx.scale(2, 2); // 16x24 coordinate system per frame

          // Call the specific draw function for this layer/dir/frame
          drawFunction(ctx, dir, frameNum);
          
          ctx.restore();
        }
      }

      scene.textures.addSpriteSheet(key, canvas, { frameWidth: 32, frameHeight: 48 });
    }
  };

  // Helper to draw a pixel-perfect rectangle
  const pxRect = (ctx, x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  };

  const OUTLINE = '#110b0d'; // Noir dark outline
  
  // --- BASE BODY LAYER ---
  generateSpriteLayer('base_body', (ctx, dir, frameNum) => {
    // Basic body colors (white default, tintable in-game)
    const BASE = '#ffffff';
    const SHADE = '#cccccc';

    // Bobbing offset
    const yOff = (frameNum !== 0) ? -1 : 0;

    // Legs animation
    let leftLegY = 16, rightLegY = 16;
    if (frameNum === 1) { leftLegY = 15; rightLegY = 17; }
    else if (frameNum === 2) { leftLegY = 17; rightLegY = 15; }

    // LEGS
    if (dir === 1) { // Left
      pxRect(ctx, 6, leftLegY, 3, 7, OUTLINE);
      pxRect(ctx, 7, leftLegY, 1, 6, SHADE);
    } else if (dir === 2) { // Right
      pxRect(ctx, 7, rightLegY, 3, 7, OUTLINE);
      pxRect(ctx, 8, rightLegY, 1, 6, SHADE);
    } else { // Down/Up
      pxRect(ctx, 4, leftLegY, 3, 7, OUTLINE);
      pxRect(ctx, 5, leftLegY, 1, 6, SHADE);
      pxRect(ctx, 9, rightLegY, 3, 7, OUTLINE);
      pxRect(ctx, 10, rightLegY, 1, 6, SHADE);
    }

    // BODY & ARMS
    if (dir === 1 || dir === 2) { // Side view
      // Back Arm
      pxRect(ctx, 6, 9 + yOff, 4, 7, OUTLINE);
      pxRect(ctx, 7, 10 + yOff, 2, 5, SHADE);
      // Torso
      pxRect(ctx, 4, 8 + yOff, 8, 9, OUTLINE);
      pxRect(ctx, 5, 9 + yOff, 6, 7, BASE);
      pxRect(ctx, 8, 9 + yOff, 2, 7, SHADE); // Shading on back
      // Front Arm (swinging)
      let armY = 9 + yOff;
      pxRect(ctx, 5, armY, 4, 7, OUTLINE);
      pxRect(ctx, 6, armY+1, 2, 5, BASE);
    } else { // Front / Back
      // Arms
      pxRect(ctx, 2, 9 + yOff, 3, 7, OUTLINE);
      pxRect(ctx, 3, 10 + yOff, 1, 5, BASE);
      pxRect(ctx, 11, 9 + yOff, 3, 7, OUTLINE);
      pxRect(ctx, 12, 10 + yOff, 1, 5, SHADE);
      // Torso
      pxRect(ctx, 4, 8 + yOff, 8, 9, OUTLINE);
      pxRect(ctx, 5, 9 + yOff, 6, 7, BASE);
      pxRect(ctx, 9, 9 + yOff, 2, 7, SHADE); // Right side shade
    }

    // HEAD
    pxRect(ctx, 3, 1 + yOff, 10, 8, OUTLINE);
    pxRect(ctx, 4, 2 + yOff, 8, 6, BASE);
    pxRect(ctx, 9, 2 + yOff, 3, 6, SHADE); // Right side shade

    // FACE / EYES (Only front and sides)
    if (dir === 0) { // Front
      pxRect(ctx, 5, 4 + yOff, 2, 2, OUTLINE); // L Eye
      pxRect(ctx, 9, 4 + yOff, 2, 2, OUTLINE); // R Eye
    } else if (dir === 1) { // Left
      pxRect(ctx, 4, 4 + yOff, 2, 2, OUTLINE); 
    } else if (dir === 2) { // Right
      pxRect(ctx, 10, 4 + yOff, 2, 2, OUTLINE);
    }
  });

  // --- OUTFIT LAYERS ---
  const drawTrenchcoat = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff'; // Tintable
    const SHADE = '#cccccc';
    const yOff = (frameNum !== 0) ? -1 : 0;
    
    if (dir === 0 || dir === 3) {
      pxRect(ctx, 3, 8 + yOff, 10, 11, OUTLINE);
      pxRect(ctx, 4, 9 + yOff, 8, 9, COLOR);
      pxRect(ctx, 10, 9 + yOff, 2, 9, SHADE);
      if (dir === 0) { // Open collar
        pxRect(ctx, 7, 9 + yOff, 2, 4, '#000000');
      }
    } else {
      pxRect(ctx, 4, 8 + yOff, 8, 11, OUTLINE);
      pxRect(ctx, 5, 9 + yOff, 6, 9, COLOR);
      pxRect(ctx, 9, 9 + yOff, 2, 9, SHADE);
    }
  };

  const drawVest = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff'; 
    const SHADE = '#cccccc';
    const yOff = (frameNum !== 0) ? -1 : 0;
    if (dir === 0 || dir === 3) {
      pxRect(ctx, 4, 8 + yOff, 8, 7, OUTLINE);
      pxRect(ctx, 5, 9 + yOff, 6, 5, COLOR);
      pxRect(ctx, 9, 9 + yOff, 2, 5, SHADE);
      if (dir === 0) { // Vest V-neck
        pxRect(ctx, 7, 9 + yOff, 2, 3, '#000000');
        pxRect(ctx, 7, 13 + yOff, 2, 1, '#110b0d'); // Button
      }
    } else {
      pxRect(ctx, 5, 8 + yOff, 6, 7, OUTLINE);
      pxRect(ctx, 6, 9 + yOff, 4, 5, COLOR);
    }
  };
  
  const drawCasual = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff'; 
    const SHADE = '#cccccc';
    const yOff = (frameNum !== 0) ? -1 : 0;
    if (dir === 0 || dir === 3) {
      pxRect(ctx, 3, 8 + yOff, 10, 7, OUTLINE);
      pxRect(ctx, 4, 9 + yOff, 8, 5, COLOR);
      pxRect(ctx, 10, 9 + yOff, 2, 5, SHADE);
    } else {
      pxRect(ctx, 4, 8 + yOff, 8, 7, OUTLINE);
      pxRect(ctx, 5, 9 + yOff, 6, 5, COLOR);
      pxRect(ctx, 9, 9 + yOff, 2, 5, SHADE);
    }
  };

  const drawSuit = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff'; 
    const SHADE = '#cccccc';
    const yOff = (frameNum !== 0) ? -1 : 0;
    
    // Suit jacket
    if (dir === 0 || dir === 3) {
      pxRect(ctx, 3, 8 + yOff, 10, 9, OUTLINE);
      pxRect(ctx, 4, 9 + yOff, 8, 7, COLOR);
      pxRect(ctx, 10, 9 + yOff, 2, 7, SHADE);
      if (dir === 0) { // Tie
        pxRect(ctx, 7, 9 + yOff, 2, 5, '#110b0d');
      }
    } else {
      pxRect(ctx, 4, 8 + yOff, 8, 9, OUTLINE);
      pxRect(ctx, 5, 9 + yOff, 6, 7, COLOR);
      pxRect(ctx, 9, 9 + yOff, 2, 7, SHADE);
    }
  };

  generateSpriteLayer('outfit_trenchcoat', drawTrenchcoat);
  generateSpriteLayer('outfit_vest', drawVest);
  generateSpriteLayer('outfit_casual', drawCasual);
  generateSpriteLayer('outfit_suit', drawSuit);
  generateSpriteLayer('outfit_none', () => {}); // Empty layer

  // --- HAIR LAYERS ---
  const drawHairShort = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff';
    const yOff = (frameNum !== 0) ? -1 : 0;
    if (dir === 0 || dir === 1 || dir === 2) {
      pxRect(ctx, 3, 0 + yOff, 10, 4, OUTLINE);
      pxRect(ctx, 4, 1 + yOff, 8, 2, COLOR);
    } else if (dir === 3) { // Back
      pxRect(ctx, 3, 0 + yOff, 10, 7, OUTLINE);
      pxRect(ctx, 4, 1 + yOff, 8, 5, COLOR);
    }
  };

  const drawHairSlicked = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff';
    const yOff = (frameNum !== 0) ? -1 : 0;
    pxRect(ctx, 2, 0 + yOff, 12, 4, OUTLINE);
    pxRect(ctx, 3, 1 + yOff, 10, 2, COLOR);
    if (dir === 3) {
      pxRect(ctx, 3, 3 + yOff, 10, 4, OUTLINE);
      pxRect(ctx, 4, 4 + yOff, 8, 2, COLOR);
    }
  };

  const drawHairBob = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff';
    const yOff = (frameNum !== 0) ? -1 : 0;
    pxRect(ctx, 2, 0 + yOff, 12, 8, OUTLINE);
    pxRect(ctx, 3, 1 + yOff, 10, 6, COLOR);
    // Cut out face for front
    if (dir === 0) pxRect(ctx, 4, 3 + yOff, 8, 6, 'rgba(0,0,0,0)'); // transparent cutout
  };
  
  const drawHairLong = (ctx, dir, frameNum) => {
    const COLOR = '#ffffff';
    const yOff = (frameNum !== 0) ? -1 : 0;
    pxRect(ctx, 2, 0 + yOff, 12, 10, OUTLINE);
    pxRect(ctx, 3, 1 + yOff, 10, 8, COLOR);
    if (dir === 0) { // Frame the face
      pxRect(ctx, 4, 3 + yOff, 8, 8, 'rgba(0,0,0,0)');
      pxRect(ctx, 2, 1 + yOff, 2, 10, OUTLINE); // Front side locks
      pxRect(ctx, 12, 1 + yOff, 2, 10, OUTLINE);
      pxRect(ctx, 3, 2 + yOff, 1, 8, COLOR);
      pxRect(ctx, 12, 2 + yOff, 1, 8, COLOR);
    }
  };

  generateSpriteLayer('hair_short', drawHairShort);
  generateSpriteLayer('hair_slicked', drawHairSlicked);


  // 2. Generate 36-Tile Spritesheet (256x192px = 8x6 grid of 32x32 tiles)
  if (!scene.textures.exists('mansion_tiles')) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    const drawTile = (index, drawFunc) => {
      const idx = index - 1; // 1-based to 0-based
      const tx = (idx % 8) * 32;
      const ty = Math.floor(idx / 8) * 32;
      ctx.save();
      ctx.translate(tx, ty);
      // Optional: fill a background or leave transparent
      drawFunc(ctx);
      ctx.restore();
    };

    // 1: FLOOR_WOOD_A
    drawTile(1, (c) => {
      c.fillStyle = '#8B5A2B'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#6e4722'; c.fillRect(0, 8, 32, 2); c.fillRect(0, 24, 32, 2);
    });
    // 2: FLOOR_WOOD_B
    drawTile(2, (c) => {
      c.fillStyle = '#8B5A2B'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#6e4722'; c.fillRect(0, 4, 16, 2); c.fillRect(16, 16, 16, 2);
    });
    // 3: FLOOR_WOOD_DARK
    drawTile(3, (c) => {
      c.fillStyle = '#3E2723'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#4E342E'; c.fillRect(4, 4, 12, 12); c.fillRect(20, 20, 8, 8);
    });
    // 4: FLOOR_CARPET_RED
    drawTile(4, (c) => {
      c.fillStyle = '#880E4F'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#C2185B'; c.fillRect(4, 4, 24, 24);
      c.fillStyle = '#E91E63'; c.fillRect(8, 8, 16, 16);
    });
    // 5: FLOOR_CARPET_GREEN
    drawTile(5, (c) => {
      c.fillStyle = '#1B5E20'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#2E7D32'; c.fillRect(4, 4, 24, 24);
    });
    // 6: FLOOR_TILE_BATH
    drawTile(6, (c) => {
      c.fillStyle = '#FAFAFA'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#E0E0E0';
      c.fillRect(0, 0, 16, 16); c.fillRect(16, 16, 16, 16);
    });
    // 7: FLOOR_STONE
    drawTile(7, (c) => {
      c.fillStyle = '#424242'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#212121'; c.fillRect(0, 0, 32, 2); c.fillRect(0, 0, 2, 32);
    });

    // 8: WALL_H
    drawTile(8, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(4, 12, 24, 8);
    });
    // 9: WALL_V
    drawTile(9, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(12, 4, 8, 24);
    });
    // 10: WALL_CORNER_NW
    drawTile(10, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(12, 12, 20, 8); c.fillRect(12, 12, 8, 20);
    });
    // 11: WALL_CORNER_NE
    drawTile(11, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(0, 12, 20, 8); c.fillRect(12, 12, 8, 20);
    });
    // 12: WALL_CORNER_SW
    drawTile(12, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(12, 12, 20, 8); c.fillRect(12, 0, 8, 20);
    });
    // 13: WALL_CORNER_SE
    drawTile(13, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(0, 12, 20, 8); c.fillRect(12, 0, 8, 20);
    });
    // 14: WALL_T_OPEN_E
    drawTile(14, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(12, 0, 8, 32); c.fillRect(12, 12, 20, 8);
    });
    // 15: WALL_T_OPEN_W
    drawTile(15, (c) => {
      c.fillStyle = '#292524'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#44403c'; c.strokeRect(0, 0, 32, 32); c.fillRect(12, 0, 8, 32); c.fillRect(0, 12, 12, 8);
    });
    // 16: WALL_TRIM
    drawTile(16, (c) => {
      c.fillStyle = '#1c1917'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#78716c'; c.fillRect(0, 0, 32, 8);
      c.fillStyle = '#44403c'; c.fillRect(0, 8, 32, 24);
    });

    // 17: DOOR_H
    drawTile(17, (c) => {
      c.fillStyle = '#1c1917'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#78716c'; c.fillRect(0, 24, 32, 8);
    });
    // 18: DOOR_V
    drawTile(18, (c) => {
      c.fillStyle = '#1c1917'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#78716c'; c.fillRect(24, 0, 8, 32);
    });

    // 19: BOOKSHELF_L
    drawTile(19, (c) => {
      c.fillStyle = '#5D4037'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#3E2723'; c.fillRect(2, 2, 30, 28);
      c.fillStyle = '#D7CCC8'; c.fillRect(6, 6, 4, 10); c.fillRect(12, 6, 8, 10); // Books
      c.fillStyle = '#A1887F'; c.fillRect(8, 20, 6, 8);
    });
    // 20: BOOKSHELF_R
    drawTile(20, (c) => {
      c.fillStyle = '#5D4037'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#3E2723'; c.fillRect(0, 2, 30, 28);
      c.fillStyle = '#A1887F'; c.fillRect(2, 6, 6, 10); c.fillRect(12, 18, 4, 10); // Books
    });
    // 21: DESK_L
    drawTile(21, (c) => {
      c.fillStyle = '#795548'; c.fillRect(4, 8, 28, 16);
      c.fillStyle = '#4E342E'; c.fillRect(6, 10, 24, 12); // Desk mat
    });
    // 22: DESK_R
    drawTile(22, (c) => {
      c.fillStyle = '#795548'; c.fillRect(0, 8, 28, 16);
      c.fillStyle = '#FAFAFA'; c.fillRect(4, 12, 8, 10); // Paper
      c.fillStyle = '#212121'; c.fillRect(20, 10, 4, 6); // Inkwell
    });
    // 23: BED_HEAD
    drawTile(23, (c) => {
      c.fillStyle = '#5D4037'; c.fillRect(4, 0, 24, 32); // Frame
      c.fillStyle = '#FFFFFF'; c.fillRect(6, 4, 20, 12); // Pillows
      c.fillStyle = '#B71C1C'; c.fillRect(6, 16, 20, 16); // Blanket
    });
    // 24: BED_FOOT
    drawTile(24, (c) => {
      c.fillStyle = '#5D4037'; c.fillRect(4, 0, 24, 28); // Frame
      c.fillStyle = '#B71C1C'; c.fillRect(6, 0, 20, 24); // Blanket
    });
    // 25: SINK
    drawTile(25, (c) => {
      c.fillStyle = '#BDBDBD'; c.fillRect(4, 4, 24, 16);
      c.fillStyle = '#E0E0E0'; c.fillRect(8, 8, 16, 10);
      c.fillStyle = '#757575'; c.fillRect(14, 4, 4, 4); // Faucet
    });
    // 26: SAFE
    drawTile(26, (c) => {
      c.fillStyle = '#616161'; c.fillRect(4, 4, 24, 24);
      c.fillStyle = '#424242'; c.fillRect(6, 6, 20, 20);
      c.fillStyle = '#9E9E9E'; c.beginPath(); c.arc(16, 16, 4, 0, 2*Math.PI); c.fill(); // Dial
    });
    // 27: CLOCK
    drawTile(27, (c) => {
      c.fillStyle = '#4E342E'; c.fillRect(8, 0, 16, 32);
      c.fillStyle = '#FFC107'; c.beginPath(); c.arc(16, 8, 4, 0, 2*Math.PI); c.fill(); // Face
      c.fillStyle = '#FFB300'; c.fillRect(15, 16, 2, 10); // Pendulum
    });
    // 28: FIREPLACE_L
    drawTile(28, (c) => {
      c.fillStyle = '#424242'; c.fillRect(0, 0, 32, 24);
      c.fillStyle = '#212121'; c.fillRect(8, 8, 24, 16);
      c.fillStyle = '#FF5722'; c.beginPath(); c.arc(24, 20, 6, 0, Math.PI); c.fill(); // Fire
    });
    // 29: FIREPLACE_R
    drawTile(29, (c) => {
      c.fillStyle = '#424242'; c.fillRect(0, 0, 32, 24);
      c.fillStyle = '#212121'; c.fillRect(0, 8, 24, 16);
      c.fillStyle = '#FF5722'; c.beginPath(); c.arc(8, 20, 6, 0, Math.PI); c.fill(); // Fire
    });
    // 30: TABLE
    drawTile(30, (c) => {
      c.fillStyle = '#6D4C41'; c.fillRect(2, 6, 28, 20);
      c.fillStyle = '#FAFAFA'; c.beginPath(); c.arc(16, 16, 6, 0, 2*Math.PI); c.fill(); // Plate
    });
    // 31: CHAIR_UP
    drawTile(31, (c) => {
      c.fillStyle = '#5D4037'; c.fillRect(8, 12, 16, 16);
      c.fillStyle = '#3E2723'; c.fillRect(8, 12, 16, 4); // Backrest
    });
    // 32: CHAIR_DOWN
    drawTile(32, (c) => {
      c.fillStyle = '#5D4037'; c.fillRect(8, 4, 16, 16);
      c.fillStyle = '#3E2723'; c.fillRect(8, 16, 16, 4); // Backrest
    });
    // 33: RUG_CENTER
    drawTile(33, (c) => {
      c.fillStyle = '#880E4F'; c.fillRect(0, 0, 32, 32);
      c.fillStyle = '#F48FB1'; c.fillRect(12, 12, 8, 8); // Pattern
    });
    // 34: PLANT
    drawTile(34, (c) => {
      c.fillStyle = '#795548'; c.fillRect(10, 20, 12, 12); // Pot
      c.fillStyle = '#2E7D32'; c.beginPath(); c.arc(16, 14, 10, 0, 2*Math.PI); c.fill(); // Leaves
    });
    // 35: WARDROBE
    drawTile(35, (c) => {
      c.fillStyle = '#4E342E'; c.fillRect(4, 0, 24, 32);
      c.fillStyle = '#3E2723'; c.fillRect(6, 2, 10, 28); c.fillRect(16, 2, 10, 28); // Doors
      c.fillStyle = '#FFC107'; c.fillRect(14, 16, 2, 4); c.fillRect(16, 16, 2, 4); // Handles
    });
    // 36: SHADOW
    drawTile(36, (c) => {
      c.fillStyle = 'rgba(0, 0, 0, 0.25)';
      c.fillRect(0, 0, 32, 32);
    });

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
