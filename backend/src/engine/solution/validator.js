class SolutionValidator {
  static validateInput(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Solution engine input must be an object');
  }

  static validateOutput(result) {
    if (!result || typeof result !== 'object') throw new Error('Solution engine must return an object');
    if (typeof result.culprit !== 'string') throw new Error('Solution.culprit must be a string');
    if (typeof result.method !== 'string') throw new Error('Solution.method must be a string');
    if (typeof result.explanation !== 'string') throw new Error('Solution.explanation must be a string');
  }
}

export default SolutionValidator;
