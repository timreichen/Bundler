export class LogLevel {
  name: string;
  level: number;
  constructor(name: string, level: number) {
    this.name = name;
    this.level = level;
  }
}

export const logLevels = {
  none: new LogLevel("None", 0),
  // trace: new LogLevel("Trace", 10),
  debug: new LogLevel("Debug", 20),
  info: new LogLevel("Info", 30),
};

export class Logger {
  logLevel: LogLevel;
  constructor({ logLevel }: { logLevel: LogLevel }) {
    this.logLevel = logLevel;
  }
  // trace(...data: any[]) {
  //   const level = logLevels.trace.level;
  //   if (this.logLevel.level > level) return;
  //   console.info(...data);
  // }
  debug(...data: any[]) {
    const level = logLevels.debug.level;
    if (this.logLevel.level > level) return;
    console.info(...data);
  }
  info(...data: any[]) {
    const level = logLevels.info.level;
    if (this.logLevel.level > level) return;
    console.info(...data);
  }
}
