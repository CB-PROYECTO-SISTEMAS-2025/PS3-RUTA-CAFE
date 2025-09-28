import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  createPlaceController,
  getPlacesController,
  getPlaceByIdController,
  getPlacesByRouteController,
  updatePlaceController,
  deletePlaceController
} from "../controllers/placeController.js";
import multer from "multer";

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/places/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'place-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

const router = express.Router();

// CRUD Lugares
router.post("/", verifyToken, upload.single('image'), createPlaceController);
router.get("/", verifyToken, getPlacesController);
router.get("/route/:routeId", verifyToken, getPlacesByRouteController);
router.get("/:id", verifyToken, getPlaceByIdController);
router.put("/:id", verifyToken, upload.single('image'), updatePlaceController);
router.delete("/:id", verifyToken, deletePlaceController);

export default router;