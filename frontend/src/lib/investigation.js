import { API_BASE } from "./api";

let sessionCache = {};

async function fetchSession(roomCode, force = false) {
  const code = roomCode.toUpperCase();
  if (sessionCache[code] && !force) return sessionCache[code];
  const response = await fetch(`${API_BASE}/${code}/session`);
  if (!response.ok) throw new Error("Failed to fetch session");
  const data = await response.json();
  sessionCache[code] = data.data;
  return data.data;
}

export const getSuspects = async (roomCode) => {
  const session = await fetchSession(roomCode);
  return (session.characters || [])
    .filter(c => !c.isVictim)
    .map(c => ({
      id: c.characterId,
      name: c.name,
      role: c.occupation,
      isPlayer: !!c.playerId,
      playerId: c.playerId
    }));
};

export const getSessionDetails = async (roomCode, force = false) => {
  const session = await fetchSession(roomCode, force);
  return session;
};

export const getInvestigationLog = async (roomCode) => {
  const code = roomCode.toUpperCase();
  const response = await fetch(`${API_BASE}/${code}/logs`);
  if (!response.ok) throw new Error("Failed to fetch logs");
  const data = await response.json();
  return data.data.logs;
};

export const getDiscoveredClues = async (roomCode) => {
  const session = await fetchSession(roomCode, true); // Always force fresh clues list
  return (session.evidence || [])
    .filter(e => e.discovered)
    .map(e => ({
      id: e.evidenceId,
      title: e.name,
      description: `${e.type || 'Evidence'} · ${e.description} (Location: ${e.location})`
    }));
};

export const getActivePlayers = async (roomCode) => {
  const response = await fetch(`${API_BASE}/${roomCode.toUpperCase()}/players`);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.data.players || []).map(p => ({
    id: p.playerId,
    name: p.name,
    isReady: p.isReady,
    active: p.isConnected
  }));
};

export const submitAction = async (roomCode, playerId, actionPayload) => {
  const code = roomCode.toUpperCase();
  const response = await fetch(`${API_BASE}/${code}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId,
      type: actionPayload.type,
      target: actionPayload.target,
      content: actionPayload.content
    })
  });
  if (!response.ok) {
    throw new Error("Failed to submit action");
  }
  const data = await response.json();
  return { success: true, newEntries: data.data.newEntries };
};

export const startVoting = async (roomCode, playerId) => {
  const code = roomCode.toUpperCase();
  const response = await fetch(`${API_BASE}/${code}/start-vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId })
  });
  if (!response.ok) throw new Error("Failed to start voting");
  return response.json();
};

export const submitVote = async (roomCode, playerId, suspectName) => {
  const code = roomCode.toUpperCase();
  const response = await fetch(`${API_BASE}/${code}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, suspectName })
  });
  if (!response.ok) throw new Error("Failed to submit vote");
  return response.json();
};
