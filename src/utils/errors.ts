export class BotError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export class ConfigurationError extends BotError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class WebhookError extends BotError {
  constructor(message: string, details?: any) {
    super(message, 'WEBHOOK_ERROR', details);
    this.name = 'WebhookError';
  }
}

export class ThreadError extends BotError {
  constructor(message: string, details?: any) {
    super(message, 'THREAD_ERROR', details);
    this.name = 'ThreadError';
  }
}

export class PermissionError extends BotError {
  constructor(message: string, details?: any) {
    super(message, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
  }
}