import Redis from "ioredis";
import {
  RedisBucketKey,
  getRedisBucketKey,
  getRedisConnection,
} from "../redis";
import RoomService from "./RoomService";
import {
  InputLengthNoMatchedError,
  RoomNotFoundError,
  UserNotRoomHostError,
} from "../errors";
import { randomWords, randomPositions } from "../utils/random";
import { Room, RoomWord, RoomZombie } from "../types";
import { getLogger } from "../logger";

const logger = getLogger("GameService");

class GameService {
  private redis: Redis;
  private roomService: RoomService;

  constructor(redis?: Redis) {
    this.redis = redis ?? getRedisConnection();
    this.roomService = new RoomService(this.redis);
  }

  async initializeGameRound(roomId: string) {
    logger.debug({ roomId: roomId }, "initialize game round");
    const room = await this.roomService.getRoomStatus(roomId);
    if (room == null) {
      throw new RoomNotFoundError(roomId);
    }

    let pipe = this.redis.multi();

    const roomZombies: RoomZombie[] = [];
    for (const userId in room.users) {
      const words = randomWords({ count: 4 });
      const positions = randomPositions(words.length);
      logger.debug({ roomId, userId, words }, "gerenate room words and zombies");
      for (let i = 0; i < words.length; i++) {
        roomZombies.push({
          userId: userId,
          word: words[i],
          position: positions[i],
        });
      }

      pipe = pipe
        .call(
          "TS.CREATE",
          getRedisBucketKey(RedisBucketKey.inputHistory, roomId, userId)
        )
        .sadd(
          getRedisBucketKey(RedisBucketKey.inputHistory, roomId),
          getRedisBucketKey(RedisBucketKey.inputHistory, roomId, userId)
        );
    }

    const updatedRoom: Room = {
      ...room,
      state: "in-game",
      round: 1,
      roundDurationSeconds: 20,
      roundWaitDurationSeconds: 3,
      zombies: roomZombies,
    };

    await pipe
      .call(
        "JSON.SET",
        getRedisBucketKey(RedisBucketKey.room, roomId),
        "$",
        JSON.stringify(updatedRoom)
      )
      .srem(RedisBucketKey.roomsWaiting, roomId)
      .sadd(RedisBucketKey.roomsInGame, roomId)
      .exec();
  }

  async handleGameInput(userId: string, roomId: string, input: string) {
    if (input.length !== 1) {
      throw new InputLengthNoMatchedError(input, 1);
    }
    const room = await this.roomService.getRoomStatus(roomId);
    if (room == null || room.state !== "in-game") {
      throw new RoomNotFoundError(roomId);
    }

    logger.debug({ roomId, userId, input }, "handle game input");

    await this.redis.call(
      "TS.ADD",
      getRedisBucketKey(RedisBucketKey.inputHistory, roomId, userId),
      "*",
      input.charCodeAt(0)
    );
  }
}

export default GameService;
