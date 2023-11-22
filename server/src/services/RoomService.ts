import { Redis } from "ioredis";
import {
  RedisBucketKey,
  getRedisBucketKey,
  getRedisConnection,
} from "../redis";
import { randomInt } from "crypto";
import { Room, User } from "../types";
import { ROOM_EXPIRATION_SECONDS } from "../constants";

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
  }

  async leaveRoom(user: User, roomId: string): Promise<void> {
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
    if (user.room != null && user.room !== roomId) {
      await this.finalizeRooms(user.room, roomId);
    } else {
      await this.finalizeRooms(roomId);
    }
  }

  async finalizeRooms(...roomIds: string[]): Promise<void> {
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
      return;
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
        room.hostId = userIds[0];
        updatableRooms.push(room);
        return;
      }
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
    await pipe
      .del(
        deletableRoomIds.map((roomId) =>
          getRedisBucketKey(RedisBucketKey.room, roomId)
        )
      )
      .srem(RedisBucketKey.roomsWaiting, ...deletableRoomIds)
      .srem(RedisBucketKey.roomsInGame, ...deletableRoomIds)
      .exec();
  }
}

export default RoomService;
