const USER_COLORS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80',
  '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6',
];

/**
 * Get a consistent color for a user based on their ID hash
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash | 0; // Keep within 32-bit integer bounds
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export interface CollabUser {
  name: string;
  color: string;
  id: string;
}

