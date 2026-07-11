import StoryEngine from '../engine/story/index.js';
import OllamaService from '../ai/ollama.service.js';
import { generateCharacters, assignCharactersToPlayers } from './characters/character.service.js';
import { generateRelationships } from './relationships/relationship.service.js';
import { generateTimeline } from './timeline/timeline.service.js';
import { generateEvidence } from './evidence/evidence.service.js';
import gameSessionService from './session/gameSession.service.js';
import gameStateService from './session/gameState.service.js';
import { GAME_PHASE, SESSION_STATUS } from '../constants/game.constants.js';
import { nanoid } from 'nanoid';
import Game from '../models/game.model.js';

const storyEngine = new StoryEngine({ aiClient: new OllamaService() });

function generateId(prefix) {
  return prefix + '_' + nanoid(8);
}

class GameEngineService {
  async initializeGame(roomCode, players) {
    const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
    const gameMode = game ? game.mode : 'classic_mansion';

    let storyData;
    let attempts = 2;

    while (attempts > 0) {
      try {
        console.log(`[GameEngine] Starting AI story generation for room ${roomCode}. Attempt: ${3 - attempts}`);
        storyData = await this.generateStory({ theme: gameMode, seed: roomCode, playerCount: players.length });
        
        // Validate mapConfig
        if (!storyData.mapConfig || !this.validateMapConfig(storyData.mapConfig)) {
          throw new Error('Invalid mapConfig structure in AI output');
        }

        console.log('[GameEngine] AI story generation and mapConfig succeeded.');
        break;
      } catch (error) {
        attempts--;
        console.error(`[GameEngine] AI story generation attempt failed: ${error.message}`);
        if (attempts === 0) {
          console.log('[GameEngine] Falling back to pre-designed template and story');
          storyData = this.generateFallbackStory(players.length, gameMode);
          storyData.mapConfig = this.getFallbackMapConfig(gameMode);
        }
      }
    }

    const charResult = generateCharacters(players.length, storyData);
    const characters = charResult.characters;
    const victim = charResult.victim;
    const murderer = charResult.murderer;
    const suspects = charResult.suspects.map(s => s.name);

    const { characters: assignedCharacters } = assignCharactersToPlayers(characters, players);

    const relationships = generateRelationships(assignedCharacters);

    const timeline = generateTimeline(assignedCharacters, storyData);

    const evidence = generateEvidence(assignedCharacters, timeline, storyData);

    assignedCharacters.forEach((char, index) => {
      char.characterId = 'char_' + (index + 1);
    });

    const murdererChar = assignedCharacters.find(c => c.isMurderer);
    const solution = {
      murdererId: murdererChar.characterId,
      weapon: storyData.murderWeapon,
      motive: storyData.motiveSummary,
      fullExplanation: this.buildFullExplanation(murdererChar, victim, storyData),
    };

    const suspectNames = suspects;
    const startText = `The scene is set in ${storyData.location}. A body lies cold on the floor: the victim is ${victim.name}, who met their end via "${storyData.causeOfDeath.toLowerCase()}" around ${storyData.timeOfDeath}. The suspects gathered here are: ${suspectNames.join(", ")}. Investigate the evidence, question the suspects, and work together to uncover the truth.`;
    
    const logs = [{
      messageId: 'msg_start',
      type: 'ai',
      author: 'Game Master',
      text: startText,
      createdAt: new Date()
    }];

    timeline.forEach(event => {
      logs.push({
        messageId: 'msg_timeline_' + event.eventId,
        type: 'ai',
        author: 'Game Master',
        text: `Timeline (${event.timestamp}): ${event.actor} ${event.action} at ${event.location}.`,
        createdAt: new Date()
      });
    });

    const seatAssignments = {};
    players.forEach((p, idx) => {
      seatAssignments[p.playerId] = idx;
    });

    const sessionData = {
      roomCode,
      status: SESSION_STATUS.SETUP,
      phase: GAME_PHASE.SETUP,
      theme: storyData.theme,
      location: storyData.location,
      victim: victim.name,
      murderer: murderer.name,
      murderWeapon: storyData.murderWeapon,
      causeOfDeath: storyData.causeOfDeath,
      timeOfDeath: storyData.timeOfDeath,
      motiveSummary: storyData.motiveSummary,
      suspects,
      characters: assignedCharacters,
      evidence,
      timeline,
      relationships,
      logs,
      solution,
      seatAssignments,
    };

    const session = await gameSessionService.createSession(sessionData);

    const playerAssignments = {};
    assignedCharacters.forEach(char => {
      if (char.playerId) {
        playerAssignments[char.playerId] = {
          characterId: char.characterId,
          name: char.name,
        };
      }
    });

    return {
      session,
      playerAssignments,
    };
  }

  buildFullExplanation(murderer, victim, storyData) {
    return [
      'The murderer is ' + murderer.name + ', the ' + murderer.occupation.toLowerCase() + '.',
      '',
      'Motive: ' + storyData.motiveSummary,
      '',
      'Method: ' + murderer.name + ' used the ' + storyData.murderWeapon.toLowerCase() + ' to commit the murder at ' + storyData.timeOfDeath + '.',
      '',
      'After the murder, ' + murderer.name + ' attempted to conceal their involvement by ' + this.getConcealmentMethod() + '.',
      '',
      'The crime was solved through the evidence collected and the testimonies gathered during the investigation.',
    ].join('\n');
  }

  getConcealmentMethod() {
    const methods = [
      'planting false evidence against another guest',
      'returning to the group to establish an alibi',
      'hiding the murder weapon in a secure location',
      'staging the scene to look like a burglary gone wrong',
      'attempting to frame a known rival of the victim',
    ];
    return methods[Math.floor(Math.random() * methods.length)];
  }

  async generateStory({ theme, seed, playerCount } = {}) {
    const response = await storyEngine.generateStory({ theme, seed, playerCount });
    return {
      theme: response.theme || theme || 'Murder Mystery',
      location: response.location,
      timeOfDeath: response.timeOfDeath,
      murderWeapon: response.murderWeapon,
      causeOfDeath: response.causeOfDeath,
      motiveSummary: response.motiveSummary,
      victim: response.victim,
      murderer: response.murderer,
      storySeed: response.storySeed || seed,
      world: response.world,
      crime: response.crime,
      victimCharacter: response.victimCharacter,
      suspects: response.suspects,
    };
  }

  generateFallbackStory(playerCount = 3, gameMode = 'classic_mansion') {
    let fallback = this.constructor.FALLBACK_STORIES.find(s => {
      if (gameMode === 'classic_mansion' && s.theme.toLowerCase().includes('mansion')) return true;
      if (gameMode === 'cyber_crime' && s.theme.toLowerCase().includes('conspiracy')) return true;
      if (gameMode === 'haunted_house' && s.theme.toLowerCase().includes('enigma')) return true;
      return false;
    });
    if (!fallback) {
      fallback = this.constructor.FALLBACK_STORIES[Math.floor(Math.random() * this.constructor.FALLBACK_STORIES.length)];
    }
    
    const victimCharacter = {
      name: fallback.victim,
      age: 55,
      occupation: 'Wealthy Aristocrat',
      personality: 'Dignified but arrogant',
      publicBackground: 'Owner of the estate, known for eccentric demands.',
      privateSecret: 'Was hiding a massive family secret that could ruin them.',
      objective: 'Rest in peace.',
      inventory: ['Gold pocket watch', 'Will draft'],
      alibi: 'Deceased',
      motive: 'None'
    };

    const suspects = [];
    // Murderer suspect
    suspects.push({
      name: fallback.murderer,
      age: 34,
      occupation: 'Disinherited Heir',
      personality: 'Greedy and impatient',
      publicBackground: 'Next in line for the fortune, frequently seen arguing with the victim.',
      privateSecret: 'IS THE MURDERER. Has forged the new inheritance will.',
      objective: 'Clear your name and inherit the fortune.',
      inventory: ['Silver lighter', 'Intricate key'],
      alibi: 'Was alone in the library during the incident.',
      motive: 'Stood to lose the entire inheritance.',
      isMurderer: true
    });

    // Other suspects
    const occupations = ['Family Doctor', 'Steward', 'Socialite Guest', 'Confidential Secretary'];
    for (let i = 1; i < playerCount; i++) {
      suspects.push({
        name: `Guest ${i}`,
        age: 28 + i * 5,
        occupation: occupations[i - 1] || 'Guest',
        personality: 'Nervous and secretive',
        publicBackground: 'A close acquaintance of the victim with hidden ties.',
        privateSecret: 'Has been secretly blackmailing the victim for years.',
        objective: 'Discover the truth while hiding your blackmails.',
        inventory: ['Lace handkerchief', 'Unopened letter'],
        alibi: 'Was resting in their guest chambers.',
        motive: 'The victim was about to cut them off.',
        isMurderer: false
      });
    }

    return {
      theme: fallback.theme,
      location: fallback.location,
      timeOfDeath: fallback.timeOfDeath,
      murderWeapon: fallback.murderWeapon,
      causeOfDeath: fallback.causeOfDeath,
      motiveSummary: fallback.motiveSummary,
      victim: fallback.victim,
      murderer: fallback.murderer,
      storySeed: 'fallback',
      world: '',
      crime: '',
      victimCharacter,
      suspects
    };
  }

  static get FALLBACK_STORIES() {
    return [
      {
        theme: 'The Mansion Murder',
        location: 'Blackwood Manor',
        timeOfDeath: '11:45 PM',
        murderWeapon: 'Antique Letter Opener',
        causeOfDeath: 'Stabbed through the heart',
        motiveSummary: 'The victim was about to disinherit the murderer, who stood to lose everything.',
        victim: 'Lord Blackwood',
        murderer: 'Evelyn Blackwood',
      },
      {
        theme: 'The Coastal Conspiracy',
        location: 'Seagull Harbor Inn',
        timeOfDeath: '3:20 AM',
        murderWeapon: 'Shipmate\'s Anchor Pin',
        causeOfDeath: 'Blunt force trauma to the head',
        motiveSummary: 'The murderer discovered the victim was responsible for a shipping scam that ruined their family.',
        victim: 'Captain Ward',
        murderer: 'Olivia Kane',
      },
      {
        theme: 'The Express Enigma',
        location: 'Orient Express Car No. 7',
        timeOfDeath: '2:15 AM',
        murderWeapon: 'Silk Strangling Cord',
        causeOfDeath: 'Strangulation',
        motiveSummary: 'The victim was a blackmailer who threatened to expose the murderer\'s darkest secret.',
        victim: 'Dr. Moreau',
        murderer: 'Celeste Dubois',
      },
      {
        theme: 'The Masquerade Mystery',
        location: 'Rosewood Opera House',
        timeOfDeath: '10:30 PM',
        murderWeapon: 'Poisoned Champagne',
        causeOfDeath: 'Cyanide poisoning',
        motiveSummary: 'The victim had stolen credit for the murderer\'s life\'s work, destroying their career.',
        victim: 'Madame Sable',
        murderer: 'Victor North',
      },
      {
        theme: 'The Carnival Killing',
        location: 'Midnight Circus Big Top',
        timeOfDeath: '12:00 AM',
        murderWeapon: 'Juggling Club',
        causeOfDeath: 'Blunt force trauma',
        motiveSummary: 'The victim had sabotaged the murderer\'s trapeze equipment years ago, causing a crippling fall.',
        victim: 'Seraphina Vale',
        murderer: 'Barnaby Cole',
      },
    ];
  }

  async getGameSession(roomCode) {
    return gameSessionService.getSessionByRoomCode(roomCode);
  }

  validateMapConfig(mapConfig) {
    if (!mapConfig || typeof mapConfig !== 'object') return false;
    if (!Array.isArray(mapConfig.rooms) || mapConfig.rooms.length === 0) return false;
    if (!Array.isArray(mapConfig.cluePlacements) || mapConfig.cluePlacements.length === 0) return false;
    if (!Array.isArray(mapConfig.suspectSpawns) || mapConfig.suspectSpawns.length === 0) return false;

    for (const room of mapConfig.rooms) {
      if (typeof room.name !== 'string' || typeof room.x !== 'number' || typeof room.y !== 'number' || typeof room.width !== 'number' || typeof room.height !== 'number') {
        return false;
      }
    }

    for (const placement of mapConfig.cluePlacements) {
      if (typeof placement.clueName !== 'string' || typeof placement.itemName !== 'string' || typeof placement.x !== 'number' || typeof placement.y !== 'number') {
        return false;
      }
    }

    for (const spawn of mapConfig.suspectSpawns) {
      if (typeof spawn.suspectName !== 'string' || typeof spawn.x !== 'number' || typeof spawn.y !== 'number') {
        return false;
      }
    }

    return true;
  }

  getFallbackMapConfig(gameMode) {
    const templates = {
      classic_mansion: {
        rooms: [
          { name: "Foyer", x: 2, y: 2, width: 12, height: 12 },
          { name: "Library", x: 16, y: 2, width: 15, height: 12 },
          { name: "Lounge", x: 33, y: 2, width: 15, height: 12 },
          { name: "Dining Room", x: 2, y: 16, width: 18, height: 20 },
          { name: "Study", x: 22, y: 16, width: 26, height: 20 }
        ],
        cluePlacements: [
          { clueName: "Antique Letter Opener", itemName: "Desk", x: 200, y: 150 },
          { clueName: "Stained Wine Glass", itemName: "Coffee Table", x: 600, y: 150 },
          { clueName: "Torn Will", itemName: "Safe", x: 1200, y: 150 },
          { clueName: "Journal Entry", itemName: "Bookshelf", x: 1200, y: 700 },
          { clueName: "Footprints", itemName: "Fireplace", x: 250, y: 750 },
          { clueName: "Poison Vial", itemName: "Waste Basket", x: 750, y: 750 }
        ],
        suspectSpawns: [
          { suspectName: "Evelyn Blackwood", x: 250, y: 200 },
          { suspectName: "Lord Blackwood", x: 650, y: 200 },
          { suspectName: "Guest 1", x: 1100, y: 200 },
          { suspectName: "Guest 2", x: 1400, y: 200 }
        ]
      },
      cyber_crime: {
        rooms: [
          { name: "Server Room", x: 2, y: 2, width: 14, height: 14 },
          { name: "Control Center", x: 18, y: 2, width: 14, height: 14 },
          { name: "Breakroom", x: 34, y: 2, width: 14, height: 14 },
          { name: "Main Office", x: 2, y: 18, width: 22, height: 18 },
          { name: "Executive Suite", x: 26, y: 18, width: 22, height: 18 }
        ],
        cluePlacements: [
          { clueName: "Decrypted Flash Drive", itemName: "Laptop", x: 250, y: 200 },
          { clueName: "Altered Log File", itemName: "Server Rack", x: 650, y: 200 },
          { clueName: "Discarded Keycard", itemName: "Waste Basket", x: 1200, y: 200 },
          { clueName: "Threatening Message", itemName: "Desk", x: 400, y: 750 },
          { clueName: "Security Footage", itemName: "CCTV Terminal", x: 1000, y: 750 }
        ],
        suspectSpawns: [
          { suspectName: "Olivia Kane", x: 300, y: 250 },
          { suspectName: "Captain Ward", x: 700, y: 250 },
          { suspectName: "Guest 1", x: 1200, y: 250 },
          { suspectName: "Guest 2", x: 400, y: 800 }
        ]
      },
      haunted_house: {
        rooms: [
          { name: "Great Hall", x: 2, y: 2, width: 16, height: 12 },
          { name: "Conservatory", x: 20, y: 2, width: 14, height: 12 },
          { name: "Attic Access", x: 36, y: 2, width: 12, height: 12 },
          { name: "Parlor", x: 2, y: 16, width: 22, height: 20 },
          { name: "Basement Stairs", x: 26, y: 16, width: 22, height: 20 }
        ],
        cluePlacements: [
          { clueName: "Strange Talisman", itemName: "Chest", x: 300, y: 200 },
          { clueName: "Ritual Dagger", itemName: "Altar", x: 700, y: 200 },
          { clueName: "Spilled Salt", itemName: "Fireplace", x: 1200, y: 200 },
          { clueName: "Old Diary", itemName: "Bookshelf", x: 400, y: 750 },
          { clueName: "Cold Spot", itemName: "Rug", x: 1000, y: 750 }
        ],
        suspectSpawns: [
          { suspectName: "Victor North", x: 300, y: 250 },
          { suspectName: "Madame Sable", x: 700, y: 250 },
          { suspectName: "Guest 1", x: 1200, y: 250 },
          { suspectName: "Guest 2", x: 400, y: 800 }
        ]
      }
    };
    return templates[gameMode] || templates.classic_mansion;
  }

  async getPlayerCharacter(roomCode, playerId) {
    return gameSessionService.getCharacterForPlayer(roomCode, playerId);
  }

  async getSessionPublicStory(roomCode) {
    const session = await this.getGameSession(roomCode);
    return gameSessionService.toPublicStory(session);
  }

  async getInvestigatorSummary(roomCode) {
    const session = await this.getGameSession(roomCode);
    return gameSessionService.toInvestigatorSummary(session);
  }

  async deleteSession(roomCode) {
    return gameSessionService.deleteSession(roomCode);
  }
}

export default new GameEngineService();
