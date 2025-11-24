import express from "express";
import { likeController } from "../controllers/likeController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Toggle like
router.post("/:place_id/toggle", likeController.toggle);

// Obtener count de likes por lugar
router.get("/:place_id/count", likeController.getCountByPlace);

// Verificar si usuario dio like
router.get("/:place_id/check", likeController.checkUserLike);

// Obtener lugares liked por usuario
router.get("/user/liked", likeController.getUserLikedPlaces);

export default router;