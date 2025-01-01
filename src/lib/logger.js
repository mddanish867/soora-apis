import { createLogger, transports, format } from 'winston';

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Logger setup
const logger = createLogger({
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new transports.Console(), // Always log to the console
    ...(isProduction
      ? [] // Exclude File transport in production
      : [new transports.File({ filename: 'logs/error.log', level: 'error' })]),
  ],
});

export default logger;
