import { createServer } from "node:http";
// index.ts
import { env } from "@/common/utils/envConfig";
import { app, logger } from "@/server";
import initializeSocket from "@/socket";
import { Server } from "socket.io";
import initializeGameSocketServer from "./game-socket-server/GameSocketServer";

// Create HTTP server that wraps the Express app
const httpServer = createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN, // Adjust as needed
    credentials: true,
  },
});

// Initialize Socket.IO logic
//initializeSocket(io);
initializeGameSocketServer(io);
// Start listening on the specified port
httpServer.listen(env.PORT, () => {
  const { NODE_ENV, HOST, PORT } = env;
  logger.info(`Server (${NODE_ENV}) running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const onCloseSignal = () => {
  logger.info("SIGINT received, shutting down");
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
