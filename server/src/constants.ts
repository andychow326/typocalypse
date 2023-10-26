declare module "bun" {
  interface Env {
    REDIS_URL: string;
  }
}

export const REDIS_URL = Bun.env.REDIS_URL;
