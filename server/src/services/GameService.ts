import Redis from "ioredis";
import {
  RedisBucketKey,
  getRedisBucketKey,
  getRedisConnection,
} from "../redis";
import RoomService from "./RoomService";
import { RoomNotFoundError, UserNotRoomHostError } from "../errors";
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
}

export default GameService;
