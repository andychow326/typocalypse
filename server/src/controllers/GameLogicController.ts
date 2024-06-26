import { Redis } from "ioredis";
import PubSubService from "../services/PubSubService";
import UserService from "../services/UserService";
import {
  RoomNotFoundError,
  SessionNotFoundError,
  UserNotFoundError,
  UserNotRoomHostError
} from "../errors";
import { GameMessageFromClient, GameMessageFromServer } from "../types";
import { getRedisConnection } from "../redis";
import RoomService from "../services/RoomService";
import GameService from "../services/GameService";
import { getLogger } from "../logger";
import GameLoopWorker from "../workers/GameLoopWorker";

const logger = getLogger("GameLogicController");

class GameLogicController {
  private redis: Redis;

  private pubsubService: PubSubService;

  private userService: UserService;

  private roomService: RoomService;

  private gameService: GameService;

  private activeWorkerMap: Record<string, GameLoopWorker>;

  constructor() {
    this.redis = getRedisConnection();
    this.pubsubService = new PubSubService();
    this.userService = new UserService(this.redis);
    this.roomService = new RoomService(this.redis);
    this.gameService = new GameService(this.redis);
    this.activeWorkerMap = {};
  }

  gameMessageToString(message: GameMessageFromServer): string {
    return JSON.stringify(message);
  }

  async publishGameMessage(
    userId: string,
    channel: string,
    message: GameMessageFromClient | GameMessageFromServer
  ): Promise<void> {
    const user = await this.userService.getUserByUserId(userId);
    const responseMessage: GameMessageFromServer = {
      ...message,
      user: { id: userId, name: user?.name ?? "" }
    };
    const messageString = this.gameMessageToString(responseMessage);
    return this.pubsubService.publish(channel, messageString);
  }

  async onPlayerJoinGame(
    sessionId?: string
  ): Promise<{ message: GameMessageFromServer; sessionId: string }> {
    const { sessionId: finalSessionId, user } =
      await this.userService.getOrCreateUserSession(sessionId);
    return {
      sessionId: finalSessionId,
      message: {
        event: sessionId === finalSessionId ? "validSession" : "renewSession",
        data: {
          sessionId: finalSessionId
        },
        user: {
          id: user.id,
          name: user.name
        }
      }
    };
  }

  async onPlayerCreateRoom(
    userId: string,
    name: string,
    onSubscribe?: (channel: string, message: string) => void
  ): Promise<void> {
    await this.userService.changeUsername(userId, name);
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    const roomId = await this.roomService.createRoom(user);
    const message: GameMessageFromServer = {
      event: "createRoom",
      data: {
        roomId
      },
      user
    };
    await this.pubsubService.subscribe(userId, roomId, (channel, msg) =>
      onSubscribe?.(channel, msg)
    );
    await this.publishGameMessage(userId, roomId, message);
  }

  async onPlayerJoinRoom(
    userId: string,
    name: string,
    roomId: string,
    message: GameMessageFromClient,
    onSubscribe?: (channel: string, message: string) => void
  ): Promise<void> {
    await this.userService.changeUsername(userId, name);
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    await this.roomService.joinRoom(user, roomId);
    await this.pubsubService.subscribe(userId, roomId, (channel, msg) =>
      onSubscribe?.(channel, msg)
    );
    await this.publishGameMessage(userId, roomId, message);
  }

  async onPlayerQuickPlay(
    userId: string,
    name: string,
    onSubscribe?: (channel: string, message: string) => void
  ): Promise<void> {
    const waitingRooms = await this.roomService.getWaitingRooms();
    if (waitingRooms.length === 0) {
      return this.onPlayerCreateRoom(userId, name, onSubscribe);
    }

    const waitingRoomsSorted = waitingRooms.toSorted(
      (a, b) => Object.keys(b.users).length - Object.keys(a.users).length
    );
    for (const room of waitingRoomsSorted) {
      try {
        return await this.onPlayerJoinRoom(
          userId,
          name,
          room.id,
          {
            event: "joinRoom",
            data: {
              name,
              roomId: room.id
            }
          },
          onSubscribe
        );
      } catch (error) {
        // Ignore
      }
    }

    return this.onPlayerCreateRoom(userId, name, onSubscribe);
  }

  async onPlayerLeaveRoom(
    userId: string,
    roomId: string,
    message: GameMessageFromClient
  ): Promise<void> {
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    await this.roomService.leaveRoom(user, roomId);
    await this.publishGameMessage(userId, roomId, message);
    await this.pubsubService.unsubscribe(userId, roomId);
  }

  async onPlayerGetWaitingRooms(
    userId: string,
    onReply?: (message: string) => void
  ): Promise<void> {
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    const rooms = await this.roomService.getWaitingRooms();
    const message: GameMessageFromServer = {
      event: "getWaitingRooms",
      data: {
        rooms
      },
      user
    };
    onReply?.(this.gameMessageToString(message));
  }

  async onPlayerGetRoomStatus(
    userId: string,
    roomId: string,
    onReply?: (message: string) => void
  ): Promise<void> {
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    const room = await this.roomService.getRoomStatus(roomId);
    if (room == null) {
      throw new RoomNotFoundError(roomId);
    }
    const message: GameMessageFromServer = {
      event: "getRoomStatus",
      data: {
        room
      },
      user
    };
    onReply?.(this.gameMessageToString(message));
  }

  async onPlayerLeaveGame(sessionId?: string): Promise<void> {
    if (sessionId == null) {
      return;
    }
    const userId = await this.userService.getUserIdBySessionId(sessionId);
    if (userId == null) {
      return;
    }
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    if (user.room != null) {
      await this.onPlayerLeaveRoom(userId, user.room, {
        event: "leaveRoom",
        data: { roomId: user.room }
      });
    }
    await this.pubsubService.unsubscribe(userId);
  }

  async onPlayerStartGame(
    userId: string,
    roomId: string,
    _message: GameMessageFromClient
  ) {
    const room = await this.roomService.getRoomStatus(roomId);
    if (room == null) {
      throw new RoomNotFoundError(roomId);
    }
    if (room.hostId !== userId) {
      throw new UserNotRoomHostError(userId);
    }

    const worker = new GameLoopWorker(roomId, {
      redis: this.redis,
      pubsubService: this.pubsubService,
      gameService: this.gameService,
      roomService: this.roomService,
      userService: this.userService,
      onTerminate: () => {
        delete this.activeWorkerMap[roomId];
      }
    });
    this.activeWorkerMap[roomId] = worker;
    worker.start();
    logger.info({ userId, roomId }, "instantiate new game loop worker");
  }

  async onPlayerInput(
    userId: string,
    input: string,
    message: GameMessageFromClient
  ) {
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    if (user.room == null) {
      throw new RoomNotFoundError(user.room ?? "");
    }
    await this.gameService.handleGameInput(userId, user.room, input);
    await this.publishGameMessage(userId, user.room, message);
  }

  async onWorkerHandledEvent(userId: string, message: GameMessageFromClient) {
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    if (user.room != null && user.room in this.activeWorkerMap) {
      const worker = this.activeWorkerMap[user.room];
      worker.onMessage(userId, message);
    }
  }

  async onPlayerMessage(
    message: GameMessageFromClient,
    sessionId?: string,
    options?: {
      onSubscribe?: (channel: string, message: string) => void;
      onReply?: (message: string) => void;
    }
  ): Promise<void> {
    if (sessionId == null) {
      throw new SessionNotFoundError(sessionId);
    }

    const userId = await this.userService.getUserIdBySessionId(sessionId);
    if (userId == null) {
      throw new SessionNotFoundError(sessionId);
    }

    logger.debug(message, "recevie message from user");

    if (message.event === "createRoom") {
      await this.onPlayerCreateRoom(
        userId,
        message.data.name,
        options?.onSubscribe
      );
    }
    if (message.event === "joinRoom") {
      await this.onPlayerJoinRoom(
        userId,
        message.data.name,
        message.data.roomId,
        message,
        options?.onSubscribe
      );
    }
    if (message.event === "quickPlay") {
      await this.onPlayerQuickPlay(
        userId,
        message.data.name,
        options?.onSubscribe
      );
    }
    if (message.event === "leaveRoom") {
      await this.onPlayerLeaveRoom(userId, message.data.roomId, message);
    }
    if (message.event === "getWaitingRooms") {
      await this.onPlayerGetWaitingRooms(userId, options?.onReply);
    }
    if (message.event === "getRoomStatus") {
      await this.onPlayerGetRoomStatus(
        userId,
        message.data.roomId,
        options?.onReply
      );
    }
    if (message.event === "startGame") {
      await this.onPlayerStartGame(userId, message.data.roomId, message);
    }
    if (message.event === "input") {
      await this.onPlayerInput(userId, message.data.key, message);
    }

    // Fallback as worker handled events
    await this.onWorkerHandledEvent(userId, message);
  }
}

export default GameLogicController;
