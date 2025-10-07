import express from "express";
import { getProfile, updateProfile, deleteProfile ,getUsersByAdminCity, updateUserRole,getAllUsers, getUsersBySpecificCity, getCities } from "../controllers/userController.js";
import { verifyToken , verifyAdmin } from "../middlewares/authMiddleware.js";
import { getDashboardData } from "../controllers/dashboardController.js"; 

const router = express.Router();

// Todas las rutas de usuario requieren token
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.delete("/profile", verifyToken, deleteProfile);

router.get("/users", verifyAdmin, getUsersByAdminCity);
router.put("/users/:userId", verifyAdmin, updateUserRole);
router.get("/users/all", verifyAdmin, getAllUsers);
router.get("/users/:cityId", verifyAdmin, getUsersBySpecificCity);
router.get("/cities", verifyAdmin, getCities);

// Ruta para el dashboard (solo admin)
router.get("/dashboard", verifyAdmin, getDashboardData); // Agregar esta línea

export default router;  
