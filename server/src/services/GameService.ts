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
import { randomWords } from "../utils/random";
import { RoomWord } from "../types";

class GameService {
  private redis: Redis;
  private roomService: RoomService;

  constructor(redis?: Redis) {
    this.redis = redis ?? getRedisConnection();
    this.roomService = new RoomService(this.redis);
  }

  async initializeGameRound(userId: string, roomId: string) {
    const room = await this.roomService.getRoomStatus(roomId);
    if (room == null) {
      throw new RoomNotFoundError(roomId);
    }
    if (room.hostId !== userId) {
      throw new UserNotRoomHostError(userId);
    }

    let pipe = this.redis.multi();

    const roomWords: RoomWord[] = [];
    for (const userId in room.users) {
      const words = randomWords({ count: 4 });
      words.forEach((word) => {
        roomWords.push({
          userId: userId,
          word: word,
        });
      });
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

    room.state = "in-game";
    room.round = 1;
    room.roundDurationSeconds = 20;
    room.roundWaitDurationSeconds = 3;
    room.words = roomWords;

    await pipe
      .call(
        "JSON.SET",
        getRedisBucketKey(RedisBucketKey.room, roomId),
        "$",
        JSON.stringify(room)
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

    await this.redis.call(
      "TS.ADD",
      getRedisBucketKey(RedisBucketKey.inputHistory, roomId, userId),
      "*",
      input.charCodeAt(0)
    );
  }
}

export default GameService;
