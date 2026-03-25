const SAVES_KEY = 'gift-for-saves';

export interface Saves {
  want: string[];  // review IDs
  gift: string[];  // review IDs
}

export function getSaves(): Saves {
  if (typeof window === 'undefined') return { want: [], gift: [] };
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return { want: [], gift: [] };
    return JSON.parse(raw) as Saves;
  } catch {
    return { want: [], gift: [] };
  }
}

export function addSave(id: string, type: 'want' | 'gift'): Saves {
  const saves = getSaves();
  if (!saves[type].includes(id)) saves[type].push(id);
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  return saves;
}

export function removeSave(id: string, type: 'want' | 'gift'): Saves {
  const saves = getSaves();
  saves[type] = saves[type].filter((s) => s !== id);
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  return saves;
}

export function isSaved(id: string, type: 'want' | 'gift'): boolean {
  return getSaves()[type].includes(id);
}
