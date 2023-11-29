declare module "bun" {
  interface Env {
    LOG_LEVEL: string;
    REDIS_URL: string;
    SESSION_EXPIRATION_SECONDS: number;
    ROOM_EXPIRATION_SECONDS: number;
  }
}

export const LOG_LEVEL = Bun.env.LOG_LEVEL || "info";
export const REDIS_URL = Bun.env.REDIS_URL;
export const SESSION_EXPIRATION_SECONDS = Bun.env.SESSION_EXPIRATION_SECONDS;
export const ROOM_EXPIRATION_SECONDS = Bun.env.ROOM_EXPIRATION_SECONDS;
