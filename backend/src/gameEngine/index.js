import { generateStory } from './story/story.service.js';
import { generateCharacters, assignCharactersToPlayers } from './characters/character.service.js';
import { generateRelationships } from './relationships/relationship.service.js';
import { generateTimeline } from './timeline/timeline.service.js';
import { generateEvidence } from './evidence/evidence.service.js';
import gameSessionService from './session/gameSession.service.js';
import gameStateService from './session/gameState.service.js';
import { GAME_PHASE, SESSION_STATUS } from '../constants/game.constants.js';
import { nanoid } from 'nanoid';

function generateId(prefix) {
  return prefix + '_' + nanoid(8);
}

class GameEngineService {
  async initializeGame(roomCode, players) {
    const storyData = generateStory();

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
      solution,
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

  async getGameSession(roomCode) {
    return gameSessionService.getSessionByRoomCode(roomCode);
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
