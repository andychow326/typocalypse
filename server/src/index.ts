import { Elysia } from "elysia";
import websocket from "./modules/websocket";
import healthz from "./modules/healthz";

const app = new Elysia().use(healthz).use(websocket).listen(3000);

console.log(`Server is running at ${app.server?.hostname}:${app.server?.port}`);
