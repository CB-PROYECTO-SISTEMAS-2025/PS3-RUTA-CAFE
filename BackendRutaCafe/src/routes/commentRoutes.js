// src/routes/commentRoutes.js
import express from "express";
import { commentController } from "../controllers/commentController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { maybeAuth } from "../middlewares/maybeAuth.js";

const router = express.Router();

// GET público (token opcional)
router.get("/place/:place_id", maybeAuth, commentController.getByPlaceId);

// Acciones que sí requieren login
router.post("/", verifyToken, commentController.create);
router.put("/:id", verifyToken, commentController.update);
router.delete("/:id", verifyToken, commentController.delete);

export default router;
