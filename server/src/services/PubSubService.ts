import Redis from "ioredis";
import { getRedisConnection } from "../redis";

type Channels = {
  [channel: string]: {
    subscribers: {
      id: string;
      onMessage: (channel: string, message: string) => void;
    }[];
  };
};

class PubSubService {
  private subscriber: Redis;
  private publisher: Redis;
  private channels: Channels;

  constructor() {
    this.subscriber = getRedisConnection();
    this.publisher = getRedisConnection();
    this.channels = {};

    this.subscriber.on("message", (channel: string, message: string) => {
      const c = this.channels[channel];
      if (c != null) {
        c.subscribers.forEach((s) => s.onMessage(channel, message));
      }
    });
  }

  async subscribe(
    subscriberId: string,
    channel: string,
    onMessage: (channel: string, message: string) => void
  ) {
    if (this.channels[channel] == null) {
      this.channels[channel] = { subscribers: [] };
      await this.subscriber.subscribe(channel);
    }
    if (
      !this.channels[channel].subscribers.find((s) => s.id === subscriberId)
    ) {
      this.channels[channel].subscribers.push({
        id: subscriberId,
        onMessage: onMessage,
      });
    }
  }

  async unsubscribe(subscriberId: string, channel?: string) {
    if (channel == null) {
      Object.keys(this.channels).forEach((c) => {
        this.channels[c].subscribers = this.channels[c].subscribers.filter(
          (s) => s.id !== subscriberId
        );
      });
      Object.keys(this.channels).forEach(async (c) => {
        if (this.channels[c].subscribers.length === 0) {
          delete this.channels[c];
          await this.subscriber.unsubscribe(c);
        }
      });
    }
    if (channel != null && this.channels[channel] != null) {
      this.channels[channel].subscribers = this.channels[
        channel
      ].subscribers.filter((s) => s.id !== subscriberId);
      if (this.channels[channel].subscribers.length === 0) {
        delete this.channels[channel];
        await this.subscriber.unsubscribe(channel);
      }
    }
  }

  async publish(channel: string, message: string) {
    await this.publisher.publish(channel, message);
    console.log(Object.keys(this.channels));
  }

  findChannelsBySubscriberId(subscriberId: string): string[] {
    return Object.entries(this.channels)
      .filter(
        ([_key, value]) =>
          value.subscribers.findIndex((sub) => sub.id === subscriberId) !== -1
      )
      .map(([key, _value]) => key);
  }

  async publishToAllChannelsBySubscriberId(
    subscriberId: string,
    message: string
  ) {
    const channels = this.findChannelsBySubscriberId(subscriberId);
    for (const channel of channels) {
      await this.publish(channel, message);
    }
  }
}

export default PubSubService;
