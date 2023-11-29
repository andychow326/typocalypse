import { Redis } from "ioredis";
import {
  RedisBucketKey,
  getRedisBucketKey,
  getRedisConnection,
} from "../redis";
import { randomInt } from "crypto";
import { Room, User } from "../types";
import { ROOM_EXPIRATION_SECONDS } from "../constants";
import { getLogger } from "../logger";

const logger = getLogger("RoomService");

class RoomService {
  private redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis ?? getRedisConnection();
  }

  async getWaitingRooms(): Promise<Room[]> {
    const roomIds = await this.redis.smembers(RedisBucketKey.roomsWaiting);
    let pipe = this.redis.multi();
    roomIds.forEach((roomId) => {
      pipe = pipe.call(
        "JSON.GET",
        getRedisBucketKey(RedisBucketKey.room, roomId),
        "."
      );
    });
    const result = await pipe.exec();
    if (result == null) {
      return [];
    }
    const rooms: Room[] = [];
    roomIds.forEach((_, index) => {
      const room: Room = JSON.parse(result[index][1] as any);
      rooms.push(room);
    });
    return rooms;
  }

  async getRoomStatus(roomId: string): Promise<Room | null> {
    const result = await this.redis
      .multi()
      .call("JSON.GET", getRedisBucketKey(RedisBucketKey.room, roomId), ".")
      .expire(
        getRedisBucketKey(RedisBucketKey.room, roomId),
        ROOM_EXPIRATION_SECONDS
      )
      .exec();
    if (result == null) {
      return null;
    }
    const room: Room = JSON.parse(result[0][1] as any);
    return room;
  }

  async updateRoomStatus(roomId: string, room: Room) {
    await this.redis.call(
      "JSON.SET",
      getRedisBucketKey(RedisBucketKey.room, roomId),
      "$",
      JSON.stringify(room)
    );
  }

  async createRoomId(): Promise<string> {
    while (true) {
      const roomId = randomInt(100000, 999999).toString();
      const isRoomIdExists = await this.redis.exists(
        getRedisBucketKey(RedisBucketKey.room, roomId)
      );
      if (!isRoomIdExists) {
        return roomId;
      }
    }
  }

  async createRoom(user: User): Promise<string> {
    const roomId = await this.createRoomId();
    const data: Room = {
      id: roomId,
      state: "waiting",
      hostId: user.id,
      users: {
        [user.id]: user,
      },
    };
    await this.redis
      .multi()
      .call(
        "JSON.SET",
        getRedisBucketKey(RedisBucketKey.room, roomId),
        "$",
        JSON.stringify(data)
      )
      .call(
        "JSON.SET",
        getRedisBucketKey(RedisBucketKey.user, user.id),
        ".room",
        JSON.stringify(roomId)
      )
      .sadd(RedisBucketKey.roomsWaiting, roomId)
      .expire(
        getRedisBucketKey(RedisBucketKey.room, roomId),
        ROOM_EXPIRATION_SECONDS
      )
      .exec();
    logger.debug({ userId: user.id, roomId }, "create room");
    return roomId;
  }

  async joinRoom(user: User, roomId: string): Promise<void> {
    await this.redis
      .multi()
      .call(
        "JSON.SET",
        getRedisBucketKey(RedisBucketKey.room, roomId),
        `.users.${user.id}`,
        JSON.stringify(user)
      )
      .call(
        "JSON.SET",
        getRedisBucketKey(RedisBucketKey.user, user.id),
        ".room",
        JSON.stringify(roomId)
      )
      .expire(
        getRedisBucketKey(RedisBucketKey.room, roomId),
        ROOM_EXPIRATION_SECONDS
      )
      .exec();
    logger.debug({ userId: user.id, roomId }, "join room");
  }

  async leaveRoom(
    user: User,
    roomId: string
  ): Promise<{ deletedRoomIds: string[] }> {
    let pipe = this.redis.multi();
    if (user.room != null && user.room !== roomId) {
      pipe = pipe.call(
        "JSON.DEL",
        getRedisBucketKey(RedisBucketKey.room, user.room),
        `.users.${user.id}`
      );
    }
    pipe = pipe
      .call(
        "JSON.DEL",
        getRedisBucketKey(RedisBucketKey.room, roomId),
        `.users.${user.id}`
      )
      .call(
        "JSON.DEL",
        getRedisBucketKey(RedisBucketKey.user, user.id),
        ".room"
      );
    await pipe.exec();
    logger.debug({ userId: user.id, roomId }, "leave room");
    if (user.room != null && user.room !== roomId) {
      return await this.finalizeRooms(user.room, roomId);
    } else {
      return await this.finalizeRooms(roomId);
    }
  }

  async finalizeRooms(
    ...roomIds: string[]
  ): Promise<{ deletedRoomIds: string[] }> {
    let pipe = this.redis.multi();
    roomIds.forEach((roomId) => {
      pipe = pipe.call(
        "JSON.GET",
        getRedisBucketKey(RedisBucketKey.room, roomId),
        "."
      );
    });
    const rooms = await pipe.exec();
    if (rooms == null) {
      return { deletedRoomIds: [] };
    }
    let updatableRooms: Room[] = [];
    let deletableRoomIds: string[] = [];
    rooms.forEach((data) => {
      const roomJson = data[1];
      if (roomJson == null) {
        return;
      }
      const room: Room = JSON.parse(roomJson as any);
      const userIds = Object.keys(room.users);
      if (userIds.length > 0) {
        const newHostId = userIds[0];
        room.hostId = newHostId;
        logger.debug({ roomId: room.id, newHostId }, "room host update");
        updatableRooms.push(room);
        return;
      }
      logger.debug({ roomId: room.id }, "delete empty room");
      deletableRoomIds.push(room.id);
    });
    pipe = this.redis.multi();
    updatableRooms.forEach((room) => {
      pipe = pipe.call(
        "JSON.SET",
        getRedisBucketKey(RedisBucketKey.room, room.id),
        "$",
        JSON.stringify(room)
      );
    });
    if (deletableRoomIds.length > 0) {
      let inputHistoryPipe = this.redis.multi();
      deletableRoomIds.forEach((roomId) => {
        inputHistoryPipe = inputHistoryPipe
          .smembers(getRedisBucketKey(RedisBucketKey.inputHistory, roomId))
          .del(getRedisBucketKey(RedisBucketKey.inputHistory, roomId));
      });
      const inputHistoryPipeResult = await inputHistoryPipe.exec();
      if (inputHistoryPipeResult != null) {
        const inputHistoryIds = inputHistoryPipeResult.flatMap(
          (result) => result[1] as string[]
        );
        if (inputHistoryIds.length > 0) {
          pipe = pipe.del(inputHistoryIds);
        }
      }

      pipe = pipe
        .del(
          deletableRoomIds.map((roomId) =>
            getRedisBucketKey(RedisBucketKey.room, roomId)
          )
        )
        .srem(RedisBucketKey.roomsWaiting, ...deletableRoomIds)
        .srem(RedisBucketKey.roomsInGame, ...deletableRoomIds);
    }
    await pipe.exec();

    return { deletedRoomIds: deletableRoomIds };
  }
}

export default RoomService;
