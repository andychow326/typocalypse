declare module "bun" {
  interface Env {
    REDIS_URL: string;
    SESSION_EXPIRATION_SECONDS: number;
  }
}

export const REDIS_URL = Bun.env.REDIS_URL;
export const SESSION_EXPIRATION_SECONDS = Bun.env.SESSION_EXPIRATION_SECONDS;
