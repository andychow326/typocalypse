interface ErrorMessage {
  reason: string;
  target: Record<string, unknown>;
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
  constructor(sessionId?: string) {
    super("SessionNotFoundError", {
      reason: "session not found",
      target: { sessionId }
    });
  }
}

export class UserNotFoundError extends CustomError {
  constructor(userId: string) {
    super("UserNotFoundError", {
      reason: "user not found",
      target: { userId }
    });
  }
}

export class RoomNotFoundError extends CustomError {
  constructor(roomId: string) {
    super("RoomNotFoundError", {
      reason: "room not found",
      target: { roomId }
    });
  }
}

export class UserNotRoomHostError extends CustomError {
  constructor(userId: string) {
    super("UserNotRoomHostError", {
      reason: "user is not room host",
      target: { userId }
    });
  }
}

export class InputLengthNoMatchedError extends CustomError {
  constructor(input: string, expectedLength: number) {
    super("InputLengthNoMatchedError", {
      reason: "input lenght too long",
      target: { input, expectedLength }
    });
  }
}

export class RoomAlreadyFullError extends CustomError {
  constructor(roomId: string) {
    super("RoomAlreadyFullError", {
      reason: "room already full",
      target: { roomId }
    });
  }
}
