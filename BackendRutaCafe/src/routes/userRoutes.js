import express from "express";
import multer from "multer";
import { 
  getProfile, 
  updateProfile, 
  deleteProfile, 
  updateProfilePhoto, 
  removeProfilePhoto,
  getUsersByAdminCity, 
  updateUserRole,
  getAllUsers, 
  getUsersBySpecificCity, 
  getCities 
} from "../controllers/userController.js";
import { changePassword } from "../controllers/userController.js";
import { verifyToken, verifyAdmin } from "../middlewares/authMiddleware.js";
import { getDashboardData } from "../controllers/dashboardController.js"; 

const router = express.Router();

// Configurar multer para manejar archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Todas las rutas de usuario requieren token
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

// ✅ RUTA ACTUALIZADA - acepta tanto FormData como JSON
router.put("/profile/photo", verifyToken, upload.single('photo'), updateProfilePhoto);

router.delete("/profile/photo", verifyToken, removeProfilePhoto);
router.delete("/profile", verifyToken, deleteProfile);

router.get("/users", verifyAdmin, getUsersByAdminCity);
router.put("/users/:userId", verifyAdmin, updateUserRole);
router.get("/users/all", verifyAdmin, getAllUsers);
router.get("/users/:cityId", verifyAdmin, getUsersBySpecificCity);
router.get("/cities", verifyAdmin, getCities);

// Ruta para el dashboard (solo admin)
router.get("/dashboard", verifyAdmin, getDashboardData);
router.put("/profile/password", verifyToken, changePassword);
export default router;