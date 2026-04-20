// src/redis/redis-cache.keys.ts

export const TTL = {
  SHORT: 60,        // 1 min  — watch lists (filters change often)
  MEDIUM: 60 * 5,   // 5 min  — paginated results
  LONG: 60 * 60,    // 1 hour — single watch detail
};

export const CacheKeys = {
  // Single watch  →  "watches:detail:abc123"
  watch: (id: unknown) => `watches:detail:${id}`,

  // Watch list with filters  →  "watches:list:{"page":1,"limit":10,...}"
  watchList: (input: unknown) => `watches:list:${JSON.stringify(input)}`,

  // Pattern to clear ALL watch keys  →  "watches:*"
  watchPattern: () => `watches:*`,
};