import { Router, type IRouter } from "express";
import { createRoom, getRoomInfo } from "../lib/roomStore";

const router: IRouter = Router();

router.post("/rooms", async (req, res): Promise<void> => {
  const { groupSize } = req.body as { groupSize?: unknown };

  const size = Number(groupSize);
  if (!size || size < 2 || size > 6 || !Number.isInteger(size)) {
    res.status(400).json({ error: "groupSize must be an integer between 2 and 6" });
    return;
  }

  const { roomId, hostId } = createRoom(size);
  req.log.info({ roomId, groupSize: size }, "Room created");
  res.status(201).json({ roomId, hostId, groupSize: size });
});

router.get("/rooms/:roomId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
  const info = getRoomInfo(rawId);
  if (!info) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(info);
});

export default router;
