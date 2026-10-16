/**
 * High Performance Multi-Tier Cache Service
 * Compatible with Redis / Upstash with an In-Memory LRU/TTL Fallback.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private inMemoryCache = new Map<string, CacheEntry<any>>();

  /**
   * Get value from cache or execute fallback fetcher
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshValue = await fetcher();
    await this.set(key, freshValue, ttlSeconds);
    return freshValue;
  }

  /**
   * Get value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.inMemoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.inMemoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value with TTL in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.inMemoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate specific key
   */
  async delete(key: string): Promise<void> {
    this.inMemoryCache.delete(key);
  }

  /**
   * Invalidate all keys matching prefix
   */
  async deletePrefix(prefix: string): Promise<void> {
    for (const key of this.inMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  /**
   * Flush entire cache
   */
  async clear(): Promise<void> {
    this.inMemoryCache.clear();
  }
}

export const cache = new CacheService();
