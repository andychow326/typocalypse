import { t, Static } from "elysia";
import GameLogicController from "./controllers/GameLogicController";

export type WebSocketState = {
  gameLogicController: GameLogicController;
};

export const GameMessageFromClientSchema = t.Union([
  t.Object({
    event: t.Union([t.Literal("renewSession"), t.Literal("validSession")]),
    data: t.Object({
      sessionId: t.String(),
    }),
  }),
  t.Object({
    event: t.Literal("rename"),
    data: t.Object({
      name: t.String(),
    }),
  }),
  t.Object({
    event: t.Union([t.Literal("joinRoom"), t.Literal("leaveRoom")]),
    data: t.Object({
      roomId: t.String(),
    }),
  }),
  t.Object({
    event: t.Literal("input"),
    data: t.Object({
      key: t.String(),
    }),
  }),
]);
export type GameMessageFromClient = Static<typeof GameMessageFromClientSchema>;

export type User = {
  id: string;
  name: string;
};

export type GameMessageFromServer = GameMessageFromClient & {
  user: User;
};
