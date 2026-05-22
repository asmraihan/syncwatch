const adjectives = [
  'Swift', 'Brave', 'Calm', 'Dark', 'Epic', 'Free', 'Keen', 'Loud',
  'Neat', 'Wise', 'Bold', 'Cool', 'Glad', 'Kind', 'Pure', 'Rare',
  'Sly', 'Tall', 'Warm', 'Zany',
];

const animals = [
  'Fox', 'Bear', 'Wolf', 'Hawk', 'Lion', 'Deer', 'Crow', 'Lynx',
  'Seal', 'Dove', 'Owl', 'Stag', 'Mole', 'Hare', 'Toad', 'Newt',
  'Mink', 'Ibex', 'Puma', 'Wren',
];

// Distinct colors assigned per user for chat / avatars.
const colors = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899',
  '#06b6d4', '#a855f7', '#84cc16', '#f97316', '#14b8a6',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a random username like "SwiftFox42". */
export function generateUsername(): string {
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${pick(adjectives)}${pick(animals)}${num}`;
}

/** Pick a random user color from the palette. */
export function generateColor(): string {
  return pick(colors);
}

/** Generate a 6-char alphanumeric room code (lowercase, case-insensitive). */
export function generateRoomCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
