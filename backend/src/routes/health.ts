import { Router, type IRouter } from "express";

type HealthCheckResponse = {
  status: "ok";
};

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data: HealthCheckResponse = { status: "ok" };
  res.json(data);
});

export default router;
