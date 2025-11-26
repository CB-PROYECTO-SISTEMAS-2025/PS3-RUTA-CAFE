import express from "express";
import { maybeAuth } from "../middlewares/maybeAuth.js";
import { verifyAdmin } from "../middlewares/authMiddleware.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  listAdsAdmin, listAdsPublic, getAdCtrl, createAdCtrl, updateAdCtrl, deleteAdCtrl
} from "../controllers/advertisingController.js";

// 👉 Asegurar carpeta de uploads/ads
const uploadDir = path.join(process.cwd(), "uploads", "ads");
fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage para ads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `ad-${unique}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten imágenes"));
  },
});

const router = express.Router();

// Público: solo activas + vigentes
router.get("/public", maybeAuth, listAdsPublic);

// Admin: CRUD (create/update aceptan archivo 'image')
router.get("/", verifyAdmin, listAdsAdmin);
router.get("/:id", verifyAdmin, getAdCtrl);
router.post("/", verifyAdmin, upload.single("image"), createAdCtrl);
router.put("/:id", verifyAdmin, upload.single("image"), updateAdCtrl);
router.delete("/:id", verifyAdmin, deleteAdCtrl);

export default router;
