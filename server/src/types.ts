import { t, Static } from "elysia";
import GameLogicController from "./controllers/GameLogicController";

export type WebSocketState = {
  gameLogicController: GameLogicController;
};

export const GameMessageFromClientSchema = t.Union([
  t.Object({
    event: t.Union([t.Literal("renewSession"), t.Literal("validSession")]),
    data: t.Object({
      sessionId: t.String()
    })
  }),
  t.Object({
    event: t.Union([t.Literal("createRoom"), t.Literal("quickPlay")]),
    data: t.Object({
      name: t.String()
    })
  }),
  t.Object({
    event: t.Literal("joinRoom"),
    data: t.Object({
      name: t.String(),
      roomId: t.String()
    })
  }),
  t.Object({
    event: t.Literal("getWaitingRooms")
  }),
  t.Object({
    event: t.Union([
      t.Literal("leaveRoom"),
      t.Literal("getRoomStatus"),
      t.Literal("startGame")
    ]),
    data: t.Object({
      roomId: t.String()
    })
  }),
  t.Object({
    event: t.Literal("input"),
    data: t.Object({
      key: t.String()
    })
  })
]);
export type GameMessageFromClient = Static<typeof GameMessageFromClientSchema>;

export type User = {
  id: string;
  name: string;
  room?: string;
};

export type RoomWord = {
  userId: string;
  word: string;
};

export type RoomZombie = {
  userId: string;
  word: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
};

export type RoomWaiting = {
  id: string;
  state: "waiting";
  hostId: string;
  users: {
    [userId: string]: User;
  };
};

export type RoomInGame = {
  id: string;
  state: "in-game";
  round: number;
  roundDurationSeconds: number;
  roundWaitDurationSeconds: number;
  hostId: string;
  users: {
    [userId: string]: User;
  };
  zombies: RoomZombie[];
};

export type Room = RoomWaiting | RoomInGame;

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

export type GameMessageFromWorker =
  | { event: "ping" }
  | {
      event: "startGame";
      data: {
        room: Room;
      };
    }
  | {
      event: "remainingTime";
      data: {
        type: "waitForRoundStart" | "round";
        remainingTime: number;
      };
    };
