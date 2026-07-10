/*
  clue/validator.js
  Validates inputs and output structure for clue engine.
*/

class ClueValidator {
  static validateInput(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Clue engine input must be an object');
    }
  }

  static validateOutput(result) {
    if (!Array.isArray(result)) {
      throw new Error('Clue engine must return an array of clues');
    }

    for (const clue of result) {
      if (typeof clue !== 'object') throw new Error('Each clue must be an object');
      if (typeof clue.id !== 'string') throw new Error('Clue.id must be a string');
      if (typeof clue.text !== 'string') throw new Error('Clue.text must be a string');
      if (typeof clue.location !== 'string') throw new Error('Clue.location must be a string');
      if (clue.evidenceRefs != null && !Array.isArray(clue.evidenceRefs)) {
        // allow string or single value; caller will normalize to array before saving
        continue;
      }
    }
  }
}

export default ClueValidator;
