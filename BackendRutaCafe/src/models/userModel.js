import pool from "../config/db.js";

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

export const findUserById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0];
};

export const createUser = async (userData) => {
  const { name, lastName, secondLastName, email, password, phone, City_id, role } = userData;
  
  // Verificar que todos los campos requeridos estén presentes
  if (!name || !lastName || !email || !password || !phone) {
    throw new Error("Faltan campos obligatorios");
  }
  
  console.log("Datos recibidos para crear usuario:", userData); // Para debugging
  
  const [result] = await pool.query(
    "INSERT INTO users (name, lastName, secondLastName, email, password, phone, City_id, role, createdAt, modifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)",
    [name, lastName, secondLastName || null, email, password, phone, City_id || null, role || 3]
  );
  return result.insertId;
};

export const updateUser = async (id, updates) => {
  try {
    if (!id || !updates || Object.keys(updates).length === 0) {
      throw new Error("ID y campos de actualización son requeridos");
    }
    
    // Crear placeholders seguros para evitar inyección SQL
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
    const values = Object.values(updates);
    
    // Agregar el ID al final de los valores
    values.push(id);
    
    // Query con placeholder seguro para updatedAt
    const query = `UPDATE users SET ${fields}, modifiedAt = NOW() WHERE id = ?`;
    
    // Ejecutar la consulta
    const [result] = await pool.query(query, values);
    
    // Verificar si se actualizó algún registro
    if (result.affectedRows === 0) {
      throw new Error("Usuario no encontrado o sin cambios");
    }
    
    return {
      success: true,
      affectedRows: result.affectedRows,
      message: "Usuario actualizado correctamente"
    };
  } catch (error) {
    console.error("Error en updateUser:", error);
    throw error; // Relanzar el error para manejarlo en el controlador
  }
};

export const deleteUser = async (id) => {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return result;
};