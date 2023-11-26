import { Redis } from "ioredis";
import { REDIS_URL } from "./constants";

export function getRedisConnection() {
  const redis = new Redis(REDIS_URL);
  return redis;
}

export enum RedisBucketKey {
  session = "session",
  user = "user",
  room = "room",
  roomsWaiting = "rooms:waiting",
  roomsInGame = "rooms:in-game",
  inputHistory = "input-history",
}

export function getRedisBucketKey(
  bucketKey: RedisBucketKey,
  ...keys: string[]
): string {
  return `${bucketKey}:${keys.join(":")}`;
}
