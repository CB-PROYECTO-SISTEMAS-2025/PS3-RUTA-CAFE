import pool from "../config/db.js";
import crypto from 'crypto';

export const findUserByEmail = async (email) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
  } catch (error) {
    console.error("Error en findUserByEmail:", error);
    throw error;
  }
};

export const findUserById = async (id) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  } catch (error) {
    console.error("Error en findUserById:", error);
    throw error;
  }
};

export const findUserByFingerprint = async (fingerprintId) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE fingerprint_data = ? AND has_fingerprint = TRUE", 
      [fingerprintId]
    );
    return rows[0];
  } catch (error) {
    console.error("Error en findUserByFingerprint:", error);
    throw error;
  }
};

// 🔑 Función para generar un fingerprint ID único y persistente
export const generatePersistentFingerprintId = (userId, email) => {
  // Crear un hash único basado en userId + email + una clave secreta
  const secret = 'ruta_del_sabor_app_2024';
  const data = `${userId}_${email}_${secret}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `fp_${hash.substring(0, 20)}`;
};

export const createUser = async (userData) => {
  try {
    const { name, lastName, secondLastName, email, password, phone, City_id, role, fingerprint_data } = userData;
    
    if (!name || !lastName || !email || !password || !phone) {
      throw new Error("Faltan campos obligatorios");
    }
    
    const has_fingerprint = !!fingerprint_data;
    
    const [result] = await pool.query(
      "INSERT INTO users (name, lastName, secondLastName, email, password, phone, City_id, role, fingerprint_data, has_fingerprint, createdAt, modifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)",
      [name, lastName, secondLastName || null, email, password, phone, City_id || null, role || 3, fingerprint_data || null, has_fingerprint]
    );
    
    console.log("✅ Usuario creado con ID:", result.insertId);
    return result.insertId;
  } catch (error) {
    console.error("Error en createUser:", error);
    throw error;
  }
};

export const updateUserFingerprint = async (id, fingerprintData) => {
  try {
    // Validar que el fingerprintData no esté vacío
    if (!fingerprintData || fingerprintData.trim() === '') {
      throw new Error("Los datos de huella no pueden estar vacíos");
    }

    const [result] = await pool.query(
      "UPDATE users SET fingerprint_data = ?, has_fingerprint = TRUE, modifiedAt = NOW() WHERE id = ?",
      [fingerprintData, id]
    );
    
    if (result.affectedRows === 0) {
      console.log("❌ Usuario no encontrado para actualizar huella:", id);
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    console.log("✅ Huella actualizada para usuario:", id);
    return {
      success: true,
      affectedRows: result.affectedRows,
      message: "Huella actualizada correctamente"
    };
  } catch (error) {
    console.error("Error en updateUserFingerprint:", error);
    throw error;
  }
};

export const removeUserFingerprint = async (id) => {
  try {
    const [result] = await pool.query(
      "UPDATE users SET fingerprint_data = NULL, has_fingerprint = FALSE, modifiedAt = NOW() WHERE id = ?",
      [id]
    );
    
    if (result.affectedRows === 0) {
      console.log("❌ Usuario no encontrado para eliminar huella:", id);
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    console.log("✅ Huella eliminada para usuario:", id);
    return {
      success: true,
      affectedRows: result.affectedRows,
      message: "Huella eliminada correctamente"
    };
  } catch (error) {
    console.error("Error en removeUserFingerprint:", error);
    throw error;
  }
};

export const validateFingerprintUniqueness = async (fingerprintId, excludeUserId = null) => {
  try {
    let query = "SELECT id, email FROM users WHERE fingerprint_data = ? AND has_fingerprint = TRUE";
    const params = [fingerprintId];
    
    if (excludeUserId) {
      query += " AND id != ?";
      params.push(excludeUserId);
    }
    
    const [rows] = await pool.query(query, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error en validateFingerprintUniqueness:", error);
    throw error;
  }
};

export const updateUser = async (id, updates) => {
  try {
    if (!id || !updates || Object.keys(updates).length === 0) {
      throw new Error("ID y campos de actualización son requeridos");
    }
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
    const values = Object.values(updates);
    values.push(id);
    
    const query = `UPDATE users SET ${fields}, modifiedAt = NOW() WHERE id = ?`;
    
    const [result] = await pool.query(query, values);
    
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
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return result;
  } catch (error) {
    console.error("Error en deleteUser:", error);
    throw error;
  }
};

export const findUsersByCityId = async (cityId) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, 
        u.name, 
        u.lastName, 
        u.secondLastName, 
        u.email, 
        u.phone, 
        u.role,
        u.City_id,
        u.createdAt,
        c.name as cityName  
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id  
       WHERE u.City_id = ? 
       ORDER BY u.createdAt DESC`,
      [cityId]
    );
    return rows;
  } catch (error) {
    console.error("Error en findUsersByCityId:", error);
    throw error;
  }
};

export const findUserWithCity = async (id) => {
  try {
    const [rows] = await pool.query(
      "SELECT u.*, c.name as cityName FROM users u LEFT JOIN city c ON u.City_id = c.id WHERE u.id = ?",
      [id]
    );
    return rows[0];
  } catch (error) {
    console.error("Error en findUserWithCity:", error);
    throw error;
  }
};

export const updateUserRoleModel = async (id, newRole) => {
  try {
    if (![1, 2, 3].includes(newRole)) {
      throw new Error("Rol inválido. Debe ser 1 (Admin), 2 (Técnico) o 3 (Usuario)");
    }

    const [result] = await pool.query(
      "UPDATE users SET role = ?, modifiedAt = NOW() WHERE id = ?",
      [newRole, id]
    );

    if (result.affectedRows === 0) {
      throw new Error("Usuario no encontrado");
    }

    return {
      success: true,
      affectedRows: result.affectedRows,
      message: "Rol actualizado correctamente"
    };
  } catch (error) {
    console.error("Error en updateUserRole:", error);
    throw error;
  }
};

export const findAllUsers = async () => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, 
        u.name, 
        u.lastName, 
        u.secondLastName, 
        u.email, 
        u.phone, 
        u.role,
        u.City_id,
        u.createdAt,
        c.name as cityName
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id
       ORDER BY u.createdAt DESC`
    );
    return rows;
  } catch (error) {
    console.error("Error en findAllUsers:", error);
    throw error;
  }
};

export const findUsersBySpecificCity = async (cityId) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, 
        u.name, 
        u.lastName, 
        u.secondLastName, 
        u.email, 
        u.phone, 
        u.role,
        u.City_id,
        u.createdAt,
        c.name as cityName
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id
       WHERE u.City_id = ?
       ORDER BY u.createdAt DESC`,
      [cityId]
    );
    return rows;
  } catch (error) {
    console.error("Error en findUsersBySpecificCity:", error);
    throw error;
  }
};

export const getAllCities = async () => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM city ORDER BY name");
    return rows;
  } catch (error) {
    console.error("Error en getAllCities:", error);
    throw error;
  }
};

export const findUsersWithCityByCityId = async (cityId) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, 
        u.name, 
        u.lastName, 
        u.secondLastName, 
        u.email, 
        u.phone, 
        u.role,
        u.City_id,
        u.createdAt,
        c.name as cityName
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id
       WHERE u.City_id = ?
       ORDER BY u.createdAt DESC`,
      [cityId]
    );
    return rows;
  } catch (error) {
    console.error("Error en findUsersWithCityByCityId:", error);
    throw error;
  }
};

export const getDashboardStats = async () => {
  try {
    console.log("📊 Obteniendo estadísticas del dashboard...");
    
    const [totalUsers] = await pool.query("SELECT COUNT(*) as count FROM users");
    console.log("👥 Total usuarios:", totalUsers[0].count);
    
    const [usersByRole] = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    console.log("🎭 Usuarios por rol:", usersByRole);
    
    let approvedRoutes = 0;
    let routesByDepartment = [];

    try {
      const [approvedRoutesResult] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM route 
        WHERE status = 'aprobada'
      `);
      approvedRoutes = approvedRoutesResult[0]?.count || 0;
      console.log("✅ Rutas aprobadas:", approvedRoutes);
      
      const [routesDept] = await pool.query(`
        SELECT c.name as department, COUNT(r.id) as count
        FROM route r
        JOIN city c ON r.City_id = c.id
        WHERE r.status = 'aprobada'
        GROUP BY c.id, c.name
      `);
      routesByDepartment = routesDept;
      console.log("🗺️ Rutas por departamento:", routesDept.length);
      
    } catch (routeError) {
      console.log("⚠️ Error al obtener datos de rutas:", routeError.message);
      approvedRoutes = 0;
      routesByDepartment = [];
    }
    
    const [usersByDepartment] = await pool.query(`
      SELECT c.name as department, COUNT(u.id) as count
      FROM users u
      LEFT JOIN city c ON u.City_id = c.id
      GROUP BY c.id, c.name
    `);
    console.log("🏢 Usuarios por departamento:", usersByDepartment.length);

    const result = {
      totalUsers: totalUsers[0].count,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item.role] = item.count;
        return acc;
      }, {}),
      approvedRoutes: approvedRoutes,
      routesByDepartment: routesByDepartment,
      usersByDepartment: usersByDepartment
    };

    console.log("📈 Resultado final:", result);
    return result;

  } catch (error) {
    console.error("❌ Error en getDashboardStats:", error);
    throw error;
  }
};