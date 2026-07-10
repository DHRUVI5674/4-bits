/*
  clue/service.js
  Thin wrapper exposing engine functionality for application services to use.
*/

class ClueEngineService {
  constructor({ clueEngine }) {
    this.clueEngine = clueEngine;
  }

  async generateClues(payload) {
    return this.clueEngine.generateClues(payload);
  }
}

export default ClueEngineService;
