import ClockTimer from "@gamestdio/timer";
import PubSubService from "../services/PubSubService";
import GameService from "../services/GameService";
import RoomService from "../services/RoomService";
import { Redis } from "ioredis";
import { getRedisConnection } from "../redis";
import { GameMessageFromWorker, RoomInGame } from "../types";
import { RoomNotFoundError } from "../errors";

declare var self: Worker;

declare module "bun" {
  interface Env {
    ROOM_ID: string;
  }
}

const DEFAULT_SIMULATION_INTERVAL = 1000 / 60; // 60fps (16.66ms)

type SimulationCallback = (deltaTime: number) => Promise<void>;

class GameLoopWorker {
  private roomId: string;
  private currentRoomData!: RoomInGame;

  private clock: ClockTimer;
  private simulationInterval?: Timer;

  private redis: Redis;
  private pubsubService: PubSubService;
  private gameService: GameService;
  private roomService: RoomService;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.redis = getRedisConnection();
    this.clock = new ClockTimer();
    this.pubsubService = new PubSubService();
    this.gameService = new GameService(this.redis);
    this.roomService = new RoomService(this.redis);
  }

  async getRoom(): Promise<RoomInGame> {
    const room = await this.roomService.getRoomStatus(this.roomId);
    if (room == null || room.state != "in-game") {
      throw new RoomNotFoundError(this.roomId);
    }
    return room;
  }

  async publishGameMessage(message: GameMessageFromWorker) {
    await this.pubsubService.publish(this.roomId, JSON.stringify(message));
  }

  setSimulationInterval(
    onTickCallback?: SimulationCallback,
    interval: number = DEFAULT_SIMULATION_INTERVAL
  ) {
    if (this.simulationInterval != null) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }

    if (onTickCallback != null) {
      this.simulationInterval = setInterval(async () => {
        this.clock.tick();
        await onTickCallback(this.clock.deltaTime);
      }, interval);
    }
  }

  async sendRoundRemainingTime() {
    if (
      this.clock.elapsedTime <=
      this.currentRoomData.roundWaitDurationSeconds * 1000
    ) {
      await this.publishGameMessage({
        event: "remainingTime",
        data: {
          type: "waitForRoundStart",
          remainingTime:
            this.currentRoomData.roundWaitDurationSeconds * 1000 -
            this.clock.elapsedTime,
        },
      });
    } else if (
      this.clock.elapsedTime <=
      this.currentRoomData.roundWaitDurationSeconds * 1000 +
        this.currentRoomData.roundDurationSeconds * 1000
    ) {
      await this.publishGameMessage({
        event: "remainingTime",
        data: {
          type: "round",
          remainingTime:
            this.currentRoomData.roundWaitDurationSeconds * 1000 +
            this.currentRoomData.roundDurationSeconds * 1000 -
            this.clock.elapsedTime,
        },
      });
    }
  }

  async gameLoop(_deltaTime: number) {}

  startRound() {
    this.clock.start();
    this.setSimulationInterval(this.gameLoop.bind(this));
    this.clock.setInterval(this.sendRoundRemainingTime.bind(this), 100);
  }

  async start() {
    await this.gameService.initializeGameRound(this.roomId);
    const room = await this.getRoom();
    this.currentRoomData = room;

    const startGameMessage: GameMessageFromWorker = {
      event: "startGame",
      data: {
        room: room,
      },
    };
    await this.publishGameMessage(startGameMessage);

    this.startRound();
  }
}

self.onerror = (error) => {
  console.error(error);
  process.exit();
};

const worker = new GameLoopWorker(Bun.env.ROOM_ID);
worker.start();
