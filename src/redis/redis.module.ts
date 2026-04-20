// src/redis/redis.module.ts

import { Module } from '@nestjs/common';
import { RedisProvider } from './redis.provider';
import { RedisCacheService } from './redis-cache.service';

@Module({
  providers: [RedisProvider, RedisCacheService],
  exports: [RedisProvider, RedisCacheService], // ← export CacheService too
})
export class RedisModule {}