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
    return JSON.stringify(this.errorMessage);
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
