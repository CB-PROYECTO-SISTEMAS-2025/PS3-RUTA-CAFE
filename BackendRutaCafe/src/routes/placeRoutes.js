import express from "express";
import { maybeAuth } from "../middlewares/maybeAuth.js";
import { verifyToken, verifyAdmin } from "../middlewares/authMiddleware.js";
import {
  createPlaceController,
  getPlacesController,
  getPlaceByIdController,
  getPlacesByRouteController,
  updatePlaceController,
  deletePlaceController,
  getPlacesByAdminCity,
  getPlacesBySpecificCity,
  getPendingPlacesController,
  approveRejectPlace,
  checkPendingPlaces, // 👈 importar
} from "../controllers/placeController.js";
import multer from "multer";
import fs from "fs";
import path from "path";

// 👉 Asegurar carpeta de uploads
const uploadDir = path.join(process.cwd(), "uploads", "places");
fs.mkdirSync(uploadDir, { recursive: true });

// Configuración de multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `place-${unique}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten imágenes"));
  },
});

const router = express.Router();

// Crear (con imagen principal + adicionales)
router.post("/", verifyToken, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "additional_images", maxCount: 8 }
]), createPlaceController);

// 🟢 GET públicos (visitante o logueado)
router.get("/", maybeAuth, getPlacesController);
router.get("/route/:routeId", maybeAuth, getPlacesByRouteController);
router.get("/:id", maybeAuth, getPlaceByIdController);

// Editar (con imagen principal + adicionales)
router.put("/:id", verifyToken, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "additional_images", maxCount: 8 }
]), updatePlaceController);

router.delete("/:id", verifyToken, deletePlaceController);

// ✅ Usuario consulta si tiene pendientes (para bloquear en cliente)
router.get("/check/pending", verifyToken, checkPendingPlaces);

// Rutas de administración para lugares pendientes
router.get("/admin/pending", verifyAdmin, getPendingPlacesController);
router.get("/admin/city", verifyAdmin, getPlacesByAdminCity);
router.get("/admin/city/:cityId", verifyAdmin, getPlacesBySpecificCity);
router.put("/admin/:id/status", verifyAdmin, approveRejectPlace);

console.log("✅ placeRoutes: GET públicos con maybeAuth, POST/PUT/DELETE con verifyToken");
export default router;
