import Elysia from "elysia";
import GameLogicController from "../controllers/GameLogicController";
import { GameMessageFromClientSchema, WebSocketState } from "../types";
import {
  InputLengthNoMatchedError,
  RoomAlreadyFullError,
  RoomNotFoundError,
  SessionNotFoundError,
  UserNotFoundError,
  UserNotRoomHostError
} from "../errors";
import { getLogger } from "../logger";

const logger = getLogger("websocket");

const InitialWebSocketState: WebSocketState = {
  gameLogicController: new GameLogicController()
};

const websocket = (app: Elysia) =>
  app.state(InitialWebSocketState).ws("/ws", {
    body: GameMessageFromClientSchema,
    async open(ws) {
      const { gameLogicController } = ws.data.store;

      const requestSessionId = ws.data.query.sessionId;
      const result =
        await gameLogicController.onPlayerJoinGame(requestSessionId);

      ws.send(gameLogicController.gameMessageToString(result.message));
    },
    async message(ws, message) {
      const { gameLogicController } = ws.data.store;

      const { sessionId } = ws.data.query;
      try {
        await gameLogicController.onPlayerMessage(message, sessionId, {
          onSubscribe: (_channel, msg) => ws.send(msg),
          onReply: (msg) => ws.send(msg)
        });
      } catch (error) {
        if (
          error instanceof SessionNotFoundError ||
          error instanceof UserNotFoundError
        ) {
          ws.send(error.toJsonString());
          ws.terminate();
        } else if (
          error instanceof RoomNotFoundError ||
          error instanceof InputLengthNoMatchedError ||
          error instanceof UserNotRoomHostError ||
          error instanceof RoomAlreadyFullError
        ) {
          ws.send(error.toJsonString());
        } else {
          logger.error(error);
        }
      }
    },
    async close(ws) {
      const { gameLogicController } = ws.data.store;
      const { sessionId } = ws.data.query;
      await gameLogicController.onPlayerLeaveGame(sessionId);
    }
  });

export default websocket;
