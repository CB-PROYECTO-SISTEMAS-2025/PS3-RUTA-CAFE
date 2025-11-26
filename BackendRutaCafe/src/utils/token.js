import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  try {
    // Verificar que JWT_SECRET esté definido
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no está definido en las variables de entorno");
    }
    
    // Verificar que el usuario tenga las propiedades necesarias
    if (!user || !user.id || !user.name || !user.lastName) {
      throw new Error("Estructura de usuario inválida para generar token");
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      name: `${user.name} ${user.lastName} ${user.secondLastName || ""}`.trim()
    };

    console.log("📝 Generando token con payload:", payload);

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("✅ Token generado con éxito");
    return token;

  } catch (error) {
    console.error("❌ Error en generateToken:", error.message);
    throw error;
  }
};