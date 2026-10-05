import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';

class CacheService {
  private l1Cache: LRUCache<string, string>;
  private redisClient: Redis | null = null;
  private isRedisConnected: boolean = false;

  constructor() {
    // L1 In-Memory LRU Cache: 최대 1,000개 스크립트 캐시, TTL 10분
    this.l1Cache = new LRUCache<string, string>({
      max: 1000,
      ttl: 1000 * 60 * 10
    });

    this.initRedis();
  }

  private initRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000
      });

      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        console.log('[Cache] Redis L2 Cache Connected');
      });

      this.redisClient.on('error', () => {
        this.isRedisConnected = false;
        // Suppress repeated connection error logs in fallback mode
      });

      this.redisClient.connect().catch(() => {
        // Fallback to L1 In-Memory mode without crashing
        console.log('[Cache] Running in L1 In-Memory standalone mode (Redis not found)');
      });
    } catch {
      console.log('[Cache] Running in L1 In-Memory standalone mode');
    }
  }

  public async get(key: string): Promise<string | null> {
    // 1. L1 Memory Cache Check
    const l1Value = this.l1Cache.get(key);
    if (l1Value) {
      return l1Value;
    }

    // 2. L2 Redis Cache Check
    if (this.isRedisConnected && this.redisClient) {
      try {
        const l2Value = await this.redisClient.get(key);
        if (l2Value) {
          // Backfill L1
          this.l1Cache.set(key, l2Value);
          return l2Value;
        }
      } catch {
        // Ignore redis get failure
      }
    }

    return null;
  }

  public async set(key: string, value: string, ttlSeconds: number = 600): Promise<void> {
    // 1. Set L1 Memory
    this.l1Cache.set(key, value, { ttl: ttlSeconds * 1000 });

    // 2. Set L2 Redis
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttlSeconds, value);
      } catch {
        // Ignore redis set failure
      }
    }
  }

  public invalidate(key: string): void {
    this.l1Cache.delete(key);
    if (this.isRedisConnected && this.redisClient) {
      this.redisClient.del(key).catch(() => {});
    }
  }
}

export const cacheService = new CacheService();
