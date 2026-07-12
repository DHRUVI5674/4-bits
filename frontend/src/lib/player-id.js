const KEY = "tlw:player-id";
const NAME_KEY = "tlw:player-name";
const APPEARANCE_KEY = "tlw:player-appearance";

export function getPlayerId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export function getStoredName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function setStoredName(name) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name);
}

export const DEFAULT_APPEARANCE = {
  skinTone: 0xffe0bd,
  hairStyle: 'hair_none',
  hairColor: 0x451a03,
  outfit: 'outfit_trenchcoat',
  outfitColor: 0x8a2029
};

export function getAppearance() {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  const stored = window.localStorage.getItem(APPEARANCE_KEY);
  if (!stored) return DEFAULT_APPEARANCE;
  try {
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(stored) };
  } catch(e) {
    return DEFAULT_APPEARANCE;
  }
}

export function setAppearance(appearance) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
}