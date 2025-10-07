<<<<<<< HEAD
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
=======
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
>>>>>>> origin/feature/garcia
