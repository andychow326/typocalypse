import ClockTimer from "@gamestdio/timer";
import { Redis } from "ioredis";
import PubSubService from "../services/PubSubService";
import GameService from "../services/GameService";
import RoomService from "../services/RoomService";
import { getRedisConnection } from "../redis";
import { GameMessageFromWorker, RoomInGame } from "../types";
import { RoomNotFoundError } from "../errors";
import { getLogger } from "../logger";
import { delay } from "../utils/promise";

const logger = getLogger("GameLoopWorker");

const DEFAULT_SIMULATION_INTERVAL = 1000 / 60; // 60fps (16.66ms)

type SimulationCallback = (deltaTime: number) => Promise<void>;

interface GameLoopWorkerOptions {
  redis?: Redis;
  pubsubService?: PubSubService;
  gameService?: GameService;
  roomService?: RoomService;
}

class GameLoopWorker {
  private roomId: string;

  private currentRoomData!: RoomInGame;

  private clock: ClockTimer;

  private simulationInterval?: Timer;

  private redis: Redis;

  private pubsubService: PubSubService;

  private gameService: GameService;

  private roomService: RoomService;

  constructor(roomId: string, options?: GameLoopWorkerOptions) {
    this.roomId = roomId;
    this.redis = options?.redis ?? getRedisConnection();
    this.clock = new ClockTimer();
    this.pubsubService = options?.pubsubService ?? new PubSubService();
    this.gameService = options?.gameService ?? new GameService(this.redis);
    this.roomService = options?.roomService ?? new RoomService(this.redis);
  }

  async getRoom(): Promise<RoomInGame> {
    const room = await this.roomService.getRoomStatus(this.roomId);
    if (room == null || room.state !== "in-game") {
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

  async heartbeat() {
    try {
      await this.getRoom();
    } catch (error) {
      this.terminate();
    }
  }

  async ping() {
    await this.publishGameMessage({ event: "ping" });
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
            this.clock.elapsedTime
        }
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
            this.clock.elapsedTime
        }
      });
    }
  }

  async gameLoop(_deltaTime: number) {}

  startRound() {
    this.clock.start();
    this.setSimulationInterval(this.gameLoop.bind(this));
    this.clock.setInterval(this.sendRoundRemainingTime.bind(this), 100);
    this.clock.setInterval(this.heartbeat.bind(this), 5000);
    this.clock.setInterval(this.ping.bind(this), 5000);
  }

  async start() {
    await this.gameService.initializeGameRound(this.roomId);
    const room = await this.getRoom();
    this.currentRoomData = room;

    const startGameMessage: GameMessageFromWorker = {
      event: "startGame",
      data: {
        room
      }
    };
    await this.publishGameMessage(startGameMessage);
    await delay(3000);
    this.startRound();
  }

  terminate() {
    this.clock.stop();
    this.clock.clear();
    clearInterval(this.simulationInterval);

    logger.info({ roomId: this.roomId }, "game loop worker closed");
  }
}

export default GameLoopWorker;
