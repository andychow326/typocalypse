import { Redis } from "ioredis";
import { REDIS_URL } from "./constants";

export function getRedisConnection() {
  const redis = new Redis(REDIS_URL);
  return redis;
}

export enum RedisBucketKey {
  session = "session",
  user = "user",
}

export function getRedisBucketKey(
  bucketKey: RedisBucketKey,
  key: string
): string {
  return `${bucketKey}:${key}`;
}
