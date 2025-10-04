import express from "express";
import { login, register, forgotPassword, adminLogin } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/admin-login", adminLogin);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);


export default router;