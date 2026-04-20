// src/redis/redis-cache.service.ts

import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  // ─── GET ─────────────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      this.logger.warn(`Failed to parse cache value for key: ${key}`);
      return null;
    }
  }

  // ─── SET ─────────────────────────────────────────────────────────────────

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.set(key, serialized, 'EX', ttlSeconds);
  }

  // ─── DELETE ONE ──────────────────────────────────────────────────────────

  async del(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(`Cache invalidated: ${key}`);
  }

  // ─── PATTERN-BASED CLEAR (safe — uses SCAN not KEYS) ─────────────────────

  async clearByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    let totalDeleted = 0;

    do {
      // SCAN is non-blocking, safe for production unlike KEYS *
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH', pattern,
        'COUNT', 100,
      );

      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    this.logger.debug(`Cleared ${totalDeleted} keys matching: ${pattern}`);
  }

  // ─── HELPER: GET OR SET ───────────────────────────────────────────────────
  // Use this to avoid writing the if(cached) return cached pattern everywhere

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${key}`);
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}