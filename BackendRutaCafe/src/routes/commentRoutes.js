import express from "express";
import { commentController } from "../controllers/commentController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Crear comentario
router.post("/", commentController.create);

// Obtener comentarios por lugar
router.get("/place/:place_id", commentController.getByPlaceId);

// Actualizar comentario
router.put("/:id", commentController.update);

// Eliminar comentario
router.delete("/:id", commentController.delete);

export default router;