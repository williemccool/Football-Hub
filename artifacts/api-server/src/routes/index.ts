import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersV1 from "./v1/users";
import stateV1 from "./v1/state";
import replaysV1 from "./v1/replays";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1/users", usersV1);
router.use("/v1/state", stateV1);
router.use("/v1/replays", replaysV1);

export default router;
