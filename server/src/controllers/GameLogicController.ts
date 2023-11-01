import { Redis } from "ioredis";
import PubSubService from "../services/PubSubService";
import UserService from "../services/UserService";
import {
  RoomNotFoundError,
  SessionNotFoundError,
  UserNotFoundError,
} from "../errors";
import { GameMessageFromClient, GameMessageFromServer } from "../types";
import { getRedisConnection } from "../redis";
import RoomService from "../services/RoomService";

class GameLogicController {
  private redis: Redis;
  private pubsubService: PubSubService;
  private userService: UserService;
  private roomService: RoomService;

  constructor() {
    this.redis = getRedisConnection();
    this.pubsubService = new PubSubService();
    this.userService = new UserService(this.redis);
    this.roomService = new RoomService(this.redis);
  }

  gameMessageToString(message: GameMessageFromServer): string {
    return JSON.stringify(message);
  }

  async publishGameMessage(
    type: "singleChannel" | "allChannelsBySubscriberId",
    userId: string,
    channel: string,
    message: GameMessageFromClient
  ): Promise<void> {
    const user = await this.userService.getUserByUserId(userId);
    const responseMessage: GameMessageFromServer = {
      ...message,
      user: { id: userId, name: user?.name ?? "" },
    };
    const messageString = this.gameMessageToString(responseMessage);
    if (type === "allChannelsBySubscriberId") {
      return await this.pubsubService.publishToAllChannelsBySubscriberId(
        channel,
        messageString
      );
    }
    return await this.pubsubService.publish(channel, messageString);
  }

  async onPlayerJoinGame(
    sessionId: string | null
  ): Promise<{ message: GameMessageFromServer; sessionId: string }> {
    const { sessionId: finalSessionId, user } =
      await this.userService.getOrCreateUserSession(sessionId);
    return {
      sessionId: finalSessionId,
      message: {
        event: sessionId === finalSessionId ? "validSession" : "renewSession",
        data: {
          sessionId: finalSessionId,
        },
        user: {
          id: user.id,
          name: user.name,
        },
      },
    };
  }

  async onPlayerRename(
    userId: string,
    name: string,
    message: GameMessageFromClient
  ): Promise<void> {
    await this.userService.changeUsername(userId, name);
    await this.publishGameMessage(
      "allChannelsBySubscriberId",
      userId,
      userId,
      message
    );
  }

  async onPlayerCreateRoom(
    userId: string,
    onSubscribe?: (channel: string, message: string) => void,
    onReply?: (message: string) => void
  ): Promise<void> {
    console.log("create");
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    const roomId = await this.roomService.createRoom(user);
    const message: GameMessageFromServer = {
      event: "createRoom",
      data: {
        roomId: roomId,
      },
      user: user,
    };
    await this.pubsubService.subscribe(userId, roomId, (channel, message) =>
      onSubscribe?.(channel, message)
    );
    onReply?.(this.gameMessageToString(message));
  }

  async onPlayerJoinRoom(
    userId: string,
    roomId: string,
    message: GameMessageFromClient,
    onSubscribe?: (channel: string, message: string) => void
  ): Promise<void> {
    const user = await this.userService.getUserByUserId(userId);
    if (user == null) {
      throw new UserNotFoundError(userId);
    }
    await this.roomService.joinRoom(user, roomId);
    await this.pubsubService.subscribe(userId, roomId, (channel, message) =>
      onSubscribe?.(channel, message)
    );
    await this.publishGameMessage("singleChannel", userId, roomId, message);
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
    await this.publishGameMessage("singleChannel", userId, roomId, message);
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
        rooms: rooms,
      },
      user: user,
    };
    onReply?.(this.gameMessageToString(message));
  }

  async onPlayerGetRoomStatus(userId: string, roomId: string): Promise<void> {
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
        room: room,
      },
      user: user,
    };
    await this.pubsubService.publish(roomId, this.gameMessageToString(message));
  }

  async onPlayerLeaveGame(sessionId: string | null): Promise<void> {
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
        data: { roomId: user.room },
      });
    }
    await this.pubsubService.unsubscribe(userId);
  }

  async onPlayerInput(userId: string, message: GameMessageFromClient) {
    await this.publishGameMessage(
      "allChannelsBySubscriberId",
      userId,
      userId,
      message
    );
  }

  async onPlayerMessage(
    sessionId: string | null,
    message: GameMessageFromClient,
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

    if (message.event === "rename") {
      await this.onPlayerRename(userId, message.data.name, message);
    }
    if (message.event === "createRoom") {
      await this.onPlayerCreateRoom(
        userId,
        options?.onSubscribe,
        options?.onReply
      );
    }
    if (message.event === "joinRoom") {
      await this.onPlayerJoinRoom(
        userId,
        message.data.roomId,
        message,
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
      await this.onPlayerGetRoomStatus(userId, message.data.roomId);
    }
    if (message.event === "input") {
      await this.onPlayerInput(userId, message);
    }
  }
}

export default GameLogicController;
