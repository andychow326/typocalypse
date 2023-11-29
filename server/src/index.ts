import { Elysia } from "elysia";
import websocket from "./modules/websocket";
import healthz from "./modules/healthz";
import { getLogger } from "./logger";

const logger = getLogger("App");

const app = new Elysia().use(healthz).use(websocket).listen(3000);

logger.info(`Server is running at ${app.server?.hostname}:${app.server?.port}`);
