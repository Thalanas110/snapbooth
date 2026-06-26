import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocketServer } from "./lib/wsServer";

const rawPort = process.env["PORT"] ?? "3001";
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
setupWebSocketServer(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
