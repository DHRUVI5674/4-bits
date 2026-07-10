/*
  timeline/service.js
  Thin wrapper for the Timeline Engine.
*/

class TimelineEngineService {
  constructor({ timelineEngine }) {
    this.timelineEngine = timelineEngine;
  }

  async generate(payload) {
    return this.timelineEngine.generateTimeline(payload);
  }
}

export default TimelineEngineService;
