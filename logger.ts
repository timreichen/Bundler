export class LogLevel {
  name: string;
  level: number;
  constructor(name: string, level: number) {
    this.name = name;
    this.level = level;
  }
}

export const logLevels = {
  trace: new LogLevel("Trace", 10),
  debug: new LogLevel("Debug", 20),
  info: new LogLevel("Info", 30),
  warn: new LogLevel("Warn", 40),
  error: new LogLevel("Error", 50),
};

export class Logger {
  quiet: boolean;
  logLevel: LogLevel;
  logLevels = logLevels;
  constructor(
    { logLevel, quiet = false }: { logLevel: LogLevel; quiet?: boolean },
  ) {
    this.logLevel = logLevel;
    this.quiet = quiet;
  }
  trace(...data: unknown[]) {
    if (this.quiet || this.logLevel.level > logLevels.trace.level) return;
    console.log(...data);
  }
  debug(...data: unknown[]) {
    if (this.quiet || this.logLevel.level > logLevels.debug.level) return;
    console.debug(...data);
  }
  info(...data: unknown[]) {
    if (this.quiet || this.logLevel.level > logLevels.info.level) return;
    console.info(...data);
  }
  warn(...data: unknown[]) {
    if (this.quiet || this.logLevel.level > logLevels.warn.level) return;
    console.warn(...data);
  }
  error(...data: unknown[]) {
    if (this.quiet || this.logLevel.level > logLevels.error.level) return;
    console.error(...data);
  }
}
