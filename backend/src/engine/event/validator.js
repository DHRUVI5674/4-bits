class EventValidator {
  static validateInput(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Event engine input must be an object');
  }

  static validateOutput(result) {
    if (!Array.isArray(result)) throw new Error('Event engine must return an array of events');
    for (const ev of result) {
      if (typeof ev !== 'object') throw new Error('Each event must be an object');
      if (typeof ev.time !== 'string') throw new Error('Event.time must be a string');
      if (typeof ev.description !== 'string') throw new Error('Event.description must be a string');
    }
  }
}

export default EventValidator;
