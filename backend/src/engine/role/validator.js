/*
  role/validator.js
  Validates inputs to the Role Engine and ensures the output shape.
*/

const OUTPUT_KEYS = [
  'id', 'name', 'occupation', 'background', 'objective', 'secret', 'inventory', 'knownClues', 'motive', 'alibi', 'isMurderer'
];

class RoleValidator {
  static validateInput(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Role engine input must be an object');
    }

    if (payload.playerName != null && typeof payload.playerName !== 'string') {
      throw new Error('playerName must be a string');
    }
  }

  static validateOutput(result) {
    if (!result || typeof result !== 'object') {
      throw new Error('Role engine response must be an object');
    }

    for (const key of OUTPUT_KEYS) {
      if (!(key in result)) {
        throw new Error(`Missing required role field: ${key}`);
      }
    }

    if (!Array.isArray(result.inventory)) throw new Error('inventory must be an array');
    if (!Array.isArray(result.knownClues)) throw new Error('knownClues must be an array');
    if (typeof result.isMurderer !== 'boolean') throw new Error('isMurderer must be boolean');
  }
}

export default RoleValidator;
