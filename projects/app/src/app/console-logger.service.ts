/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger, LogLevel } from 'core-data-grid';

export class ConsoleLogger extends Logger {
  constructor(private readonly level: LogLevel) {
    super();
  }

  trace(message: any, ...additional: any[]) {
    if (this.level === LogLevel.Trace) {
      console.groupCollapsed(message);
      console.trace(message, ...additional);
      console.groupEnd();
    }
  }

  debug(message: any, ...additional: any[]) {
    this.level <= LogLevel.Debug && console.debug(message, ...additional);
  }

  info(message: any, ...additional: any[]) {
    this.level <= LogLevel.Info && console.info(message, ...additional);
  }

  warn(message: any, ...additional: any[]) {
    this.level <= LogLevel.Warn && console.warn(message, ...additional);
  }

  error(message: any, ...additional: any[]) {
    this.level <= LogLevel.Error && console.error(message, ...additional);
  }

  fatal(message: any, ...additional: any[]) {
    this.level <= LogLevel.Fatal && console.error(`FATAL: ${message}`, ...additional);
  }
}
