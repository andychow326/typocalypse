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
    event: t.Union([t.Literal("createRoom"), t.Literal("getWaitingRooms")]),
  }),
  t.Object({
    event: t.Union([
      t.Literal("joinRoom"),
      t.Literal("leaveRoom"),
      t.Literal("getRoomStatus"),
    ]),
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
  room?: string;
};

export type Room = {
  id: string;
  state: "waiting" | "in-game";
  hostId: string;
  users: {
    [userId: string]: User;
  };
};

export type GameMessageFromServer = (
  | GameMessageFromClient
  | {
      event: "createRoom";
      data: {
        roomId: string;
      };
    }
  | {
      event: "getWaitingRooms";
      data: {
        rooms: Room[];
      };
    }
  | {
      event: "getRoomStatus";
      data: {
        room: Room;
      };
    }
) & {
  user: User;
};
