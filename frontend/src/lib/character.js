import { API_BASE } from "./api";

export const getMyCharacter = async (roomCode, playerId) => {
  const response = await fetch(`${API_BASE}/${roomCode.toUpperCase()}/session/character/${playerId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch character dossier");
  }
  const data = await response.json();
  const rawChar = data.data; // Mapped from Mongoose game session response

  return {
    identity: {
      name: rawChar.name,
      role: rawChar.occupation,
      age: rawChar.age,
      occupation: rawChar.occupation
    },
    background: rawChar.publicBackground,
    secret: rawChar.privateSecret,
    objective: rawChar.objective,
    relationships: (rawChar.relationships || []).map(r => ({
      name: r.targetCharacter,
      relation: r.description
    }))
  };
};
