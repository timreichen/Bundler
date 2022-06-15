import { colors } from "../deps.ts";
import { ConsoleLogger } from "./console_logger.ts";

export interface Message {
  logLevel: number;
  data: unknown[];
}

export class DetailLogger extends ConsoleLogger {
  #messages: Message[] = [];
  flushLogLevel = ConsoleLogger.logLevels.info;

  error(...data: unknown[]) {
    if (this.flushLogLevel > ConsoleLogger.logLevels.error) {
      this.#messages.push({ logLevel: ConsoleLogger.logLevels.error, data });
    } else {
      super.error(...data);
      this.#flush();
    }
  }
  warn(...data: unknown[]) {
    if (this.flushLogLevel > ConsoleLogger.logLevels.warn) {
      this.#messages.push({ logLevel: ConsoleLogger.logLevels.warn, data });
    } else {
      super.warn(...data);
      this.#flush();
    }
  }
  info(...data: unknown[]) {
    if (this.flushLogLevel > ConsoleLogger.logLevels.info) {
      this.#messages.push({ logLevel: ConsoleLogger.logLevels.info, data });
    } else {
      super.info(...data);
      this.#flush();
    }
  }
  debug(...data: unknown[]) {
    if (this.flushLogLevel > ConsoleLogger.logLevels.debug) {
      this.#messages.push({ logLevel: ConsoleLogger.logLevels.debug, data });
    } else {
      super.debug(...data);
      this.#flush();
    }
  }
  trace(...data: unknown[]) {
    if (this.flushLogLevel > ConsoleLogger.logLevels.trace) {
      this.#messages.push({ logLevel: ConsoleLogger.logLevels.trace, data });
    } else {
      super.trace(...data);
      this.#flush();
    }
  }

  #flush() {
    this.#messages.forEach((message) => {
      switch (message.logLevel) {
        case ConsoleLogger.logLevels.error: {
          super.error(colors.dim("→"), ...message.data);
          break;
        }
        case ConsoleLogger.logLevels.warn: {
          super.warn(colors.dim("→"), ...message.data);
          break;
        }
        case ConsoleLogger.logLevels.info: {
          super.info(colors.dim("→"), ...message.data);
          break;
        }
        case ConsoleLogger.logLevels.debug: {
          super.debug(colors.dim("→"), ...message.data);
          break;
        }
        case ConsoleLogger.logLevels.trace: {
          super.trace(colors.dim("→"), ...message.data);
          break;
        }
      }
      this.#messages = [];
    });
  }
}
