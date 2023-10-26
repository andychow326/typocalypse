import Elysia from "elysia";
import GameLogicController from "../controllers/GameLogicController";
import { GameMessageFromClientSchema, WebSocketState } from "../types";
import { SessionNotFoundError } from "../errors";

const InitialWebSocketState: WebSocketState = {
  gameLogicController: new GameLogicController(),
};

const websocket = (app: Elysia) =>
  app.state(InitialWebSocketState).ws("/ws", {
    body: GameMessageFromClientSchema,
    async open(ws) {
      const gameLogicController = ws.data.store.gameLogicController;

      const requestSessionId = ws.data.query.sessionId;
      const result = await gameLogicController.onPlayerJoinGame(
        requestSessionId
      );

      if (requestSessionId == null) {
        ws.data.query.sessionId = result.sessionId;
      }

      ws.send(gameLogicController.gameMessageToString(result.message));
    },
    async message(ws, message) {
      const gameLogicController = ws.data.store.gameLogicController;

      const sessionId = ws.data.query.sessionId;
      try {
        await gameLogicController.onPlayerMessage(sessionId, message, {
          onSubscribe: (_channel, message) => ws.send(message),
        });
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          ws.send(error.toJsonString());
          ws.terminate();
        }
      }
    },
    async close(ws) {
      const gameLogicController = ws.data.store.gameLogicController;
      const sessionId = ws.data.query.sessionId;
      await gameLogicController.onPlayerLeaveGame(sessionId);
    },
  });

export default websocket;