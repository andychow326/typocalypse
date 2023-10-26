import { Redis } from "ioredis";
import { REDIS_URL } from "./constants";

export function getRedisConnection() {
  const redis = new Redis(REDIS_URL);
  return redis;
}
