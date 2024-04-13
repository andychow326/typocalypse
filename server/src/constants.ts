declare module "bun" {
  interface Env {
    LOG_LEVEL: string;
    REDIS_URL: string;
    SESSION_EXPIRATION_SECONDS: string;
    ROOM_EXPIRATION_SECONDS: string;
  }
}

export const LOG_LEVEL = Bun.env.LOG_LEVEL || "info";
export const { REDIS_URL } = Bun.env;
export const SESSION_EXPIRATION_SECONDS = Number(
  Bun.env.SESSION_EXPIRATION_SECONDS,
);
export const ROOM_EXPIRATION_SECONDS = Number(Bun.env.ROOM_EXPIRATION_SECONDS);
