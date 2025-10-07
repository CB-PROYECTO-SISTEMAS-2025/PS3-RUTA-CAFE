import express from "express";
<<<<<<< HEAD
import { login, register, forgotPassword } from "../controllers/authController.js";
=======
import { login, register, forgotPassword,adminLogin } from "../controllers/authController.js";
>>>>>>> origin/feature/garcia

const router = express.Router();

router.post("/login", login);
<<<<<<< HEAD
=======
router.post("/admin-login", adminLogin);
>>>>>>> origin/feature/garcia
router.post("/register", register);
router.post("/forgot-password", forgotPassword);

export default router;