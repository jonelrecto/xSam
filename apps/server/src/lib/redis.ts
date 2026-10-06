import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

class MemoryRedisStore {
  private store: Map<string, { value: string; expiresAt: number | null }> = new Map();
  private subscribers: Map<string, Set<(message: string) => void>> = new Map();

  async set(key: string, value: string, mode?: string, duration?: number): Promise<"OK"> {
    let expiresAt: number | null = null;
    if (mode === "EX" && duration) {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async getdel(key: string): Promise<string | null> {
    const value = await this.get(key);
    if (value !== null) {
      this.store.delete(key);
    }
    return value;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async publish(channel: string, message: string): Promise<number> {
    const subs = this.subscribers.get(channel);
    if (!subs) return 0;
    subs.forEach((cb) => cb(message));
    return subs.size;
  }

  subscribe(channel: string, cb: (message: string) => void) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(cb);
  }

  unsubscribe(channel: string, cb: (message: string) => void) {
    const subs = this.subscribers.get(channel);
    if (subs) {
      subs.delete(cb);
    }
  }
}

let redisClient: any;
let isRealRedisAvailable = false;

try {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  client.on("error", () => {
    if (!isRealRedisAvailable) {
      // Quiet in memory fallback
    }
  });

  client.on("connect", () => {
    isRealRedisAvailable = true;
  });

  const memoryStore = new MemoryRedisStore();

  redisClient = {
    set: async (key: string, val: string, mode?: string, duration?: number) => {
      if (isRealRedisAvailable) {
        if (mode === "EX" && duration) {
          return await client.set(key, val, "EX", duration);
        }
        return await client.set(key, val);
      }
      return await memoryStore.set(key, val, mode, duration);
    },
    get: async (key: string) => {
      if (isRealRedisAvailable) {
        return await client.get(key);
      }
      return await memoryStore.get(key);
    },
    del: async (key: string) => {
      if (isRealRedisAvailable) {
        return await client.del(key);
      }
      return await memoryStore.del(key);
    },
    publish: async (channel: string, message: string) => {
      if (isRealRedisAvailable) {
        return await client.publish(channel, message);
      }
      return await memoryStore.publish(channel, message);
    },
    subscribeMemory: (channel: string, cb: (msg: string) => void) => {
      memoryStore.subscribe(channel, cb);
    },
    unsubscribeMemory: (channel: string, cb: (msg: string) => void) => {
      memoryStore.unsubscribe(channel, cb);
    },
    rawClient: client,
  };
} catch {
  redisClient = new MemoryRedisStore();
}

export const redis = redisClient;
