import RoleEngine from '../engine/role/index.js';

// Mock AI client that returns a valid role object
const mockAiClient = {
  async generateCompletion(prompt, options) {
    // Return a JS object matching the RoleValidator expected shape
    return {
      id: 'char_12345',
      name: 'Detective D.',
      occupation: 'Private Investigator',
      background: 'Former police detective turned PI after a scandal.',
      objective: 'Uncover hidden relationships and find the truth.',
      secret: 'Was once in a romantic relationship with the victim.',
      inventory: ['notebook', 'flashlight'],
      knownClues: ['broken window', 'torn fabric'],
      motive: 'Strong professional rivalry with the victim.',
      alibi: 'Was at the bar across town.',
      isMurderer: false,
    };
  }
};

async function run() {
  try {
    const engine = new RoleEngine({ aiClient: mockAiClient });
    const result = await engine.generateRole({ playerName: 'Alice', seed: 'seed123' });
    console.log('Role Engine Test Successful. Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Role Engine Test Failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

run();
