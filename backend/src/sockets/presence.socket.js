import * as gameService from '../services/game.service.js';
import { SOCKET_EVENTS } from '../constants/socket.events.js';

/**
 * @file presence.socket.js
 * @description Handles heartbeats and connection monitoring.
 */
const presenceHandler = (io, socket) => {
  /**
   * Updates lastSeen and returns acknowledgement.
   */
  const handleHeartbeat = async () => {
    try {
      await gameService.handleHeartbeat(socket.id);
      socket.emit(SOCKET_EVENTS.HEARTBEAT_ACK, { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error(`[Presence] Heartbeat error for ${socket.id}:`, error.message);
    }
  };

  socket.on(SOCKET_EVENTS.HEARTBEAT, handleHeartbeat);
};

export default presenceHandler;
