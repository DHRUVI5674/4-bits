/**
 * Socket.IO Service
 * This will handle real-time events for the lobby and gameplay.
 */

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', (roomCode) => {
      socket.join(roomCode);
      console.log(`User ${socket.id} joined room ${roomCode}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
};
