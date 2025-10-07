import express from "express";
import { verifyToken,verifyAdmin} from "../middlewares/authMiddleware.js";
import { maybeAuth } from "../middlewares/maybeAuth.js";
import {
  createRouteController,
  getRoutesController,
  getRouteByIdController,
  updateRouteController,
  deleteRouteController,
  getPendingRoutesController,
  getRoutesByAdminCity,
  getRoutesBySpecificCity,
  approveRejectRoute
} from "../controllers/routeController.js";

const router = express.Router();

// CRUD Rutas
router.post("/", verifyToken,createRouteController); // Crear ruta
router.get("/", maybeAuth, getRoutesController);        // público con contexto de rol
router.get("/:id", maybeAuth, getRouteByIdController);
router.put("/:id", verifyToken, updateRouteController);  // Actualizar
router.delete("/:id", verifyToken, deleteRouteController); // Eliminar

// Nuevas rutas para gestión de rutas pendientes (solo admin)
router.get("/admin/city", verifyAdmin, getRoutesByAdminCity);
router.get("/admin/city/:cityId", verifyAdmin, getRoutesBySpecificCity);
router.put("/admin/:id/status", verifyAdmin, approveRejectRoute);
router.get("/admin/pending", verifyAdmin, getPendingRoutesController);
export default router;
