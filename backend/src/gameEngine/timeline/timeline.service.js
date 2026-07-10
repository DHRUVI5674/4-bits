import { nanoid } from 'nanoid';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const LOCATIONS_BY_THEME = {
  'The Mansion Murder': [
    'Grand Foyer', 'Dining Hall', 'Library', 'Kitchen', 'Conservatory',
    'East Wing Corridor', 'Master Bedroom', 'Wine Cellar', 'Study', 'Ballroom',
  ],
  'The Coastal Conspiracy': [
    'Harbor Dock', 'Inn Lobby', 'Coastal Path', 'Boathouse', 'Lighthouse',
    'Inn Kitchen', 'Guest Room 7', 'Rooftop Terrace', 'Cellar', 'Beach',
  ],
  'The Express Enigma': [
    'Dining Car', 'Sleeping Compartment', 'Observatory Car', 'Conductor\'s Cabin',
    'Baggage Car', 'Lounge Car', 'Corridor', 'Smoking Room', 'Kitchen Car', 'Engine Room',
  ],
  'The Masquerade Mystery': [
    'Grand Stage', 'VIP Lounge', 'Dressing Room', 'Orchestra Pit', 'Balcony',
    'Box Seat 4', 'Backstage Area', 'Costume Room', 'Bar', 'Roof Garden',
  ],
  'The Observatory Obscurity': [
    'Main Dome', 'Telescope Platform', 'Research Lab', 'Office', 'Library',
    'Living Quarters', 'Cafeteria', 'Underground Vault', 'Rooftop Deck', 'Generator Room',
  ],
  'The Art Heist Homicide': [
    'Main Gallery', 'East Wing Exhibit', 'Storage Vault', 'Curator\'s Office', 'Restoration Room',
    'Café', 'Loading Dock', 'Security Office', 'Rooftop Garden', 'Basement Archive',
  ],
  'The Boardroom Betrayal': [
    'Executive Boardroom', 'CEO Office', 'Accounting Department', 'Parking Garage', 'Rooftop Helipad',
    'Break Room', 'Server Room', 'Lobby', 'Conference Room B', 'Stairwell',
  ],
  'The Carnival Killing': [
    'Big Top Tent', 'Funhouse', 'Ferris Wheel Platform', 'Animal Tent', 'Fortune Teller\'s Booth',
    'Trailer Park', 'Ticket Booth', 'Food Court', 'Dressing Tent', 'Storage Container',
  ],
};

const GENERIC_LOCATIONS = [
  'Main Hall', 'Garden Path', 'Guest Room', 'Corridor', 'Pantry',
  'Balcony', 'Courtyard', 'Basement', 'Attic', 'Garage',
];

function getLocations(theme) {
  return LOCATIONS_BY_THEME[theme] || GENERIC_LOCATIONS;
}

function generateTimelineEvents(characters, storyData) {
  const victim = characters.find(c => c.isVictim);
  const murderer = characters.find(c => c.isMurderer);
  const suspects = characters.filter(c => !c.isVictim && !c.isMurderer);
  const locations = getLocations(storyData.theme);

  const events = [];
  let eventIdCounter = 0;

  function addEvent(timestamp, location, actor, action, options = {}) {
    eventIdCounter++;
    events.push({
      eventId: `evt_${eventIdCounter}`,
      timestamp,
      location,
      actor,
      action,
      witnesses: options.witnesses || [],
      importance: options.importance || 3,
      hidden: options.hidden || false,
      relatedEvidence: options.relatedEvidence || [],
    });
    return events[events.length - 1];
  }

  addEvent('6:00 PM', pickRandom(locations), 'Multiple', 'Guests begin arriving at the venue.', {
    importance: 1,
  });

  addEvent('7:00 PM', pickRandom(locations), 'Multiple', 'Dinner is served. All guests are present.', {
    importance: 2,
  });

  addEvent('8:00 PM', pickRandom(locations), victim.name, `${victim.name} is seen in high spirits, conversing with guests.`, {
    importance: 2,
  });

  const suspect1 = pickRandom(suspects);
  addEvent('8:30 PM', pickRandom(locations), suspect1.name, `${suspect1.name} is seen arguing with ${victim.name} in private.`, {
    witnesses: [pickRandom(suspects.filter(s => s.name !== suspect1.name))?.name].filter(Boolean),
    importance: 6,
    hidden: true,
  });

  addEvent('9:00 PM', pickRandom(locations), murderer.name, `${murderer.name} is seen near the ${pickRandom(locations)}.`, {
    importance: 4,
  });

  addEvent('9:30 PM', pickRandom(locations), pickRandom(suspects).name, `${pickRandom(suspects).name} retires to their room early, claiming a headache.`, {
    importance: 2,
  });

  addEvent('10:00 PM', pickRandom(locations), 'Multiple', 'Coffee and drinks are served in the main lounge.', {
    importance: 1,
  });

  const murderTime = storyData.timeOfDeath;
  addEvent(murderTime, storyData.location, murderer.name, `${murderer.name} is seen heading toward the ${storyData.location}.`, {
    importance: 8,
    hidden: true,
  });

  addEvent(murderTime, storyData.location, victim.name, `${victim.name} is last seen alive in the ${storyData.location}.`, {
    importance: 9,
  });

  addEvent('Adjusting minutes', storyData.location, murderer.name, `The murder occurs. ${victim.name} is killed with ${storyData.murderWeapon}.`, {
    importance: 10,
    hidden: true,
  });

  const suspect2 = pickRandom(suspects.filter(s => s.name !== suspect1.name));
  addEvent('5 minutes after murder', pickRandom(locations), suspect2.name, `${suspect2.name} is seen near the ${storyData.location} looking distressed.`, {
    witnesses: [pickRandom(suspects.filter(s => s.name !== suspect2.name))?.name].filter(Boolean),
    importance: 7,
    hidden: true,
  });

  addEvent('15 minutes after murder', pickRandom(locations), murderer.name, `${murderer.name} joins the other guests, appearing calm and composed.`, {
    importance: 5,
  });

  addEvent('30 minutes after murder', pickRandom(locations), pickRandom(suspects).name, `${pickRandom(suspects).name} discovers the body and raises the alarm.`, {
    importance: 9,
  });

  addEvent('40 minutes after murder', 'Main Lounge', 'Multiple', 'All guests gather in the main lounge. The doors are locked. Nobody can leave.', {
    importance: 8,
  });

  return events;
}

export function generateTimeline(characters, storyData) {
  return generateTimelineEvents(characters, storyData);
}
