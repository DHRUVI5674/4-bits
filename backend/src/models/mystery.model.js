import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const characterSchema = new mongoose.Schema({
  characterId: {
    type: String,
    required: true,
    default: () => nanoid(10),
  },
  name: String,
  age: Number,
  occupation: String,
  personality: [String],
  background: String,
  appearance: String,
  relationshipToVictim: String,
  alibi: String,
  motive: String,
  secretMotive: String,
  secretInfo: String,
  isMurderer: { type: Boolean, default: false },
  playerId: { type: String, default: null },
  isRevealed: { type: Boolean, default: false },
});

const locationSchema = new mongoose.Schema({
  locationId: {
    type: String,
    required: true,
    default: () => nanoid(8),
  },
  name: String,
  description: String,
  connections: [String],
});

const weaponSchema = new mongoose.Schema({
  weaponId: {
    type: String,
    required: true,
    default: () => nanoid(8),
  },
  name: String,
  description: String,
  initialLocationId: String,
  currentLocationId: String,
  isMurderWeapon: { type: Boolean, default: false },
});

const timelineEntrySchema = new mongoose.Schema({
  timeId: {
    type: String,
    required: true,
    default: () => nanoid(8),
  },
  timeSlot: String,
  event: String,
  locationId: String,
  characterId: String,
  isPublic: { type: Boolean, default: false },
  actualEvent: String,
  isAlibi: { type: Boolean, default: false },
});

const clueSchema = new mongoose.Schema({
  clueId: {
    type: String,
    required: true,
    default: () => nanoid(8),
  },
  description: String,
  type: {
    type: String,
    enum: ['physical', 'testimony', 'digital', 'circumstantial'],
    default: 'physical',
  },
  locationId: String,
  characterId: String,
  relatedCharacterId: String,
  phaseRevealed: {
    type: String,
    enum: ['early', 'mid', 'late'],
    default: 'early',
  },
  isRedHerring: { type: Boolean, default: false },
  isCritical: { type: Boolean, default: false },
  discoveredByPlayerId: { type: String, default: null },
  discoveredAt: { type: Date, default: null },
  searchDifficulty: { type: Number, default: 1 },
});

const mysterySchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  victim: {
    name: String,
    description: String,
    background: String,
  },
  solution: {
    murdererId: { type: String, required: true },
    locationId: { type: String, required: true },
    weaponId: { type: String, required: true },
    motive: { type: String, required: true },
    timeOfDeath: { type: String, required: true },
    fullStory: String,
  },
  characters: [characterSchema],
  locations: [locationSchema],
  weapons: [weaponSchema],
  timeline: [timelineEntrySchema],
  clues: [clueSchema],
  totalClueCount: { type: Number, default: 0 },
  discoveredClueCount: { type: Number, default: 0 },
  currentPhase: {
    type: String,
    enum: ['investigation_early', 'investigation_mid', 'investigation_late', 'accusation', 'voting', 'reveal'],
    default: 'investigation_early',
  },
  phaseStartTime: { type: Date, default: Date.now },
  isGenerated: { type: Boolean, default: false },
}, { timestamps: true });

mysterySchema.index({ gameId: 1 });

const Mystery = mongoose.model('Mystery', mysterySchema);

export default Mystery;
