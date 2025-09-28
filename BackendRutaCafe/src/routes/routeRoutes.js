import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createRouteController,
  getRoutesController,
  getRouteByIdController,
  updateRouteController,
  deleteRouteController
} from "../controllers/routeController.js";

const router = express.Router();

// CRUD Rutas
router.post("/", verifyToken,createRouteController); // Crear ruta
router.get("/", verifyToken, getRoutesController);    // Listar todas
router.get("/:id", verifyToken, getRouteByIdController); // Obtener una
router.put("/:id", verifyToken, updateRouteController);  // Actualizar
router.delete("/:id", verifyToken, deleteRouteController); // Eliminar

export default router;
