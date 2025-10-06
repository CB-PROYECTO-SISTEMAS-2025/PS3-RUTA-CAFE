// src/routes/routeRoutes.js (tu archivo actual de rutas de "route")
import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { maybeAuth } from "../middlewares/maybeAuth.js";
import {
  createRouteController,
  getRoutesController,
  getRouteByIdController,
  updateRouteController,
  deleteRouteController
} from "../controllers/routeController.js";

const router = express.Router();

// CRUD
router.post("/", verifyToken, createRouteController);
router.get("/", maybeAuth, getRoutesController);        // público con contexto de rol
router.get("/:id", maybeAuth, getRouteByIdController);  // público con contexto de rol
router.put("/:id", verifyToken, updateRouteController);
router.delete("/:id", verifyToken, deleteRouteController);

export default router;
