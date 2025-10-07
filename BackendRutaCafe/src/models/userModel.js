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
export const findUsersByCityId = async (cityId) => {
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
};

export const findUserWithCity = async (id) => {
  const [rows] = await pool.query(
    "SELECT u.*, c.name as cityName FROM users u LEFT JOIN city c ON u.City_id = c.id WHERE u.id = ?",
    [id]
  );
  return rows[0];
};

export const updateUserRoleModel = async (id, newRole) => {
  try {
    // Validar que el rol sea válido (1, 2, o 3)
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

// En userModel.js - agregar estas funciones
export const findAllUsers = async () => {
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
};

export const findUsersBySpecificCity = async (cityId) => {
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
};

export const getAllCities = async () => {
  const [rows] = await pool.query("SELECT id, name FROM city ORDER BY name");
  return rows;
};

export const findUsersWithCityByCityId = async (cityId) => {
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
};
export const getDashboardStats = async () => {
  try {
    console.log("📊 Obteniendo estadísticas del dashboard...");
    
    // Total de usuarios
    const [totalUsers] = await pool.query("SELECT COUNT(*) as count FROM users");
    console.log("👥 Total usuarios:", totalUsers[0].count);
    
    // Usuarios por rol
    const [usersByRole] = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    console.log("🎭 Usuarios por rol:", usersByRole);
    
    let approvedRoutes = 0;
    let routesByDepartment = [];

    try {
      // Rutas aprobadas - usando la tabla 'route' con status 'aprobada'
      const [approvedRoutesResult] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM route 
        WHERE status = 'aprobada'
      `);
      approvedRoutes = approvedRoutesResult[0]?.count || 0;
      console.log("✅ Rutas aprobadas:", approvedRoutes);
      
      // Rutas por departamento
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
      // Si hay error con rutas, continuamos con los datos de usuarios
      approvedRoutes = 0;
      routesByDepartment = [];
    }
    
    // Usuarios por departamento
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