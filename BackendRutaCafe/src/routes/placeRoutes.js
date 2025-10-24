// src/routes/placeRoutes.js
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
  checkPendingPlaces
} from "../controllers/placeController.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads", "places");
fs.mkdirSync(uploadDir, { recursive: true });

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

// Rutas públicas
router.get("/", maybeAuth, getPlacesController);
router.get("/route/:routeId", maybeAuth, getPlacesByRouteController);
router.get("/:id", maybeAuth, getPlaceByIdController);

// Rutas protegidas para técnicos
router.post("/", verifyToken, upload.single("image"), createPlaceController);
router.put("/:id", verifyToken, upload.single("image"), updatePlaceController);
router.delete("/:id", verifyToken, deletePlaceController);
router.get("/check/pending", verifyToken, checkPendingPlaces);

// Rutas de administración
router.get("/admin/pending", verifyAdmin, getPendingPlacesController);
router.get("/admin/city", verifyAdmin, getPlacesByAdminCity);
router.get("/admin/city/:cityId", verifyAdmin, getPlacesBySpecificCity);
router.put("/admin/:id/status", verifyAdmin, approveRejectPlace);

console.log("✅ placeRoutes: GET públicos con maybeAuth, POST/PUT/DELETE con verifyToken");
export default router;