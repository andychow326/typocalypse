import Elysia from "elysia";

const healthz = (app: Elysia) => app.get("/healthz", () => "ok");

export default healthz;
