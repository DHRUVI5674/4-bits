class NpcEngineService {
  constructor({ npcEngine }) {
    this.npcEngine = npcEngine;
  }

  async generateNpcs(payload) {
    return this.npcEngine.generateNpcs(payload);
  }
}

export default NpcEngineService;
