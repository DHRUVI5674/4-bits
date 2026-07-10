class EventEngineService {
  constructor({ eventEngine }) {
    this.eventEngine = eventEngine;
  }

  async generateEvents(payload) {
    return this.eventEngine.generateEvents(payload);
  }
}

export default EventEngineService;
