import express from "express";
import { 
  login, 
  register, 
  forgotPassword, 
  adminLogin, 
  registerFingerprint, 
  removeFingerprint,
  checkFingerprintStatus 
} from "../controllers/authController.js";

const router = express.Router();

// Log de rutas cargadas
console.log("🔄 Cargando rutas de autenticación...");

router.post("/login", login);
router.post("/admin-login", adminLogin);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/register-fingerprint", registerFingerprint);
router.post("/check-fingerprint", checkFingerprintStatus);
router.delete("/remove-fingerprint", removeFingerprint);

console.log("✅ Rutas de autenticación cargadas:");
console.log("   POST /api/auth/login");
console.log("   POST /api/auth/admin-login"); 
console.log("   POST /api/auth/register");
console.log("   POST /api/auth/forgot-password");
console.log("   POST /api/auth/register-fingerprint");
console.log("   POST /api/auth/check-fingerprint");
console.log("   DELETE /api/auth/remove-fingerprint");

export default router;