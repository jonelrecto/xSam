"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
// In-Memory Fallback Client for environments without a running Redis server
class MemoryRedisStore {
    store = new Map();
    subscribers = new Map();
    async set(key, value, mode, duration) {
        let expiresAt = null;
        if (mode === "EX" && duration) {
            expiresAt = Date.now() + duration * 1000;
        }
        this.store.set(key, { value, expiresAt });
        return "OK";
    }
    async get(key) {
        const item = this.store.get(key);
        if (!item)
            return null;
        if (item.expiresAt && Date.now() > item.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }
    async getdel(key) {
        const value = await this.get(key);
        if (value !== null) {
            this.store.delete(key);
        }
        return value;
    }
    async del(key) {
        const existed = this.store.has(key);
        this.store.delete(key);
        return existed ? 1 : 0;
    }
    async publish(channel, message) {
        const subs = this.subscribers.get(channel);
        if (!subs)
            return 0;
        subs.forEach((cb) => cb(message));
        return subs.size;
    }
    subscribe(channel, cb) {
        if (!this.subscribers.has(channel)) {
            this.subscribers.set(channel, new Set());
        }
        this.subscribers.get(channel).add(cb);
    }
    unsubscribe(channel, cb) {
        const subs = this.subscribers.get(channel);
        if (subs) {
            subs.delete(cb);
        }
    }
}
let redisClient;
let isRealRedisAvailable = false;
try {
    const client = new ioredis_1.default(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null // Don't block if Redis server is down
    });
    client.on("error", (err) => {
        if (!isRealRedisAvailable) {
            console.warn("ℹ️ Redis server disconnected or unavailable, operating in In-Memory fallback mode.");
        }
    });
    client.on("connect", () => {
        isRealRedisAvailable = true;
        console.log("✅ Connected to Redis server.");
    });
    // Polyfill getdel for older Redis versions or client fallback
    const realGetDel = async (key) => {
        if (isRealRedisAvailable) {
            try {
                // Redis 6.2+ supports GETDEL natively
                return await client.getdel(key);
            }
            catch {
                // Lua script fallback for atomic GETDEL on older Redis versions
                const luaScript = `
          local val = redis.call('GET', KEYS[1])
          if val then redis.call('DEL', KEYS[1]) end
          return val
        `;
                return await client.eval(luaScript, 1, key);
            }
        }
        else {
            return await memoryStore.getdel(key);
        }
    };
    const memoryStore = new MemoryRedisStore();
    redisClient = {
        set: async (key, val, mode, duration) => {
            if (isRealRedisAvailable) {
                if (mode === "EX" && duration) {
                    return await client.set(key, val, "EX", duration);
                }
                return await client.set(key, val);
            }
            return await memoryStore.set(key, val, mode, duration);
        },
        get: async (key) => {
            if (isRealRedisAvailable) {
                return await client.get(key);
            }
            return await memoryStore.get(key);
        },
        getdel: realGetDel,
        del: async (key) => {
            if (isRealRedisAvailable) {
                return await client.del(key);
            }
            return await memoryStore.del(key);
        },
        publish: async (channel, message) => {
            if (isRealRedisAvailable) {
                return await client.publish(channel, message);
            }
            return await memoryStore.publish(channel, message);
        },
        subscribeMemory: (channel, cb) => {
            memoryStore.subscribe(channel, cb);
        },
        unsubscribeMemory: (channel, cb) => {
            memoryStore.unsubscribe(channel, cb);
        },
        rawClient: client
    };
}
catch (e) {
    const memoryStore = new MemoryRedisStore();
    redisClient = memoryStore;
}
exports.redis = redisClient;
