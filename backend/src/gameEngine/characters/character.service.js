function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const FIRST_NAMES = [
  'Eleanor', 'Sebastian', 'Isabella', 'Reginald', 'Penelope', 'Alistair',
  'Victoria', 'Montgomery', 'Beatrice', 'Cedric', 'Ophelia', 'Maxwell',
  'Genevieve', 'Percival', 'Arabella', 'Cornelius', 'Juliette', 'Augustus',
  'Seraphina', 'Barnaby', 'Cordelia', 'Leopold', 'Anastasia', 'Theodore',
  'Florence', 'Humphrey', 'Lillian', 'Rupert', 'Matilda', 'Quincy',
];

const LAST_NAMES = [
  'Blackwood', 'Ashworth', 'Ravencroft', 'Thornfield', 'Sinclair',
  'Montgomery', 'Pemberley', 'Winthorpe', 'Fitzallen', 'Sterling',
  'Hargrave', 'Lockwood', 'Davenport', 'Whitmore', 'Kensington',
];

const OCCUPATIONS = [
  'Physician', 'Barrister', 'Professor', 'Journalist', 'Detective',
  'Museum Curator', 'Chef', 'Pilot', 'Architect', 'Professor of Archaeology',
  'Socialite', 'Military Officer', 'Inventor', 'Art Dealer', 'Plantation Owner',
  'Jewelry Designer', 'Orchestra Conductor', 'Chemist', 'Botanist', 'Diplomat',
];

const PERSONALITY_TRAITS = [
  'Charismatic and manipulative', 'Quiet and observant', 'Brash and impulsive',
  'Calculating and patient', 'Warm and empathetic', 'Cold and distant',
  'Charming but deceitful', 'Nervous and jittery', 'Arrogant and condescending',
  'Kind-hearted but naive', 'Suspicious and paranoid', 'Mysterious and aloof',
  'Gregarious and talkative', 'Pompous and self-important', 'Timid and anxious',
  'Brave and principled', 'Ambitious and ruthless', 'Eccentric and brilliant',
  'Loyal and protective', 'Flirtatious and playful',
];

const BACKGROUND_TEMPLATES = [
  'A respected member of high society, known for hosting lavish parties and charitable events.',
  'A self-made entrepreneur who built their fortune from nothing through shrewd business deals.',
  'An academic who has published several acclaimed works in their field of expertise.',
  'A world traveler with a mysterious past and connections in every major city.',
  'A retired official who maintains connections with powerful figures from their former career.',
  'An artist whose work has been featured in galleries across the continent.',
  'A military veteran who now works as a private consultant for high-profile clients.',
  'A member of an old-money family with a reputation for eccentricity and secrets.',
  'A former detective who left the force under mysterious circumstances.',
  'A diplomat who has served in embassies around the world.',
];

const SECRETS = [
  'Has a hidden criminal record from their youth that they have never disclosed.',
  'Is secretly in massive debt due to a gambling addiction.',
  'Has been impersonating a deceased relative to claim their inheritance.',
  'Is a former spy who fled their home country under a false identity.',
  'Has been secretly funding a rival organization to undermine their competition.',
  'Is the illegitimate child of a notorious crime figure.',
  'Has been selling confidential information to a foreign power.',
  'Is actually the legal owner of the estate, though everyone believes otherwise.',
  'Has a terminal illness and has been seeking dangerous experimental treatments.',
  'Faked their own death years ago and assumed a new identity.',
  'Has been secretly meeting with the victim\'s business rivals.',
  'Is in possession of a stolen artifact worth millions.',
  'Has been blackmailing several prominent figures in society.',
  'Was present at the scene of an unsolved murder years ago.',
  'Has been hiding a family member in the attic of the estate.',
];

const OBJECTIVES = [
  'Find the killer before they strike again.',
  'Protect your family\'s reputation at all costs.',
  'Ensure the victim\'s fortune goes to the rightful heir.',
  'Uncover the truth about the victim\'s secret dealings.',
  'Clear your name as the prime suspect.',
  'Discover what the victim knew about your own dark past.',
  'Retrieve a compromising item from the victim\'s possession.',
  'Expose the real criminal to save an innocent friend.',
  'Secure the evidence that proves your theory about the murder.',
  'Stay alive long enough to reveal what you know.',
];

const ALIBIS = [
  'Was reading alone in the library at the time of the murder.',
  'Was taking a walk in the garden and saw nothing.',
  'Was in their room preparing for bed.',
  'Was having a late nightcap with another guest.',
  'Was in the kitchen making tea.',
  'Was on the phone with their business partner.',
  'Was in the wine cellar selecting a bottle.',
  'Was on the balcony smoking.',
  'Was in the billiard room playing alone.',
  'Was writing letters in the study.',
];

const INVENTORY_ITEMS = [
  'Pocket watch', 'Locket with photograph', 'Leather journal',
  'Cigar case', 'Silver flask', 'Antique key',
  'Pair of gloves', 'Reading glasses', 'Brass compass',
  'Handkerchief with embroidered initials', 'Small velvet pouch',
  'Railway ticket stub', 'Encrypted letter', 'Vial of medicine',
  'Engraved cigarette case',
];

function generateCharacter(index, total, storyData) {
  const firstName = pickRandom(FIRST_NAMES);
  const lastName = pickRandom(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const age = Math.floor(Math.random() * 40) + 22;

  const personality = pickRandom(PERSONALITY_TRAITS);
  const occupation = pickRandom(OCCUPATIONS);
  const publicBackground = pickRandom(BACKGROUND_TEMPLATES);
  const privateSecret = pickRandom(SECRETS);
  const objective = pickRandom(OBJECTIVES);
  const alibi = pickRandom(ALIBIS);
  const inventory = [
    pickRandom(INVENTORY_ITEMS),
    pickRandom(INVENTORY_ITEMS),
  ];

  const motive = `The ${occupation.toLowerCase()} had much to gain from the victim's death.`;

  return {
    characterId: null,
    playerId: null,
    name,
    age,
    occupation,
    personality,
    publicBackground,
    privateSecret:
      index === 0
        ? `Is the murderer. ${privateSecret}`
        : privateSecret,
    objective,
    inventory,
    alibi,
    motive,
    knownClues: [],
    relationships: [],
    isMurderer: index === 0,
    isVictim: false,
  };
}

function generateVictimChar(storyData) {
  const firstName = pickRandom(FIRST_NAMES);
  const lastName = pickRandom(LAST_NAMES);
  const name = `${firstName} ${lastName}`;

  return {
    characterId: null,
    playerId: null,
    name,
    age: Math.floor(Math.random() * 50) + 45,
    occupation: pickRandom(OCCUPATIONS),
    personality: pickRandom(PERSONALITY_TRAITS),
    publicBackground: `A prominent figure in society. ${pickRandom(BACKGROUND_TEMPLATES)}`,
    privateSecret: pickRandom(SECRETS),
    objective: 'Rest in peace.',
    inventory: [pickRandom(INVENTORY_ITEMS), pickRandom(INVENTORY_ITEMS)],
    alibi: 'Was murdered. No alibi needed.',
    motive: 'None. They are the victim.',
    knownClues: [],
    relationships: [],
    isMurderer: false,
    isVictim: true,
  };
}

export function generateCharacters(playerCount, storyData) {
  const victim = generateVictimChar(storyData);
  const totalSuspects = Math.max(playerCount, 3);

  const murderer = generateCharacter(0, totalSuspects, storyData);
  murderer.isMurderer = true;
  murderer.privateSecret = `IS THE MURDERER. ${pickRandom(SECRETS)}`;

  const suspects = [];
  for (let i = 1; i < totalSuspects; i++) {
    suspects.push(generateCharacter(i, totalSuspects, storyData));
  }

  const allCharacters = [victim, murderer, ...suspects];
  const shuffled = shuffleArray(allCharacters);

  const victimInShuffled = shuffled.find(c => c.isVictim);
  const nonVictim = shuffled.filter(c => !c.isVictim);

  const murdererInNonVictim = nonVictim.find(c => c.isMurderer);
  const nonMurdererSuspects = nonVictim.filter(c => !c.isMurderer);

  const finalVictim = victimInShuffled || victim;
  const finalMurderer = murdererInNonVictim || murderer;
  const finalSuspects = nonMurdererSuspects;

  return {
    victim: finalVictim,
    murderer: finalMurderer,
    suspects: finalSuspects,
    characters: [finalVictim, finalMurderer, ...finalSuspects],
  };
}

export function assignCharactersToPlayers(characters, players) {
  const nonVictimCharacters = characters.filter(c => !c.isVictim);
  const shuffled = shuffleArray(nonVictimCharacters);

  const assignments = {};
  players.forEach((player, index) => {
    if (index < shuffled.length) {
      shuffled[index].playerId = player.playerId;
      assignments[player.playerId] = shuffled[index];
    }
  });

  return { characters, assignments };
}
