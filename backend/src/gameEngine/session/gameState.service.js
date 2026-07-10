import { GAME_PHASE, SESSION_STATUS } from '../../constants/game.constants.js';
import AppError from '../../utils/appError.js';

const PHASE_TRANSITIONS = {
  [GAME_PHASE.LOBBY]: [GAME_PHASE.SETUP],
  [GAME_PHASE.SETUP]: [GAME_PHASE.INVESTIGATION],
  [GAME_PHASE.INVESTIGATION]: [GAME_PHASE.DISCUSSION],
  [GAME_PHASE.DISCUSSION]: [GAME_PHASE.VOTING],
  [GAME_PHASE.VOTING]: [GAME_PHASE.REVEAL],
  [GAME_PHASE.REVEAL]: [GAME_PHASE.ENDED],
  [GAME_PHASE.ENDED]: [],
};

class GameStateService {
  canTransition(currentPhase, targetPhase) {
    const allowedTransitions = PHASE_TRANSITIONS[currentPhase];
    if (!allowedTransitions) return false;
    return allowedTransitions.includes(targetPhase);
  }

  validateTransition(currentPhase, targetPhase) {
    if (!this.canTransition(currentPhase, targetPhase)) {
      throw new AppError(
        'Cannot transition from ' + currentPhase + ' to ' + targetPhase,
        400
      );
    }
    return true;
  }

  getDefaultState() {
    return {
      status: SESSION_STATUS.SETUP,
      phase: GAME_PHASE.SETUP,
    };
  }

  isPlayable(phase) {
    const playablePhases = [
      GAME_PHASE.SETUP,
      GAME_PHASE.INVESTIGATION,
      GAME_PHASE.DISCUSSION,
      GAME_PHASE.VOTING,
    ];
    return playablePhases.includes(phase);
  }

  isTerminal(phase) {
    return phase === GAME_PHASE.ENDED;
  }

  requiresAction(phase) {
    return phase === GAME_PHASE.VOTING;
  }
}

export default new GameStateService();
