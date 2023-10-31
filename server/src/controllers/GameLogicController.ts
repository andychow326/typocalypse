import PubSubService from "../services/PubSubService";
import UserService from "../services/UserService";
import { SessionNotFoundError } from "../errors";
import { GameMessageFromClient, GameMessageFromServer } from "../types";

class GameLogicController {
  private pubsubService: PubSubService;
  private userService: UserService;

  constructor() {
    this.pubsubService = new PubSubService();
    this.userService = new UserService();
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
    const { sessionId: finalSessionId, userId } =
      await this.userService.getOrCreateUserSession(sessionId);
    const user = await this.userService.getUserByUserId(userId);
    return {
      sessionId: finalSessionId,
      message: {
        event: sessionId === finalSessionId ? "validSession" : "renewSession",
        data: {
          sessionId: finalSessionId,
        },
        user: {
          id: userId,
          name: user?.name ?? "",
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

  async onPlayerJoinRoom(
    userId: string,
    roomId: string,
    message: GameMessageFromClient,
    onSubscribe?: (channel: string, message: string) => void
  ): Promise<void> {
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
    await this.publishGameMessage("singleChannel", userId, roomId, message);
    await this.pubsubService.unsubscribe(userId, roomId);
  }

  async onPlayerLeaveGame(sessionId: string | null): Promise<void> {
    if (sessionId == null) {
      return;
    }
    const userId = await this.userService.getUserIdBySessionId(sessionId);
    if (userId == null) {
      return;
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
    options?: { onSubscribe?: (channel: string, message: string) => void }
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
    if (message.event === "input") {
      await this.onPlayerInput(userId, message);
    }
  }
}

export default GameLogicController;
