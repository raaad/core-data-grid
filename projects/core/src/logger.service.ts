export enum LogLevel {
  Trace,
  Debug,
  Info,
  Warn,
  Error,
  Fatal
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export abstract class Logger {
  abstract trace(message: any, ...additional: any[]): void;

  abstract debug(message: any, ...additional: any[]): void;

  abstract info(message: any, ...additional: any[]): void;

  abstract warn(message: any, ...additional: any[]): void;

  abstract error(message: any, ...additional: any[]): void;

  abstract fatal(message: any, ...additional: any[]): void;
}
