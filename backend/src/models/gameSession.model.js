import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { SESSION_STATUS, GAME_PHASE, RELATIONSHIP_TYPES, EVIDENCE_TYPES, VISIBILITY } from '../constants/game.constants.js';

const relationshipSchema = new mongoose.Schema({
  sourceCharacter: { type: String, required: true },
  targetCharacter: { type: String, required: true },
  relationshipType: {
    type: String,
    enum: Object.values(RELATIONSHIP_TYPES),
    required: true,
  },
  description: { type: String, required: true },
  visibility: {
    type: String,
    enum: Object.values(VISIBILITY),
    default: VISIBILITY.PUBLIC,
  },
  importance: { type: Number, default: 1, min: 1, max: 10 },
}, { _id: false });

const timelineEventSchema = new mongoose.Schema({
  eventId: { type: String, default: () => nanoid(10) },
  timestamp: { type: String, required: true },
  location: { type: String, required: true },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  witnesses: [{ type: String }],
  importance: { type: Number, default: 1, min: 1, max: 10 },
  hidden: { type: Boolean, default: false },
  relatedEvidence: [{ type: String }],
}, { _id: false });

const evidenceSchema = new mongoose.Schema({
  evidenceId: { type: String, default: () => nanoid(10) },
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: Object.values(EVIDENCE_TYPES),
    required: true,
  },
  location: { type: String, required: true },
  discovered: { type: Boolean, default: false },
  discoveredBy: { type: String, default: null },
  linkedCharacters: [{ type: String }],
  linkedTimelineEvents: [{ type: String }],
  importance: { type: Number, default: 1, min: 1, max: 10 },
  hidden: { type: Boolean, default: false },
  isRedHerring: { type: Boolean, default: false },
}, { _id: false });

const characterSchema = new mongoose.Schema({
  characterId: { type: String, default: () => nanoid(10) },
  playerId: { type: String, default: null },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  occupation: { type: String, required: true },
  personality: { type: String, required: true },
  publicBackground: { type: String, required: true },
  privateSecret: { type: String, default: '' },
  objective: { type: String, default: '' },
  inventory: [{ type: String }],
  alibi: { type: String, default: '' },
  motive: { type: String, default: '' },
  knownClues: [{ type: String }],
  relationships: [relationshipSchema],
  isMurderer: { type: Boolean, default: false },
  isVictim: { type: Boolean, default: false },
  suspicionScore: { type: Number, default: 0 },
  actionsRemaining: { type: Number, default: 3 },
  emergencyMeetingsRemaining: { type: Number, default: 1 },
}, { _id: false });

const logMessageSchema = new mongoose.Schema({
  messageId: { type: String, default: () => nanoid(10) },
  type: { type: String, enum: ['player', 'ai'], required: true },
  author: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const voteSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  suspectName: { type: String, required: true },
  votedAt: { type: Date, default: Date.now }
}, { _id: false });

const gameSessionSchema = new mongoose.Schema({
  gameId: {
    type: String,
    default: () => nanoid(12),
    unique: true,
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.SETUP,
  },
  phase: {
    type: String,
    enum: Object.values(GAME_PHASE),
    default: GAME_PHASE.SETUP,
  },

  theme: { type: String, required: true },
  location: { type: String, required: true },

  victim: { type: String, required: true },
  murderer: { type: String, required: true },
  murderWeapon: { type: String, required: true },
  causeOfDeath: { type: String, required: true },
  timeOfDeath: { type: String, required: true },
  motiveSummary: { type: String, default: '' },

  suspects: [{ type: String }],
  characters: [characterSchema],
  evidence: [evidenceSchema],
  timeline: [timelineEventSchema],
  relationships: [relationshipSchema],
  logs: [logMessageSchema],
  votes: [voteSchema],
  finalReveal: { type: String, default: '' },
  roundNumber: { type: Number, default: 1 },
  roundTimerEnd: { type: Date, default: null },
  discussionTimerEnd: { type: Date, default: null },
  mapConfig: { type: Object, default: null },
  seatAssignments: {
    type: Map,
    of: Number,
    default: () => new Map(),
  },
  votingState: {
    round: { type: Number, default: 0 },
    votes: {
      type: Map,
      of: String,
      default: () => new Map(),
    },
    resolved: { type: Boolean, default: false },
    eliminatedId: { type: String, default: null },
  },
  voiceParticipants: {
    type: Map,
    of: Boolean,
    default: () => new Map(),
  },

  solution: {
    murdererId: { type: String, required: true },
    weapon: { type: String, required: true },
    motive: { type: String, required: true },
    fullExplanation: { type: String, required: true },
  },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('GameSession', gameSessionSchema);
