import { RELATIONSHIP_TYPES, VISIBILITY } from '../../constants/game.constants.js';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const RELATIONSHIP_DESCRIPTIONS = {
  [RELATIONSHIP_TYPES.FRIEND]: [
    'Longtime childhood friends who grew up together in the same social circle.',
    'Met at university and have remained close ever since.',
    'Bonded over a shared hobby and have been inseparable for years.',
    'Former colleagues who stayed friends after leaving the same company.',
  ],
  [RELATIONSHIP_TYPES.ENEMY]: [
    'Have been feuding for years over a disputed inheritance.',
    'Professional rivals who have sabotaged each other\'s careers repeatedly.',
    'Had a public falling out that ended their partnership in scandal.',
    'Competed for the same romantic interest and never reconciled.',
  ],
  [RELATIONSHIP_TYPES.FAMILY]: [
    'Siblings with a complicated history of rivalry and loyalty.',
    'Parent and child with a strained relationship over life choices.',
    'Cousins who grew up together but grew apart over business disputes.',
    'Elder relative and younger prodigy — mentor and protégé within the family.',
  ],
  [RELATIONSHIP_TYPES.COWORKER]: [
    'Worked together on a major project that ended catastrophically.',
    'Share an office and have a tense but professional relationship.',
    'Former joint-venture partners who dissolved their partnership.',
  ],
  [RELATIONSHIP_TYPES.BUSINESS_PARTNER]: [
    'Co-founded a company that has become extremely profitable.',
    'Silent partners in a real estate development venture.',
    'Shared ownership of several valuable patents and trademarks.',
  ],
  [RELATIONSHIP_TYPES.ROMANTIC_PARTNER]: [
    'Had a passionate affair that ended bitterly months ago.',
    'Secretly engaged despite family disapproval.',
    'Former lovers with unresolved feelings and a history of jealousy.',
  ],
  [RELATIONSHIP_TYPES.BLACKMAIL]: [
    'Has been blackmailing the other over a hidden criminal past.',
    'Possesses incriminating evidence and has been using it for leverage.',
    'Knows about a secret relationship and has been demanding silence payments.',
  ],
  [RELATIONSHIP_TYPES.DEBT]: [
    'Owes a significant sum from a gambling debt gone unpaid.',
    'Borrowed money for a business venture that failed completely.',
    'Has been lending money at high interest, creating dependency.',
  ],
  [RELATIONSHIP_TYPES.HIDDEN_CONNECTION]: [
    'Are actually half-siblings, though neither knows the truth.',
    'Were both members of a secret society that disbanded mysteriously.',
    'Shared a cell in prison years ago, though both hide their criminal records.',
    'Are both informants for the same intelligence agency.',
  ],
  [RELATIONSHIP_TYPES.MENTOR]: [
    'The mentor took the other under their wing early in their career.',
    'A former teacher and student who maintain a respectful relationship.',
    'An apprenticeship that ended badly when the student surpassed the master.',
  ],
  [RELATIONSHIP_TYPES.RIVAL]: [
    'Vicious competitors in the same social circles and charitable boards.',
    'Both sought the same prestigious position, creating lasting animosity.',
    'Rival families with a history stretching back generations.',
  ],
};

function generateRelationship(sourceChar, targetChar) {
  const types = Object.values(RELATIONSHIP_TYPES);
  const type = pickRandom(types);
  const descriptions = RELATIONSHIP_DESCRIPTIONS[type] || ['Have a complicated relationship.'];
  const description = pickRandom(descriptions);

  const adjustedDesc = description
    .replace('the other', `${targetChar.name}`)
    .replace('the other\'s', `${targetChar.name}'s`);

  return {
    sourceCharacter: sourceChar.name,
    targetCharacter: targetChar.name,
    relationshipType: type,
    description: adjustedDesc,
    visibility: pickRandom([VISIBILITY.PUBLIC, VISIBILITY.PUBLIC, VISIBILITY.HIDDEN]),
    importance: Math.floor(Math.random() * 5) + 1,
  };
}

export function generateRelationships(characters) {
  const relationships = [];
  const pairs = new Set();

  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const key = `${characters[i].name}-${characters[j].name}`;
      if (!pairs.has(key) && Math.random() < 0.7) {
        pairs.add(key);
        const rel = generateRelationship(characters[i], characters[j]);
        relationships.push(rel);
      }
    }
  }

  const murderer = characters.find(c => c.isMurderer);
  const victim = characters.find(c => c.isVictim);

  if (murderer && victim) {
    const hasMurdererVictimRel = relationships.some(
      r => r.sourceCharacter === murderer.name && r.targetCharacter === victim.name
        || r.sourceCharacter === victim.name && r.targetCharacter === murderer.name
    );
    if (!hasMurdererVictimRel) {
      relationships.push({
        sourceCharacter: murderer.name,
        targetCharacter: victim.name,
        relationshipType: RELATIONSHIP_TYPES.ENEMY,
        description: `${murderer.name} harbored a deep resentment toward ${victim.name} that nobody fully understood.`,
        visibility: VISIBILITY.HIDDEN,
        importance: 10,
      });
    }
  }

  for (const rel of relationships) {
    for (const char of characters) {
      if (char.name === rel.sourceCharacter) {
        char.relationships.push(rel);
      }
    }
  }

  return relationships;
}
