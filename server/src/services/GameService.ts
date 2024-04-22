import Redis from "ioredis";
import { randomUUID } from "crypto";
import {
  RedisBucketKey,
  getRedisBucketKey,
  getRedisConnection
} from "../redis";
import RoomService from "./RoomService";
import {
  InputLengthNoMatchedError,
  RoomNotFoundError,
  UserNotRoomHostError
} from "../errors";
import {
  randomWords,
  randomPositions,
  randomTimeToAttacks
} from "../utils/random";
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
    logger.debug({ roomId }, "initialize game round");
    const room = await this.roomService.getRoomStatus(roomId);
    if (room == null) {
      throw new RoomNotFoundError(roomId);
    }

    let pipe = this.redis.multi();

    const roundDurationSeconds = 20;
    const roundWaitDurationSeconds = 3;

    const userLocation: { x: number; y: number; z: number }[] = [
      { x: -8, y: 0, z: 18 },
      { x: 8, y: 0, z: 18 },
      { x: 4, y: 0, z: 16 },
      { x: -4, y: 0, z: 16 }
    ];

    const roomZombies: RoomZombie[] = [];

    Object.keys(room.users).forEach((userId, i) => {
      room.users[userId].position = userLocation[i];

      const words = randomWords({ count: 4 });
      const positions = randomPositions(words.length);
      const timeToAttacks = randomTimeToAttacks(words.length);
      logger.debug(
        { roomId, userId, words },
        "gerenate room words and zombies"
      );
      words.forEach((_, j) => {
        const zombieId = randomUUID();
        const timeToAttack = timeToAttacks[j] + roundWaitDurationSeconds;
        roomZombies.push({
          zombieId,
          userId,
          word: words[j],
          position: positions[j],
          timeToAttackSeconds: timeToAttack
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
    });

    const updatedRoom: Room = {
      ...room,
      state: "in-game",
      round: 1,
      roundDurationSeconds,
      roundWaitDurationSeconds,
      zombies: roomZombies
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
