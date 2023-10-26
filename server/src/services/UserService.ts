import Redis from "ioredis";
import {
  RedisBucketKey,
  getRedisBucketKey,
  getRedisConnection,
} from "../redis";
import { randomBytes, randomUUID } from "crypto";
import { SESSION_EXPIRATION_SECONDS } from "../constants";

interface UserSession {
  sessionId: string;
  userId: string;
}

class UserService {
  private redis: Redis;

  constructor() {
    this.redis = getRedisConnection();
  }

  async getUserIdBySessionId(sessionId: string): Promise<string | null> {
    const key = getRedisBucketKey(RedisBucketKey.session, sessionId);
    const userId = await this.redis.get(key);
    if (userId != null) {
      await this.redis
        .multi()
        .expire(key, SESSION_EXPIRATION_SECONDS)
        .expire(
          getRedisBucketKey(RedisBucketKey.username, userId),
          SESSION_EXPIRATION_SECONDS
        )
        .exec();
    }
    return userId;
  }

  async createUserSessionIdByUserId(userId: string): Promise<string> {
    const sessionId = randomBytes(128)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "");
    const key = getRedisBucketKey(RedisBucketKey.session, sessionId);
    await this.redis.set(key, userId, "EX", SESSION_EXPIRATION_SECONDS);
    return sessionId;
  }

  async createUserSession(): Promise<UserSession> {
    const userId = randomUUID();
    const sessionId = await this.createUserSessionIdByUserId(userId);
    return { sessionId, userId };
  }

  async getOrCreateUserSession(sessionId: string | null): Promise<UserSession> {
    if (sessionId == null) {
      return this.createUserSession();
    }
    const userId = await this.getUserIdBySessionId(sessionId);
    if (userId == null) {
      return this.createUserSession();
    }
    return { sessionId, userId };
  }

  async changeUsername(userId: string, name: string) {
    const key = getRedisBucketKey(RedisBucketKey.username, userId);
    await this.redis.set(key, name, "EX", SESSION_EXPIRATION_SECONDS);
  }

  async getUsernameByUserId(userId: string): Promise<string | null> {
    const key = getRedisBucketKey(RedisBucketKey.username, userId);
    const username = await this.redis.get(key);
    if (username != null) {
      await this.redis.expire(key, SESSION_EXPIRATION_SECONDS);
    }
    return username;
  }
}

export default UserService;
