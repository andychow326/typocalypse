import ClockTimer from "@gamestdio/timer";
import { Redis } from "ioredis";
import PubSubService from "../services/PubSubService";
import GameService from "../services/GameService";
import RoomService from "../services/RoomService";
import { getRedisConnection } from "../redis";
import {
  GameMessageFromClient,
  GameMessageFromWorker,
  RoomInGame
} from "../types";
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
  onTerminate?: () => void;
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

  private onTerminate?: () => void;

  private clientReadyMap: Record<string, boolean>;

  constructor(roomId: string, options?: GameLoopWorkerOptions) {
    this.roomId = roomId;
    this.redis = options?.redis ?? getRedisConnection();
    this.clock = new ClockTimer();
    this.pubsubService = options?.pubsubService ?? new PubSubService();
    this.gameService = options?.gameService ?? new GameService(this.redis);
    this.roomService = options?.roomService ?? new RoomService(this.redis);
    this.onTerminate = options?.onTerminate;
    this.clientReadyMap = {};
  }

  onClientReady(userId: string) {
    this.clientReadyMap[userId] = true;
  }

  async onMessage(userId: string, message: GameMessageFromClient) {
    if (message.event === "ready") {
      this.onClientReady(userId);
    }
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

  async checkClientReady() {
    const room = await this.getRoom();
    this.currentRoomData = room;

    const ready = Object.entries(this.currentRoomData.users)
      .filter(([userId, _]) => this.clientReadyMap[userId])
      .map(([_, user]) => user);
    const notReady = Object.entries(this.currentRoomData.users)
      .filter(([userId, _]) => !this.clientReadyMap[userId])
      .map(([_, user]) => user);

    if (notReady.length > 0) {
      const message: GameMessageFromWorker = {
        event: "waitingClientGameWorldReady",
        data: { ready, notReady }
      };
      await this.publishGameMessage(message);
      return false;
    }
    return true;
  }

  async beforeStartRound() {
    let readyToStart = false;
    while (!readyToStart) {
      await delay(500);
      const clientReady = await this.checkClientReady();
      readyToStart = clientReady;
    }
    await delay(3000);
    this.startRound();
  }

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
    await this.beforeStartRound();
  }

  terminate() {
    this.clock.stop();
    this.clock.clear();
    clearInterval(this.simulationInterval);

    this.onTerminate?.();
    logger.info({ roomId: this.roomId }, "game loop worker closed");
  }
}

export default GameLoopWorker;
