import { nanoid } from 'nanoid';
import { EVIDENCE_TYPES } from '../../constants/game.constants.js';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const EVIDENCE_TEMPLATES = [
  {
    name: 'Bloodstained Fabric',
    description: 'A torn piece of fabric stained with blood, found near the scene.',
    type: EVIDENCE_TYPES.BLOOD_SAMPLE,
    importance: 8,
  },
  {
    name: 'Fingerprint on Glass',
    description: 'A clear fingerprint lifted from a shattered glass near the body.',
    type: EVIDENCE_TYPES.FINGERPRINTS,
    importance: 6,
  },
  {
    name: 'CCTV Footage',
    description: 'Security camera recording showing movement around the time of death.',
    type: EVIDENCE_TYPES.CCTV,
    importance: 7,
  },
  {
    name: 'Phone Call Log',
    description: 'Recent call records showing multiple calls between victim and unknown number.',
    type: EVIDENCE_TYPES.PHONE_RECORDS,
    importance: 5,
  },
  {
    name: 'Personal Diary',
    description: 'A diary entry detailing the victim fears about someone close to them.',
    type: EVIDENCE_TYPES.DIARY,
    importance: 6,
  },
  {
    name: 'Threatening Letter',
    description: 'An unsigned letter threatening the victim, found in their coat pocket.',
    type: EVIDENCE_TYPES.LETTER,
    importance: 7,
  },
  {
    name: 'Photograph Evidence',
    description: 'A photograph showing the victim arguing with someone hours before the murder.',
    type: EVIDENCE_TYPES.PHOTOGRAPH,
    importance: 6,
  },
  {
    name: 'Footprint Cast',
    description: 'Footprints leading away from the scene, matching a specific shoe size.',
    type: EVIDENCE_TYPES.FOOTPRINTS,
    importance: 5,
  },
  {
    name: 'DNA Sample',
    description: 'DNA collected from under the victim fingernails belonging to an unknown person.',
    type: EVIDENCE_TYPES.DNA,
    importance: 9,
  },
  {
    name: 'Skeleton Key',
    description: 'A master key to the venue, found discarded near the scene.',
    type: EVIDENCE_TYPES.KEY,
    importance: 5,
  },
  {
    name: 'Receipt',
    description: 'A receipt showing purchase of a suspicious item earlier that day.',
    type: EVIDENCE_TYPES.RECEIPT,
    importance: 4,
  },
  {
    name: 'Murder Weapon',
    description: 'The weapon used in the crime, wiped clean of fingerprints.',
    type: EVIDENCE_TYPES.WEAPON,
    importance: 10,
  },
  {
    name: 'Email Correspondence',
    description: 'Printed emails revealing a heated exchange between victim and suspect.',
    type: EVIDENCE_TYPES.EMAIL,
    importance: 5,
  },
  {
    name: 'Tool Mark Analysis',
    description: 'A tool found near the scene that could have been used to stage the crime.',
    type: EVIDENCE_TYPES.TOOL,
    importance: 4,
  },
  {
    name: 'Witness Statement',
    description: 'A guest recalls seeing something unusual around the time of the murder.',
    type: EVIDENCE_TYPES.TESTIMONY,
    importance: 6,
  },
];

const EVIDENCE_LOCATIONS = {
  'The Mansion Murder': ['Library', 'Study', 'Conservatory', 'Grand Hall', 'Kitchen', 'Master Bedroom', 'Wine Cellar', 'Ballroom'],
  'The Coastal Conspiracy': ['Boathouse', 'Lighthouse', 'Inn Lobby', 'Guest Room', 'Coastal Path', 'Beach', 'Cellar'],
  'The Express Enigma': ['Sleeping Compartment', 'Dining Car', 'Corridor', 'Baggage Car', 'Lounge Car', 'Engine Room'],
  'The Masquerade Mystery': ['Dressing Room', 'Backstage', 'VIP Lounge', 'Grand Stage', 'Balcony', 'Costume Room'],
  'The Observatory Obscurity': ['Main Dome', 'Research Lab', 'Office', 'Living Quarters', 'Underground Vault', 'Rooftop Deck'],
  'The Art Heist Homicide': ['Main Gallery', 'Storage Vault', 'Restoration Room', 'Curator Office', 'Basement Archive'],
  'The Boardroom Betrayal': ['Executive Boardroom', 'CEO Office', 'Parking Garage', 'Server Room', 'Break Room'],
  'The Carnival Killing': ['Big Top Tent', 'Funhouse', 'Fortune Teller Booth', 'Dressing Tent', 'Storage Container'],
};

function getLocations(theme) {
  return EVIDENCE_LOCATIONS[theme] || ['Main Hall', 'Corridor', 'Garden', 'Guest Room', 'Basement'];
}

function generateEvidenceForCharacter(char, timeline, locations) {
  const template = pickRandom(EVIDENCE_TEMPLATES);
  const location = pickRandom(locations);
  const linkedTimeline = timeline.filter(t => t.actor === char.name);
  const linkedTimelineIds = linkedTimeline.map(t => t.eventId).slice(0, 2);

  return {
    evidenceId: null,
    name: template.name,
    description: template.description + ' Linked to ' + char.name + '.',
    type: template.type,
    location,
    discovered: false,
    discoveredBy: null,
    linkedCharacters: [char.name],
    linkedTimelineEvents: linkedTimelineIds,
    importance: char.isMurderer ? Math.min(template.importance + 2, 10) : template.importance,
    hidden: !char.isVictim && !char.isMurderer ? Math.random() < 0.4 : false,
  };
}

function ensureWeaponEvidence(evidenceItems, storyData, murderer, timeline) {
  const hasWeapon = evidenceItems.some(e => e.type === EVIDENCE_TYPES.WEAPON);
  if (!hasWeapon) {
    const murderEvent = timeline.find(t => t.actor === murderer.name && t.importance === 10);
    evidenceItems.push({
      evidenceId: null,
      name: 'The ' + storyData.murderWeapon,
      description: 'The ' + storyData.murderWeapon.toLowerCase() + ' used in the crime, found discarded.',
      type: EVIDENCE_TYPES.WEAPON,
      location: pickRandom(getLocations(storyData.theme)),
      discovered: false,
      discoveredBy: null,
      linkedCharacters: [murderer.name],
      linkedTimelineEvents: murderEvent ? [murderEvent.eventId] : [],
      importance: 10,
      hidden: false,
    });
  }
}

export function generateEvidence(characters, timeline, storyData) {
  const locations = getLocations(storyData.theme);
  const evidenceItems = [];
  const murderer = characters.find(c => c.isMurderer);

  characters.forEach(char => {
    if (char.isVictim) return;
    const itemCount = char.isMurderer ? 3 : 2;
    for (let i = 0; i < itemCount; i++) {
      evidenceItems.push(generateEvidenceForCharacter(char, timeline, locations));
    }
  });

  ensureWeaponEvidence(evidenceItems, storyData, murderer, timeline);

  evidenceItems.forEach((item, index) => {
    item.evidenceId = 'evid_' + (index + 1);
    
    // Configurable 30% chance for non-weapon clues to be red herrings
    if (item.type !== EVIDENCE_TYPES.WEAPON && Math.random() < 0.3) {
      item.isRedHerring = true;
    }
  });

  return evidenceItems;
}
