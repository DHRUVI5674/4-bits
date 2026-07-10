class SolutionEngineService {
  constructor({ solutionEngine }) {
    this.solutionEngine = solutionEngine;
  }

  async generateSolution(payload) {
    return this.solutionEngine.generateSolution(payload);
  }
}

export default SolutionEngineService;
