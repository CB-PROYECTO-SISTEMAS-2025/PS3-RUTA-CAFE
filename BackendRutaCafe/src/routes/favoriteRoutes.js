// routes/favoriteRoutes.js
import express from "express";
import { favoriteController } from "../controllers/favoriteController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Agregar a favoritos
router.post("/", favoriteController.add);

// Eliminar de favoritos
router.delete("/", favoriteController.remove);

// Toggle favorito
router.post("/toggle", favoriteController.toggle);

// Obtener favoritos del usuario
router.get("/user", favoriteController.getUserFavorites);

// Verificar si un lugar es favorito
router.get("/check/:place_id", favoriteController.checkFavorite);

// Contar favoritos de un lugar
router.get("/count/:place_id", favoriteController.getFavoriteCount);

export default router;