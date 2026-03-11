import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import expensesRouter from "./expenses";
import subscriptionsRouter from "./subscriptions";
import categoriesRouter from "./categories";
import gymRouter from "./gym";
import owedRouter from "./owed";
import notesRouter from "./notes";
import goalsRouter from "./goals";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/tasks", tasksRouter);
router.use("/expenses", expensesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/gym", gymRouter);
router.use("/owed", owedRouter);
router.use("/notes", notesRouter);
router.use("/goals", goalsRouter);

export default router;
