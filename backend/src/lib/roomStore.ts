import type { WebSocket } from "ws";
import { randomUUID } from "crypto";

export type Participant = {
  id: string;
  name: string;
  isHost: boolean;
  ws: WebSocket;
};

export type ShotPhoto = {
  participantId: string;
  name: string;
  data: string;
};

export type Shot = {
  shotIndex: number;
  photos: ShotPhoto[];
};

export type RoomStatus = "waiting" | "countdown" | "capturing" | "done";

export type Room = {
  id: string;
  groupSize: number;
  hostId: string;
  participants: Participant[];
  status: RoomStatus;
  shots: Shot[];
  currentShotIndex: number;
  pendingPhotos: Map<string, ShotPhoto>;
  countdownTimer?: ReturnType<typeof setTimeout>;
};

const rooms = new Map<string, Room>();

const TOTAL_SHOTS = 4;

export function createRoom(groupSize: number): { roomId: string; hostId: string } {
  const roomId = randomUUID().slice(0, 8).toUpperCase();
  const hostId = randomUUID();
  const room: Room = {
    id: roomId,
    groupSize,
    hostId,
    participants: [],
    status: "waiting",
    shots: [],
    currentShotIndex: 0,
    pendingPhotos: new Map(),
  };
  rooms.set(roomId, room);
  return { roomId, hostId };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomInfo(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    roomId: room.id,
    groupSize: room.groupSize,
    status: room.status,
    participantCount: room.participants.length,
  };
}

export function addParticipant(room: Room, participant: Participant): void {
  room.participants.push(participant);
}

export function removeParticipant(room: Room, participantId: string): void {
  room.participants = room.participants.filter((p) => p.id !== participantId);
  if (room.participants.length === 0) {
    rooms.delete(room.id);
  }
}

export function broadcastToRoom(room: Room, message: object): void {
  const payload = JSON.stringify(message);
  for (const p of room.participants) {
    if (p.ws.readyState === 1) {
      p.ws.send(payload);
    }
  }
}

export function buildRoomStateMessage(room: Room) {
  return {
    type: "room_state",
    roomId: room.id,
    groupSize: room.groupSize,
    status: room.status,
    participants: room.participants.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
    })),
    shots: room.shots,
    currentShotIndex: room.currentShotIndex,
  };
}

export function startSession(room: Room): void {
  if (room.status !== "waiting") return;
  room.shots = [];
  room.currentShotIndex = 0;
  runCountdownForShot(room);
}

function runCountdownForShot(room: Room): void {
  room.status = "countdown";
  broadcastToRoom(room, { type: "countdown", count: 3, shotIndex: room.currentShotIndex, totalShots: TOTAL_SHOTS });

  let count = 2;
  const tick = () => {
    broadcastToRoom(room, { type: "countdown", count, shotIndex: room.currentShotIndex, totalShots: TOTAL_SHOTS });
    if (count === 0) {
      room.status = "capturing";
      room.pendingPhotos = new Map();
      broadcastToRoom(room, { type: "capture", shotIndex: room.currentShotIndex });
    } else {
      count--;
      room.countdownTimer = setTimeout(tick, 1000);
    }
  };

  room.countdownTimer = setTimeout(tick, 1000);
}

export function submitPhoto(room: Room, participantId: string, data: string): void {
  if (room.status !== "capturing") return;

  const participant = room.participants.find((p) => p.id === participantId);
  if (!participant) return;

  room.pendingPhotos.set(participantId, { participantId, name: participant.name, data });

  const allSubmitted = room.participants.every((p) => room.pendingPhotos.has(p.id));
  if (!allSubmitted) return;

  const photos = Array.from(room.pendingPhotos.values());
  const shot: Shot = { shotIndex: room.currentShotIndex, photos };
  room.shots.push(shot);

  broadcastToRoom(room, { type: "shot_complete", shotIndex: room.currentShotIndex, photos });

  room.currentShotIndex++;

  if (room.currentShotIndex >= TOTAL_SHOTS) {
    room.status = "done";
    broadcastToRoom(room, { type: "session_complete", shots: room.shots });
  } else {
    setTimeout(() => runCountdownForShot(room), 2000);
  }
}
