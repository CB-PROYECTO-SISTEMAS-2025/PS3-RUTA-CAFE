import express from "express";
import { verifyToken, verifyAdmin } from "../middlewares/authMiddleware.js";
import { maybeAuth } from "../middlewares/maybeAuth.js";
import multer from "multer";
import fs from "fs";
import path from "path";
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

// 👉 Asegurar carpeta de uploads/routes
const uploadDir = path.join(process.cwd(), "uploads", "routes");
fs.mkdirSync(uploadDir, { recursive: true });

// Configuración de multer para rutas
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `route-${unique}.${ext}`);
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

const router = express.Router(); // 🔥 PRIMERO esto

// 🔥 LUEGO los middleware del router
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// CRUD Rutas
router.post("/", verifyToken, upload.single('image'), createRouteController);
router.get("/", maybeAuth, getRoutesController);
router.get("/:id", maybeAuth, getRouteByIdController);
router.put("/:id", verifyToken, upload.single('image'), updateRouteController);
router.delete("/:id", verifyToken, deleteRouteController);

// Nuevas rutas para gestión de rutas pendientes (solo admin)
router.get("/admin/city", verifyAdmin, getRoutesByAdminCity);
router.get("/admin/city/:cityId", verifyAdmin, getRoutesBySpecificCity);
router.put("/admin/:id/status", verifyAdmin, approveRejectRoute);
router.get("/admin/pending", verifyAdmin, getPendingRoutesController);

export default router;