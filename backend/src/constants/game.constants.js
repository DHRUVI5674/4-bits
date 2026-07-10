export const GAME_STATUS = {
  WAITING: 'waiting',
  STARTED: 'started',
  ENDED: 'ended',
};

export const GAME_PHASE = {
  WAITING: 'waiting',
  ROLE_ASSIGNMENT: 'role_assignment',
  INTRODUCTION: 'introduction',
  INVESTIGATION: 'investigation',
  DISCUSSION: 'discussion',
  VOTING: 'voting',
  RESULT: 'result',
  FINISHED: 'finished',
};

export const SESSION_STATUS = {
  SETUP: 'setup',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const PLAYER_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
};

export const EVIDENCE_TYPES = {
  WEAPON: 'weapon',
  FINGERPRINTS: 'fingerprints',
  BLOOD_SAMPLE: 'blood_sample',
  CCTV: 'cctv',
  PHONE_RECORDS: 'phone_records',
  DIARY: 'diary',
  EMAIL: 'email',
  PHOTOGRAPH: 'photograph',
  FOOTPRINTS: 'footprints',
  DNA: 'dna',
  KEY: 'key',
  RECEIPT: 'receipt',
  LETTER: 'letter',
  TOOL: 'tool',
  TESTIMONY: 'testimony',
};

export const RELATIONSHIP_TYPES = {
  FRIEND: 'friend',
  ENEMY: 'enemy',
  FAMILY: 'family',
  COWORKER: 'coworker',
  BUSINESS_PARTNER: 'business_partner',
  ROMANTIC_PARTNER: 'romantic_partner',
  BLACKMAIL: 'blackmail',
  DEBT: 'debt',
  HIDDEN_CONNECTION: 'hidden_connection',
  MENTOR: 'mentor',
  RIVAL: 'rival',
};

export const VISIBILITY = {
  PUBLIC: 'public',
  HIDDEN: 'hidden',
  DISCOVERED: 'discovered',
};
