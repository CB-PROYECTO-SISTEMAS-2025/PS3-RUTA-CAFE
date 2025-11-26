import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // ✅ AGREGA ESTA LÍNEA
import {
  findUserByEmail,
  updateUser,
  createUser,
  findUserByFingerprint,
  updateUserFingerprint,
  validateFingerprintUniqueness,
  generatePersistentFingerprintId,
  removeUserFingerprint // ✅ AGREGA ESTA TAMBIÉN SI FALTA
} from "../models/userModel.js";
import { generateToken } from "../utils/token.js";
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config();

// 🔐 Validaciones comunes
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};
const isStrongPassword = (password) => {
  return (
    password &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

// 🔐 Login normal (con soporte para huella + email)
export const login = async (req, res) => {
  try {
    const { email, password, fingerprint_id } = req.body;
    console.log("🔐 Iniciando proceso de login");
    console.log("📧 Datos recibidos:", { email, hasPassword: !!password, hasFingerprint: !!fingerprint_id });

    // Si se proporciona huella dactilar Y email, intentar login con huella + email
    if (fingerprint_id && email) {
      console.log("🔑 Intentando login con huella dactilar + email");

      // Buscar usuario por email primero para obtener el ID persistente
      const userByEmail = await findUserByEmail(email.trim().toLowerCase());

      if (!userByEmail) {
        console.log("❌ Usuario no encontrado por email:", email);
        return res.status(400).json({
          message: "Usuario no encontrado"
        });
      }

      // Generar el fingerprint ID persistente que debería estar registrado
      const expectedFingerprintId = generatePersistentFingerprintId(userByEmail.id, userByEmail.email);
      console.log("🆔 Fingerprint ID esperado:", expectedFingerprintId);
      console.log("🆔 Fingerprint ID recibido:", fingerprint_id);

      // Buscar usuario por el fingerprint ID esperado
      const userByFingerprint = await findUserByFingerprint(expectedFingerprintId);

      if (!userByFingerprint) {
        console.log("❌ Huella no registrada para este usuario");
        return res.status(400).json({
          message: "Huella dactilar no registrada para este usuario"
        });
      }

      // Verificar que el usuario de la huella coincida con el del email
      if (userByFingerprint.id !== userByEmail.id) {
        console.log("❌ Inconsistencia: huella pertenece a otro usuario");
        return res.status(400).json({
          message: "Error de autenticación"
        });
      }

      // Validar que el usuario tenga rol 2 o 3
      if (userByFingerprint.role === 1) {
        console.log("❌ Intento de login con huella para administrador:", userByFingerprint.email);
        return res.status(403).json({
          message: "Acceso denegado. Los administradores deben usar el login tradicional."
        });
      }

      console.log("✅ Login con huella + email exitoso para:", userByFingerprint.email);

      const token = generateToken(userByFingerprint);

      return res.json({
        message: `Bienvenido ${userByFingerprint.name} ${userByFingerprint.lastName}`,
        token,
        user: {
          id: userByFingerprint.id,
          fullName: `${userByFingerprint.name} ${userByFingerprint.lastName} ${userByFingerprint.secondLastName || ""}`,
          email: userByFingerprint.email,
          role: userByFingerprint.role,
          phone: userByFingerprint.phone,
          hasFingerprint: userByFingerprint.has_fingerprint,
          fingerprintId: userByFingerprint.fingerprint_data
        },
      });
    }

    // Si solo se proporciona huella (sin email) - BUSCAR DIRECTAMENTE POR FINGERPRINT
    if (fingerprint_id && !email) {
      console.log("🔑 Intentando login solo con huella dactilar");

      // Buscar usuario directamente por el fingerprint ID
      const user = await findUserByFingerprint(fingerprint_id);

      if (!user) {
        console.log("❌ Huella no encontrada:", fingerprint_id);
        return res.status(400).json({
          message: "Huella dactilar no registrada"
        });
      }

      // Validar que el usuario tenga rol 2 o 3
      if (user.role === 1) {
        console.log("❌ Intento de login con huella para administrador:", user.email);
        return res.status(403).json({
          message: "Acceso denegado. Los administradores deben usar el login tradicional."
        });
      }

      console.log("✅ Login solo con huella exitoso para:", user.email);

      const token = generateToken(user);

      return res.json({
        message: `Bienvenido ${user.name} ${user.lastName}`,
        token,
        user: {
          id: user.id,
          fullName: `${user.name} ${user.lastName} ${user.secondLastName || ""}`,
          email: user.email,
          role: user.role,
          phone: user.phone,
          hasFingerprint: user.has_fingerprint,
          fingerprintId: user.fingerprint_data
        },
      });
    }

    // Validaciones para login tradicional
    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son requeridos"
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Formato de email inválido"
      });
    }

    // Login tradicional con email y contraseña
    console.log("📧 Login tradicional con email:", email);
    const user = await findUserByEmail(email);

    if (!user) {
      console.log("❌ Usuario no encontrado:", email);
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    // Validar que el usuario tenga rol 2 o 3
    if (user.role === 1) {
      console.log("❌ Intento de login de administrador en app móvil:", email);
      return res.status(403).json({
        message: "Acceso denegado. Use el panel de administración."
      });
    }

    // Validar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("❌ Contraseña incorrecta para:", email);
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    console.log("✅ Login exitoso para:", user.email);
    const token = generateToken(user);

    return res.json({
      message: `Bienvenido ${user.name} ${user.lastName}`,
      token,
      user: {
        id: user.id,
        fullName: `${user.name} ${user.lastName} ${user.secondLastName || ""}`,
        email: user.email,
        role: user.role,
        phone: user.phone,
        hasFingerprint: user.has_fingerprint,
        fingerprintId: user.fingerprint_data
      },
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({
      message: "Error interno del servidor",
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// 👆 Registrar huella dactilar durante el login - CORREGIDO
export const registerFingerprint = async (req, res) => {
  try {
    const { email, password } = req.body; // ❌ fingerprint_id ya no se requiere

    console.log("📝 Iniciando registro de huella para:", email);

    // ✅ CORREGIDO: Solo requerir email y password
    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son requeridos"
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Formato de email inválido"
      });
    }

    // Primero verificar credenciales del usuario
    const user = await findUserByEmail(email);
    if (!user) {
      console.log("❌ Usuario no encontrado para registro de huella:", email);
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    // Verificar si el usuario ya tiene huella registrada
    if (user.has_fingerprint) {
      console.log("ℹ️ Usuario ya tiene huella registrada:", email);
      return res.status(400).json({
        message: "Ya tienes una huella dactilar registrada"
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("❌ Contraseña incorrecta para registro de huella:", email);
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    // ✅ CORREGIDO: Generar fingerprint ID persistente automáticamente
    const persistentFingerprintId = generatePersistentFingerprintId(user.id, user.email);
    console.log("🆔 Fingerprint ID persistente generado:", persistentFingerprintId);

    // Verificar si la huella ya está registrada por otro usuario
    const existingUser = await validateFingerprintUniqueness(persistentFingerprintId, user.id);
    if (existingUser) {
      console.log("❌ Huella ya registrada por otro usuario:", existingUser.email);
      return res.status(400).json({
        message: "Esta huella dactilar ya está registrada por otro usuario"
      });
    }

    // Actualizar huella del usuario con el ID persistente
    const result = await updateUserFingerprint(user.id, persistentFingerprintId);

    if (!result.success) {
      console.log("❌ Error al actualizar huella:", result.message);
      return res.status(404).json({ message: result.message });
    }

    // Obtener usuario actualizado
    const updatedUser = await findUserByEmail(email);

    if (!updatedUser) {
      console.log("❌ Error: Usuario no encontrado después de actualizar huella");
      return res.status(500).json({ message: "Error al actualizar usuario" });
    }

    // Generar nuevo token
    const token = generateToken(updatedUser);

    console.log("✅ Huella registrada exitosamente para:", email);
    console.log("🆔 Fingerprint ID registrado:", persistentFingerprintId);
    console.log("📊 Estado de huella actualizado:", updatedUser.has_fingerprint);

    res.json({
      message: "Huella dactilar registrada exitosamente",
      token,
      user: {
        id: updatedUser.id,
        fullName: `${updatedUser.name} ${updatedUser.lastName} ${updatedUser.secondLastName || ""}`,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        hasFingerprint: updatedUser.has_fingerprint,
        fingerprintId: persistentFingerprintId // Enviar el ID para el frontend
      }
    });

  } catch (error) {
    console.error("❌ Error en registerFingerprint:", error);
    res.status(500).json({
      message: "Error al registrar huella dactilar",
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// 🆕 Endpoint para verificar estado de huella
export const checkFingerprintStatus = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        message: "Email válido es requerido"
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Generar el fingerprint ID que debería tener si estuviera registrado
    const expectedFingerprintId = user.has_fingerprint ?
      generatePersistentFingerprintId(user.id, user.email) : null;

    res.json({
      hasFingerprint: user.has_fingerprint,
      canRegister: !user.has_fingerprint,
      fingerprintId: expectedFingerprintId
    });

  } catch (error) {
    console.error("Error en checkFingerprintStatus:", error);
    res.status(500).json({
      message: "Error al verificar estado de huella",
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// 🔐 Login para administradores (sin huella)
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Login de administrador - Email recibido:", email);

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son requeridos"
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Formato de email inválido"
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    if (user.role !== 1) {
      return res.status(403).json({
        message: "Acceso denegado. Solo administradores pueden acceder aquí."
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    const token = generateToken(user);

    return res.json({
      message: `Bienvenido administrador ${user.name} ${user.lastName}`,
      token,
      user: {
        id: user.id,
        fullName: `${user.name} ${user.lastName} ${user.secondLastName || ""}`,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isAdmin: true,
        hasFingerprint: user.has_fingerprint,
        photo: user.photo ? user.photo : null,
      },
    });

  } catch (error) {
    console.error("Error en adminLogin:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 📝 Registro con huella y foto opcional
export const register = async (req, res) => {
  try {
    const { name, lastName, secondLastName, email, phone, password, City_id, fingerprint_data, photo } = req.body;

    console.log("📝 Registro recibido - Foto:", photo ? `${photo.length} chars` : "No");

    if (!name || !lastName || !email || !password || !phone) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Formato de email inválido" });
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
      fingerprint_data: fingerprint_data || null,
      photo: photo || null
    });

    console.log("✅ Usuario creado con ID:", userId);

    const token = jwt.sign(
      { id: userId, email, role: 3 },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      userId,
      hasFingerprint: !!fingerprint_data,
      hasPhoto: !!photo,
      token,
      user: {
        id: userId,
        name,
        lastName,
        email,
        role: 3
      }
    });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({
      message: "Error en el servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🗑️ Eliminar huella dactilar
export const removeFingerprint = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son requeridos"
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }

    const result = await removeUserFingerprint(user.id);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    res.json({
      message: "Huella dactilar eliminada exitosamente",
      hasFingerprint: false
    });

  } catch (error) {
    console.error("Error en removeFingerprint:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// 🔄 Recuperar contraseña
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
// ================================
// 🔐 Recuperar contraseña SOLO ADMIN (sin tocar BD)
// ================================

// 1) Admin solicita recuperación => se envía email con link
export const adminForgotPasswordLink = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: "Correo inválido" });
    }

    const admin = await findUserByEmail(email);

    // Debe existir y ser rol 1 (admin)
    if (!admin || admin.role !== 1) {
      return res.status(404).json({ message: "Administrador no encontrado" });
    }

    // Token temporal (ej: 10 minutos)
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    // URL que abrirá el admin (frontend)
    // Quedaría algo como: http://localhost:5173/admin/reset-password?token=XXXX
    const resetUrl = `${process.env.ADMIN_FRONTEND_URL}/?resetToken=${token}`;


    // Email con botón
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Recuperación de contraseña - Panel Admin</h2>
        <p>Has solicitado restablecer tu contraseña de administrador.</p>
        <p>Haz clic en el siguiente botón para continuar:</p>
        <a href="${resetUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background-color: #1a685b;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          ">
          Restablecer contraseña
        </a>
        <p style="margin-top: 16px; font-size: 13px; color: #555;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <span style="word-break: break-all;">${resetUrl}</span>
        </p>
        <p style="font-size: 12px; color: #999;">
          Este enlace es válido por 10 minutos. Si tú no solicitaste este cambio, puedes ignorar este mensaje.
        </p>
      </div>
    `;

    await sendEmail(admin.email, "Recuperación de contraseña - Admin", html);

    return res.json({ message: "Se envió un enlace de recuperación al correo del administrador." });
  } catch (error) {
    console.error("❌ Error en adminForgotPasswordLink:", error);
    return res.status(500).json({ message: "Error al enviar correo de recuperación" });
  }
};

// 2) Admin cambia la contraseña usando el token JWT del link
export const adminResetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token y nueva contraseña son requeridos" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo",
      });
    }

    // Verificar y decodificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Debe ser admin
    if (decoded.role !== 1) {
      return res.status(403).json({ message: "Este enlace no es válido para un administrador" });
    }

    // Hashear nueva contraseña
    const hashed = await bcrypt.hash(newPassword, 10);

    // Actualizar usuario
    await updateUser(decoded.id, { password: hashed });

    return res.json({ message: "Contraseña de administrador actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error en adminResetPasswordWithToken:", error);
    return res.status(500).json({ message: "Error al restablecer contraseña" });
  }
};
