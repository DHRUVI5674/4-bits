import { getPlayerId } from "./player-id";
import { API_BASE } from "./api";

export async function createGame(input) {
  const playerId = getPlayerId();
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      mode: input.mode,
      maxMembers: input.maxMembers,
      revealPolicy: input.revealPolicy,
      hostId: playerId,
      hostName: input.hostName.trim(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create game");
  }

  const data = await response.json();
  return { code: data.data.game.roomCode, roomId: data.data.game._id };
}

// Map the old createRoom signature to createGame
export const createRoom = createGame;

export async function joinRoom(input) {
  const playerId = getPlayerId();
  const code = input.code.trim().toUpperCase();

  const response = await fetch(`${API_BASE}/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId,
      playerName: input.name.trim(),
    }),
  });

  if (!response.ok) {
    if (response.status === 404) return { ok: false, error: "not_found" };
    const error = await response.json();
    if (error.message?.includes("started")) return { ok: false, error: "already_started" };
    if (error.message?.includes("full")) return { ok: false, error: "full" };
    throw new Error(error.message || "Failed to join game");
  }

  const data = await response.json();
  return { ok: true, roomId: data.data.game._id, code: data.data.game.roomCode };
}

export async function getRoomByCode(code) {
  const response = await fetch(`${API_BASE}/${code.toUpperCase()}`);
  if (!response.ok) {
    throw new Error("Game not found");
  }
  const data = await response.json();
  return data.data.game;
}

export async function listPlayers(code) {
  const response = await fetch(`${API_BASE}/${code.toUpperCase()}/players`);
  if (!response.ok) {
    throw new Error("Failed to get players");
  }
  const data = await response.json();
  return data.data.players;
}

export async function setReady(code, playerId, ready) {
  const response = await fetch(`${API_BASE}/${code.toUpperCase()}/player/${playerId}/ready`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    throw new Error("Failed to set ready state");
  }
}

export async function beginInvestigation(code, hostId) {
  const response = await fetch(`${API_BASE}/${code.toUpperCase()}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostId })
  });
  if (!response.ok) {
    throw new Error("Failed to start game");
  }
}

export const MODE_LABELS = {
  classic_mansion: "Classic Mansion",
  cyber_crime: "Cyber Crime",
  haunted_house: "Haunted House"
};