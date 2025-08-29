import winston from "winston"

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`
    })
  ),
  transports: [
    new winston.transports.Console(),
    // Optionally add file transport for persistent logs
    // new winston.transports.File({ filename: "logs/mcp-server.log" })
  ]
})

export default logger
