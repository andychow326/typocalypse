interface ErrorMessage {
  reason: string;
  target: Record<string, any>;
}

class CustomError extends Error {
  public errorMessage: ErrorMessage;

  constructor(name: string, errorMessage: ErrorMessage) {
    super(errorMessage.reason);
    this.name = name;
    this.errorMessage = errorMessage;
  }

  toJsonString(): string {
    return JSON.stringify({ event: "error", ...this.errorMessage });
  }
}

export class SessionNotFoundError extends CustomError {
  constructor(sessionId: string | null) {
    super("SessionNotFoundError", {
      reason: "session not found",
      target: { sessionId: sessionId },
    });
  }
}

export class UserNotFoundError extends CustomError {
  constructor(userId: string) {
    super("UserNotFoundError", {
      reason: "user not found",
      target: { userId: userId },
    });
  }
}

export class RoomNotFoundError extends CustomError {
  constructor(roomId: string) {
    super("RoomNotFoundError", {
      reason: "room not found",
      target: { roomId: roomId },
    });
  }
}

export class UserNotRoomHostError extends CustomError {
  constructor(userId: string) {
    super("UserNotRoomHostError", {
      reason: "user is not room host",
      target: { userId: userId },
    });
  }
}
