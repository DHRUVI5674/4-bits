import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    default: () => nanoid(10),
  },
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
  },
  isHost: {
    type: Boolean,
    default: false,
  },
  isReady: {
    type: Boolean,
    default: false,
  },
  isConnected: {
    type: Boolean,
    default: true,
  },
  socketId: {
    type: String,
    default: null,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  character: {
    name: String,
    background: String,
    objective: String,
    hiddenInfo: String,
    relationships: String,
    isMurderer: { type: Boolean, default: false }
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const gameSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(6).toUpperCase(),
  },
  name: {
    type: String,
    required: true,
    default: "Classified Case",
  },
  mode: {
    type: String,
    default: "classic_mansion",
  },
  status: {
    type: String,
    enum: ['waiting', 'started', 'ended'],
    default: 'waiting',
  },
  hostId: {
    type: String,
    required: true,
  },
  settings: {
    maxPlayers: {
      type: Number,
      default: 5,
    },
    minPlayers: {
      type: Number,
      default: 3,
    },
  },
  players: [playerSchema],
  gameState: {
    phase: {
      type: String,
      default: 'lobby',
    },
    mystery: {
      victim: String,
      location: String,
      solution: String,
      timeline: [Object],
      clues: [Object]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Automatically delete game after 24 hours
  },
}, { timestamps: true });

const Game = mongoose.model('Game', gameSchema);

export default Game;
