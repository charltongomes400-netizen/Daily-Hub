import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import expensesRouter from "./expenses";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tasks", tasksRouter);
router.use("/expenses", expensesRouter);
router.use("/subscriptions", subscriptionsRouter);

export default router;
