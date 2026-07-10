class NpcValidator {
  static validateInput(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('NPC engine input must be an object');
  }

  static validateOutput(result) {
    if (!Array.isArray(result)) throw new Error('NPC engine must return an array');
    for (const n of result) {
      if (typeof n !== 'object') throw new Error('Each NPC must be an object');
      if (typeof n.id !== 'string') throw new Error('NPC.id must be a string');
      if (typeof n.name !== 'string') throw new Error('NPC.name must be a string');
      if (typeof n.role !== 'string') throw new Error('NPC.role must be a string');
    }
  }
}

export default NpcValidator;
