const STORY_TEMPLATES = [
  {
    theme: 'The Mansion Murder',
    location: 'Blackwood Manor',
    timeOfDeath: '11:45 PM',
    murderWeapon: 'Antique Letter Opener',
    causeOfDeath: 'Stabbed through the heart',
    motiveSummary: 'The victim was about to disinherit the murderer, who stood to lose everything.',
  },
  {
    theme: 'The Coastal Conspiracy',
    location: 'Seagull Harbor Inn',
    timeOfDeath: '3:20 AM',
    murderWeapon: 'Shipmate\'s Anchor Pin',
    causeOfDeath: 'Blunt force trauma to the head',
    motiveSummary: 'The murderer discovered the victim was responsible for a shipping scam that ruined their family.',
  },
  {
    theme: 'The Express Enigma',
    location: 'Orient Express Car No. 7',
    timeOfDeath: '2:15 AM',
    murderWeapon: 'Silk Strangling Cord',
    causeOfDeath: 'Strangulation',
    motiveSummary: 'The victim was a blackmailer who threatened to expose the murderer\'s darkest secret.',
  },
  {
    theme: 'The Masquerade Mystery',
    location: 'Rosewood Opera House',
    timeOfDeath: '10:30 PM',
    murderWeapon: 'Poisoned Champagne',
    causeOfDeath: 'Cyanide poisoning',
    motiveSummary: 'The victim had stolen credit for the murderer\'s life\'s work, destroying their career.',
  },
  {
    theme: 'The Observatory Obscurity',
    location: 'Stargazer\'s Peak Observatory',
    timeOfDeath: '1:00 AM',
    murderWeapon: 'Telescope Counterweight',
    causeOfDeath: 'Bludgeoned',
    motiveSummary: 'The victim discovered the murderer\'s fraudulent research and threatened to expose them.',
  },
  {
    theme: 'The Art Heist Homicide',
    location: 'Whitmore Art Gallery',
    timeOfDeath: '11:00 PM',
    murderWeapon: 'Bronze Sculpture Fragment',
    causeOfDeath: 'Blunt force trauma',
    motiveSummary: 'The victim and murderer were partners in an art forgery ring, and the victim planned to confess.',
  },
  {
    theme: 'The Boardroom Betrayal',
    location: 'Apex Corp Executive Suite',
    timeOfDeath: '8:15 PM',
    murderWeapon: 'Crystal Decanter',
    causeOfDeath: 'Bludgeoned',
    motiveSummary: 'The victim discovered the murderer had been embezzling company funds for years.',
  },
  {
    theme: 'The Carnival Killing',
    location: 'Midnight Circus Big Top',
    timeOfDeath: '12:00 AM',
    murderWeapon: 'Juggling Club',
    causeOfDeath: 'Blunt force trauma',
    motiveSummary: 'The victim had sabotaged the murderer\'s trapeze equipment years ago, causing a crippling fall.',
  },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStoryTemplate() {
  return pickRandom(STORY_TEMPLATES);
}

export function generateStory() {
  const template = generateStoryTemplate();

  return {
    theme: template.theme,
    location: template.location,
    timeOfDeath: template.timeOfDeath,
    murderWeapon: template.murderWeapon,
    causeOfDeath: template.causeOfDeath,
    motiveSummary: template.motiveSummary,
  };
}
