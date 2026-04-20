import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AppService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  getHello(): string {
    return 'Welcome to Watches Api Server!';
  }

  async testRedis(): Promise<string | null> {
    await this.redis.set('hello', 'world');
    const value = await this.redis.get('hello');
    return value; // should return 'world'
  }
}