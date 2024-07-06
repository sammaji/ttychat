import winston from "winston";
import util from "util";

const { format, createLogger, transports, config: { npm: { levels } } } = winston

const combineMessages = format((info, opts) => {
    info.message = util.format(
        info.message,
        ...(info[Symbol.for("splat")] || [])
    );
    return info;
})

/******* Define Transports *******/
/**
 * Default Winston Logging Levels -
 * (Lower value has higher priority)
 *   error: 0
 *   warn: 1
 *   info: 2
 *   http: 3
 *   verbose: 4
 *   debug: 5
 *   silly: 6
 */
const consoleTransport = new transports.Console({
    level: "silly",  // log data if it's level is higher or equal to this level
    handleExceptions: true,
    format: format.combine(
        format.errors({ stack: true }),
        combineMessages(),
        format.timestamp({ format: "HH:mm:ss.SSS" }),
        format.colorize(),
        format.printf(
            ({ level, message, timestamp, stack }) =>
                `${timestamp} ${level}: ${message} ${stack || ""}`
        )
    ),
});

// The file transport logs all debug level or higher data.
// Ideal for production logging and integrating with APM & Monitering tools
const fileTransport = new transports.File({
    level: "debug",
    filename: "./logs/server.log",
    handleExceptions: true,
});

const logger = createLogger({
    levels: levels,
    defaultMeta: {
        environment: process.env.NODE_ENV || "local",
    },
    transports: [fileTransport, consoleTransport],
    format: format.combine(
        format.errors({ stack: true }),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        format.json({ space: 2 }),
        format.prettyPrint()
    ),
});

export default logger;