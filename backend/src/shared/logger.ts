import { createLogger, format, transports } from 'winston';

const { combine, timestamp, label, printf } = format;

const logFormat = printf(({ message, label, timestamp }) => {
  return `${timestamp} [${label}] ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(label({ label: 'INFO' }), timestamp(), logFormat),
  transports: [new transports.Console()],
});

const errorLogger = createLogger({
  level: 'error',
  format: combine(label({ label: 'ERROR' }), timestamp(), logFormat),
  transports: [new transports.Console()],
});

export { logger, errorLogger };
