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
  getTechnicianPlaces,
  approveRejectPlace,
  checkPendingPlaces,
} from "../controllers/placeController.js";
import multer from "multer";
import fs from "fs";
import path from "path";

// 👉 Asegurar carpeta de uploads
const uploadDir = path.join(process.cwd(), "uploads", "places");
fs.mkdirSync(uploadDir, { recursive: true });

// Configuración de multer optimizada
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop() || 'jpg';
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `place-${unique}.${ext}`);
  },
});

// Configuración mejorada de multer
const upload = multer({
  storage,
  limits: { 
    fileSize: 15 * 1024 * 1024, // 15MB por archivo
    fieldSize: 25 * 1024 * 1024, // 25MB para fields
    files: 9, // Máximo 9 archivos (1 principal + 8 adicionales)
    fields: 20, // Máximo 20 fields
    headerPairs: 50 // Máximo 50 headers
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 Procesando archivo:', {
      name: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Verificar que sea una imagen
    if (file.mimetype?.startsWith("image/")) {
      cb(null, true);
    } else {
      console.log('❌ Tipo de archivo rechazado:', file.mimetype);
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)`));
    }
  },
});

// Middleware personalizado para manejo de errores de multer
const handleMulterErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.log('❌ Error de Multer:', error.code, error.message);
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          message: "El archivo es demasiado grande. Máximo 15MB por imagen.",
          code: 'FILE_TOO_LARGE'
        });
      
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          message: "Demasiados archivos. Máximo 1 imagen principal y 8 adicionales.",
          code: 'TOO_MANY_FILES'
        });
      
      case 'LIMIT_FIELD_KEY':
      case 'LIMIT_FIELD_VALUE':
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({ 
          message: "Demasiados campos en el formulario.",
          code: 'TOO_MANY_FIELDS'
        });
      
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          message: "Campo de archivo inesperado.",
          code: 'UNEXPECTED_FIELD'
        });
      
      default:
        return res.status(400).json({ 
          message: `Error al subir archivos: ${error.message}`,
          code: 'UPLOAD_ERROR'
        });
    }
  } else if (error) {
    console.log('❌ Error general en upload:', error.message);
    return res.status(400).json({ 
      message: error.message || "Error al procesar los archivos",
      code: 'UPLOAD_PROCESSING_ERROR'
    });
  }
  
  next();
};

const router = express.Router();

// Middleware para configurar timeout y headers
const configureUpload = (req, res, next) => {
  // Configurar timeout más largo para uploads
  req.setTimeout(120000); // 120 segundos (2 minutos)
  
  // Headers para permitir uploads grandes
  res.setHeader('X-Upload-Timeout', '120000');
  
  console.log('🚀 Iniciando upload con configuración:', {
    timeout: '120s',
    maxFiles: 9,
    maxSize: '15MB/file'
  });
  
  next();
};

// Crear lugar (con manejo mejorado de errores)
router.post("/", 
  verifyToken, 
  configureUpload,
  (req, res, next) => {
    console.log('📤 POST /places - Headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    });
    next();
  },
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "additional_images", maxCount: 8 }
  ]),
  handleMulterErrors,
  (req, res, next) => {
    console.log('✅ Upload completado - Archivos recibidos:', {
      mainImage: req.files?.image ? req.files.image.length : 0,
      additionalImages: req.files?.additional_images ? req.files.additional_images.length : 0,
      bodyFields: Object.keys(req.body)
    });
    next();
  },
  createPlaceController
);

// 🟢 GET públicos (visitante o logueado)
router.get("/", maybeAuth, getPlacesController);
router.get("/route/:routeId", maybeAuth, getPlacesByRouteController);
router.get("/:id", maybeAuth, getPlaceByIdController);

// Editar lugar (con manejo mejorado de errores)
router.put("/:id", 
  verifyToken, 
  configureUpload,
  (req, res, next) => {
    console.log('📤 PUT /places/' + req.params.id + ' - Headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    next();
  },
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "additional_images", maxCount: 8 }
  ]),
  handleMulterErrors,
  (req, res, next) => {
    console.log('✅ Upload de edición completado - Archivos:', {
      mainImage: req.files?.image ? req.files.image.length : 0,
      additionalImages: req.files?.additional_images ? req.files.additional_images.length : 0,
      bodyFields: Object.keys(req.body)
    });
    next();
  },
  updatePlaceController
);

// Eliminar lugar
router.delete("/:id", verifyToken, deletePlaceController);

// ✅ Usuario consulta si tiene pendientes (para bloquear en cliente)
router.get("/check/pending", verifyToken, checkPendingPlaces);
router.get("/technician/my-places", verifyToken, getTechnicianPlaces);
// Rutas de administración para lugares pendientes
router.get("/admin/pending", verifyAdmin, getPendingPlacesController);
router.get("/admin/city", verifyAdmin, getPlacesByAdminCity);
router.get("/admin/city/:cityId", verifyAdmin, getPlacesBySpecificCity);
router.put("/admin/:id/status", verifyAdmin, approveRejectPlace);

console.log("✅ placeRoutes: GET públicos con maybeAuth, POST/PUT/DELETE con verifyToken");
export default router;