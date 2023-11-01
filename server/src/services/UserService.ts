import Redis from "ioredis";
import {
  RedisBucketKey,
  getRedisBucketKey,
  getRedisConnection,
} from "../redis";
import { randomBytes, randomUUID } from "crypto";
import { SESSION_EXPIRATION_SECONDS } from "../constants";
import { User } from "../types";

interface UserSession {
  sessionId: string;
  user: User;
}

class UserService {
  private redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis ?? getRedisConnection();
  }

  async getUserIdBySessionId(sessionId: string): Promise<string | null> {
    const key = getRedisBucketKey(RedisBucketKey.session, sessionId);
    const userId = await this.redis.get(key);
    if (userId != null) {
      await this.redis
        .multi()
        .expire(key, SESSION_EXPIRATION_SECONDS)
        .expire(
          getRedisBucketKey(RedisBucketKey.user, userId),
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

  async createUserByUserId(userId: string): Promise<User> {
    const key = getRedisBucketKey(RedisBucketKey.user, userId);
    const user: User = { id: userId, name: "" };
    await this.redis.call("JSON.SET", key, "$", JSON.stringify(user));
    return user;
  }

  async createUserSession(): Promise<UserSession> {
    const userId = randomUUID();
    const sessionId = await this.createUserSessionIdByUserId(userId);
    const user = await this.createUserByUserId(userId);
    return { sessionId, user };
  }

  async getOrCreateUserSession(sessionId: string | null): Promise<UserSession> {
    if (sessionId == null) {
      return this.createUserSession();
    }
    const userId = await this.getUserIdBySessionId(sessionId);
    if (userId == null) {
      return this.createUserSession();
    }
    const user = await this.getUserByUserId(userId);
    if (user == null) {
      return this.createUserSession();
    }
    return { sessionId, user };
  }

  async changeUsername(userId: string, name: string) {
    const key = getRedisBucketKey(RedisBucketKey.user, userId);
    const userJson = await this.redis.call("JSON.GET", key, ".");
    if (userJson == null) {
      const data: User = {
        id: userId,
        name: name,
      };
      await this.redis
        .multi()
        .call("JSON.SET", key, "$", JSON.stringify(data))
        .expire(key, SESSION_EXPIRATION_SECONDS)
        .exec();
    } else {
      await this.redis
        .multi()
        .call("JSON.SET", key, ".name", JSON.stringify(name))
        .expire(key, SESSION_EXPIRATION_SECONDS)
        .exec();
    }
  }

  async getUserByUserId(userId: string): Promise<User | null> {
    const key = getRedisBucketKey(RedisBucketKey.user, userId);
    const data = await this.redis
      .multi()
      .call("JSON.GET", key, ".")
      .expire(key, SESSION_EXPIRATION_SECONDS)
      .exec();
    if (data == null) {
      return null;
    }
    const user: User = JSON.parse(data[0][1] as any);
    return user;
  }
}

export default UserService;
