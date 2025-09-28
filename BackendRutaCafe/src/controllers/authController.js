import bcrypt from "bcryptjs";
import { findUserByEmail, updateUser, createUser } from "../models/userModel.js";
import { generateToken } from "../utils/token.js";
import dotenv from "dotenv";

// ✅ Configurar dotenv para que JWT_SECRET esté disponible
dotenv.config();

// 🔐 Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("📧 Email recibido:", email);
    console.log("🔑 JWT_SECRET disponible:", !!process.env.JWT_SECRET);

    // Buscar usuario
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

    // Validar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Contraseña incorrecta" });

    // DEBUG: Verificar estructura del usuario
    console.log("👤 User object:", {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      secondLastName: user.secondLastName,
      email: user.email,
      role: user.role
    });

    // Generar token con manejo de errores
    let token;
    try {
      token = generateToken(user);
      console.log("✅ Token generado exitosamente");
    } catch (tokenError) {
      console.error("❌ Error generando token:", tokenError.message);
      return res.status(500).json({ 
        message: "Error interno del servidor",
        error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
      });
    }

    return res.json({
      message: `Bienvenido ${user.name} ${user.lastName}`,
      token,
      user: {
        id: user.id,
        fullName: `${user.name} ${user.lastName} ${user.secondLastName || ""}`,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 📝 Registro (se mantiene igual)
export const register = async (req, res) => {
  try {
    const { name, lastName, secondLastName, email, phone, password, City_id } = req.body;

    if (!name || !lastName || !email || !password || !phone) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "El correo electrónico ya está registrado" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userId = await createUser({
      name,
      lastName,
      secondLastName: secondLastName || null,
      email,
      password: hashedPassword,
      phone,
      City_id: City_id || null,
    });

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      userId,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 🔄 Recuperar contraseña (se mantiene igual)
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Correo y nueva contraseña son obligatorios" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const strongPassword =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[@$!%*?&]/.test(newPassword);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await updateUser(user.id, { password: hashedPassword });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};