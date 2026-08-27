import express from "express";
const router = express.Router();

import {
    StartResearch,
    ApproveResearch,
    getAllReports,
    getReportById 
} from "../controllers/researchbot.js"

import { requireFields } from "../middleware/requireFields.js";
import { validateId } from "../middleware/validateId.js";

router.get("/start", StartResearch);
router.post("/approved", requireFields(["threadId", "approved"]),ApproveResearch);
router.get("/reports", getAllReports);
router.get("/report/:id", validateId, getReportById);

export default router;