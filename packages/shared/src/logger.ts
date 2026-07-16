export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, metadata?: Record<string, string | number | boolean>): void;
  info(message: string, metadata?: Record<string, string | number | boolean>): void;
  warn(message: string, metadata?: Record<string, string | number | boolean>): void;
  error(message: string, metadata?: Record<string, string | number | boolean>): void;
}

export function createLogger(scope: string, enabled = false): Logger {
  const write = (level: LogLevel, message: string, metadata?: Record<string, string | number | boolean>) => {
    if (!enabled && level === "debug") return;
    const output = `[${scope}] ${message}`;
    if (level === "error") console.error(output, metadata ?? "");
    else if (level === "warn") console.warn(output, metadata ?? "");
    else if (level === "info") console.info(output, metadata ?? "");
    else console.debug(output, metadata ?? "");
  };

  return {
    debug: (message, metadata) => write("debug", message, metadata),
    info: (message, metadata) => write("info", message, metadata),
    warn: (message, metadata) => write("warn", message, metadata),
    error: (message, metadata) => write("error", message, metadata),
  };
}
