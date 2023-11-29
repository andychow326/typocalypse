import pino, { Logger } from "pino";
import pinoPretty from "pino-pretty";
import { LOG_LEVEL } from "./constants";

export function getLogger(name: string): Logger {
  const stream = pinoPretty({ colorize: true });
  const logger = pino(
    {
      name: name,
      level: LOG_LEVEL,
    },
    stream
  );
  return logger;
}
