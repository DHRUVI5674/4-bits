/*
  story/service.js
  Story engine module service.
  It exists to keep the engine API separate from application orchestration.
*/

class StoryModuleService {
  constructor({ storyEngine }) {
    this.storyEngine = storyEngine;
  }

  async generate({ theme, seed }) {
    return this.storyEngine.generateStory({ theme, seed });
  }
}

export default StoryModuleService;
