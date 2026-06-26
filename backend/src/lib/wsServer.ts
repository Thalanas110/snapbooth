import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { URL } from "url";
import { logger } from "./logger";
import {
  getRoom,
  addParticipant,
  removeParticipant,
  broadcastToRoom,
  buildRoomStateMessage,
  startSession,
  submitPhoto,
} from "./roomStore";

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", `http://localhost`);
    const roomId = url.searchParams.get("roomId");
    const participantId = url.searchParams.get("participantId");
    const name = url.searchParams.get("name") ?? "Guest";
    const isHost = url.searchParams.get("isHost") === "true";

    if (!roomId || !participantId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing roomId or participantId" }));
      ws.close();
      return;
    }

    const room = getRoom(roomId);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
      ws.close();
      return;
    }

    if (room.status === "done") {
      ws.send(JSON.stringify({ type: "error", message: "Session already completed" }));
      ws.close();
      return;
    }

    const participant = { id: participantId, name, isHost, ws };
    addParticipant(room, participant);
    logger.info({ roomId, participantId, name, isHost }, "Participant joined");

    ws.send(JSON.stringify(buildRoomStateMessage(room)));
    broadcastToRoom(room, buildRoomStateMessage(room));

    ws.on("message", (raw) => {
      let msg: { type: string; data?: string; shotIndex?: number };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case "start": {
          if (!participant.isHost) {
            ws.send(JSON.stringify({ type: "error", message: "Only the host can start the session" }));
            return;
          }
          if (room.participants.length < 2) {
            ws.send(JSON.stringify({ type: "error", message: "Need at least 2 participants" }));
            return;
          }
          logger.info({ roomId }, "Session started");
          startSession(room);
          broadcastToRoom(room, buildRoomStateMessage(room));
          break;
        }

        case "photo": {
          if (typeof msg.data !== "string") return;
          submitPhoto(room, participantId, msg.data);
          break;
        }

        default:
          break;
      }
    });

    ws.on("close", () => {
      logger.info({ roomId, participantId }, "Participant disconnected");
      removeParticipant(room, participantId);
      if (room.participants.length > 0) {
        broadcastToRoom(room, buildRoomStateMessage(room));
      }
    });

    ws.on("error", (err) => {
      logger.error({ err, roomId, participantId }, "WebSocket error");
    });
  });

  logger.info("WebSocket server attached at /api/ws");
}
