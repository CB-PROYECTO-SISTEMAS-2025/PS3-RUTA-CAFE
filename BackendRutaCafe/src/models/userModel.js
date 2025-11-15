// userModel.js
import pool from "../config/db.js";
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ RUTA ABSOLUTA CORRECTA PARA UPLOADS
const projectRoot = path.resolve(__dirname, '../../..'); // Ajusta según tu estructura
const uploadsDir = path.join(projectRoot, 'BackendRutaCafe', 'uploads');
const usersPhotosDir = path.join(uploadsDir, 'users');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(usersPhotosDir)) {
  fs.mkdirSync(usersPhotosDir, { recursive: true });
}

console.log('📁 Ruta de uploads configurada:');
console.log('📍 Project Root:', projectRoot);
console.log('📍 Uploads Dir:', uploadsDir);
console.log('📍 Users Photos Dir:', usersPhotosDir);

// ✅ VERIFICAR Y CREAR CARPETAS SI NO EXISTEN
const ensureDirectories = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Carpeta uploads creada:', uploadsDir);
    } else {
      console.log('📁 Carpeta uploads ya existe:', uploadsDir);
    }

    if (!fs.existsSync(usersPhotosDir)) {
      fs.mkdirSync(usersPhotosDir, { recursive: true });
      console.log('✅ Carpeta users creada:', usersPhotosDir);
    } else {
      console.log('📁 Carpeta users ya existe:', usersPhotosDir);
    }

    // Listar archivos existentes para debug
    const existingFiles = fs.readdirSync(usersPhotosDir);
    console.log(`📸 Archivos existentes en users: ${existingFiles.length} archivos`);
    if (existingFiles.length > 0) {
      console.log('📋 Lista de archivos:', existingFiles.slice(0, 10)); // Muestra primeros 10
    }
  } catch (error) {
    console.error('❌ Error creando directorios:', error);
  }
};

// Ejecutar al cargar el módulo
ensureDirectories();

// ✅ FUNCIÓN buildImageUrl - AGREGADA PARA SOLUCIONAR EL ERROR
const buildImageUrl = (filename) => {
  if (!filename) return null;
  
  // Si ya es una URL completa, devolverla tal cual
  if (filename.startsWith('http')) {
    return filename;
  }
  
  // Construir URL completa usando la URL base del servidor
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
  return `${baseUrl}/uploads/users/${filename}`;
};

// ✅ FUNCIÓN saveBase64Image - GUARDA EN RUTA CORRECTA
const saveBase64Image = (base64Data, userId) => {
  try {
    console.log("💾 Guardando imagen para usuario:", userId);
    console.log("📍 Ruta destino:", usersPhotosDir);
    
    // Validar que sea una imagen base64
    if (!base64Data || !base64Data.startsWith('data:image/')) {
      throw new Error('Formato de imagen no válido');
    }

    // Extraer el tipo de imagen y los datos
    const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato base64 no válido');
    }

    const imageType = matches[1].toLowerCase();
    const imageData = matches[2];
    const validExtensions = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    
    if (!validExtensions.includes(imageType)) {
      throw new Error('Tipo de imagen no soportado');
    }

    // Normalizar extensión
    const extension = imageType === 'jpeg' ? 'jpg' : imageType;
    
    // Crear nombre de archivo único
    const filename = `user_${userId}_${Date.now()}.${extension}`;
    const filePath = path.join(usersPhotosDir, filename);

    console.log("📁 Guardando archivo en:", filePath);

    // Guardar archivo
    fs.writeFileSync(filePath, imageData, 'base64');
    
    // Verificar que se guardó correctamente
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log("✅ Imagen guardada correctamente:", {
        filename: filename,
        path: filePath,
        size: stats.size + ' bytes',
        exists: true
      });
    } else {
      throw new Error('La imagen no se guardó correctamente');
    }
    
    return filename;
  } catch (error) {
    console.error('❌ Error guardando imagen:', error);
    throw error;
  }
};

// ✅ FUNCIÓN deleteImageFile - ELIMINA DE RUTA CORRECTA
const deleteImageFile = (filename) => {
  try {
    if (!filename) {
      console.log('⚠️ No hay archivo para eliminar');
      return;
    }
    
    console.log("🗑️ Eliminando archivo:", filename);
    
    // Si es una URL, extraer solo el nombre del archivo
    if (filename.startsWith('http')) {
      try {
        const url = new URL(filename);
        filename = path.basename(url.pathname);
        console.log("🔧 Extrayendo nombre de archivo de URL:", filename);
      } catch (error) {
        console.log("❌ Error parseando URL:", error);
        return;
      }
    }
    
    const filePath = path.join(usersPhotosDir, filename);
    console.log("📁 Ruta completa del archivo a eliminar:", filePath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ Archivo eliminado:', filePath);
    } else {
      console.log('⚠️ Archivo no encontrado para eliminar:', filePath);
      
      // Listar archivos disponibles para debug
      const availableFiles = fs.readdirSync(usersPhotosDir);
      console.log('📋 Archivos disponibles:', availableFiles);
    }
  } catch (error) {
    console.error('❌ Error eliminando archivo:', error);
  }
};

// ✅ FUNCIÓN PARA VERIFICAR SI UNA IMAGEN EXISTE
export const verifyImageExists = (filename) => {
  try {
    if (!filename) return false;
    
    // Extraer solo el nombre del archivo si es URL
    if (filename.startsWith('http')) {
      try {
        const url = new URL(filename);
        filename = path.basename(url.pathname);
      } catch (error) {
        console.log("❌ Error parseando URL:", error);
        return false;
      }
    }
    
    const filePath = path.join(usersPhotosDir, filename);
    const exists = fs.existsSync(filePath);
    
    console.log(`🔍 Verificando imagen ${filename}:`, {
      path: filePath,
      exists: exists
    });
    
    if (exists) {
      const stats = fs.statSync(filePath);
      console.log(`📏 Tamaño: ${stats.size} bytes`);
    }
    
    return exists;
  } catch (error) {
    console.error('❌ Error verificando imagen:', error);
    return false;
  }
};

// ✅ FUNCIÓN getUserCurrentImage
const getUserCurrentImage = async (userId) => {
  try {
    const [rows] = await pool.query("SELECT photo FROM users WHERE id = ?", [userId]);
    const photo = rows[0]?.photo || null;
    console.log("📸 Imagen actual en BD para usuario", userId + ":", photo);
    
    if (photo) {
      // Verificar si la imagen existe físicamente
      const exists = verifyImageExists(photo);
      console.log(`🔍 Imagen física existe: ${exists}`);
    }
    
    return photo;
  } catch (error) {
    console.error("❌ Error obteniendo imagen actual:", error);
    return null;
  }
};

// ✅ FUNCIÓN findUserByEmail - CORREGIDA
export const findUserByEmail = async (email) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];
    
    // Construir URL completa para la foto SOLO si existe
    if (user && user.photo) {
      user.photo = buildImageUrl(user.photo);
    }
    
    return user;
  } catch (error) {
    console.error("Error en findUserByEmail:", error);
    throw error;
  }
};

// ✅ MODIFICA findUserById y otras funciones para devolver solo el nombre del archivo
export const findUserById = async (id) => {
  try {
    console.log("🔍 Buscando usuario por ID:", id);
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    const user = rows[0];
    
    // ✅ DEVUELVE SOLO EL NOMBRE DEL ARCHIVO, NO CONSTRUYAS URL
    // El frontend ya sabe cómo construir la URL
    return user;
  } catch (error) {
    console.error("❌ Error en findUserById:", error);
    throw error;
  }
};

// ✅ FUNCIÓN findUserByFingerprint - CORREGIDA
export const findUserByFingerprint = async (fingerprintId) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE fingerprint_data = ? AND has_fingerprint = TRUE", 
      [fingerprintId]
    );
    const user = rows[0];
    
    if (user && user.photo) {
      user.photo = buildImageUrl(user.photo);
    }
    
    return user;
  } catch (error) {
    console.error("Error en findUserByFingerprint:", error);
    throw error;
  }
};

// ✅ FUNCIÓN generatePersistentFingerprintId
export const generatePersistentFingerprintId = (userId, email) => {
  const secret = 'ruta_del_sabor_app_2024';
  const data = `${userId}_${email}_${secret}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `fp_${hash.substring(0, 20)}`;
};

// ✅ FUNCIÓN createUser - SIMPLIFICADA
export const createUser = async (userData) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { name, lastName, secondLastName, email, password, phone, City_id, role, fingerprint_data, photo } = userData;
    
    if (!name || !lastName || !email || !password || !phone) {
      throw new Error("Faltan campos obligatorios");
    }
    
    const has_fingerprint = !!fingerprint_data;
    let photoFilename = null;

    // Procesar foto si existe
    if (photo) {
      photoFilename = saveBase64Image(photo, `temp_${Date.now()}`);
    }
    
    const [result] = await connection.query(
      "INSERT INTO users (name, lastName, secondLastName, email, password, phone, City_id, role, fingerprint_data, has_fingerprint, photo, createdAt, modifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)",
      [name, lastName, secondLastName || null, email, password, phone, City_id || null, role || 3, fingerprint_data || null, has_fingerprint, photoFilename]
    );
    
    const userId = result.insertId;

    // Si hay foto, renombrar con el ID real del usuario
    if (photo && photoFilename) {
      const newPhotoFilename = `user_${userId}_${Date.now()}.jpg`;
      const oldFullPath = path.join(usersPhotosDir, photoFilename);
      const newFullPath = path.join(usersPhotosDir, newPhotoFilename);
      
      if (fs.existsSync(oldFullPath)) {
        fs.renameSync(oldFullPath, newFullPath);
        photoFilename = newPhotoFilename;
        
        // Actualizar la ruta en la base de datos
        await connection.query(
          "UPDATE users SET photo = ? WHERE id = ?",
          [photoFilename, userId]
        );
      }
    }

    await connection.commit();
    console.log("✅ Usuario creado con ID:", userId);
    return userId;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en createUser:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// ✅ MODIFICA updateUserPhoto para usar rutas corregidas
export const updateUserPhoto = async (id, photoData) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    console.log("🔄 Actualizando foto para usuario:", id);
    console.log("📍 Ruta base:", usersPhotosDir);

    const currentImage = await getUserCurrentImage(id);
    console.log("🗑️ Imagen actual a eliminar:", currentImage);

    let newPhotoFilename = null;
    
    if (photoData && photoData.startsWith('data:image/')) {
      console.log("💾 Guardando nueva imagen base64");
      newPhotoFilename = saveBase64Image(photoData, id);
    } else {
      throw new Error("Datos de imagen no válidos");
    }

    console.log("📁 Nuevo nombre de archivo para BD:", newPhotoFilename);

    const [result] = await connection.query(
      "UPDATE users SET photo = ?, modifiedAt = NOW() WHERE id = ?",
      [newPhotoFilename, id]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    if (currentImage && currentImage !== newPhotoFilename) {
      console.log("🗑️ Eliminando imagen anterior...");
      deleteImageFile(currentImage);
    }

    await connection.commit();
    
    // ✅ VERIFICAR QUE LA NUEVA IMAGEN EXISTE
    const newImageExists = verifyImageExists(newPhotoFilename);
    console.log(`🔍 Nueva imagen existe físicamente: ${newImageExists}`);
    
    return {
      success: true,
      affectedRows: result.affectedRows,
      photoUrl: newPhotoFilename,
      message: "Foto actualizada correctamente",
      fileExists: newImageExists
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error en updateUserPhoto:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// ✅ FUNCIÓN removeUserPhoto
export const removeUserPhoto = async (id) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Obtener la imagen actual para eliminarla
    const currentImage = await getUserCurrentImage(id);

    const [result] = await connection.query(
      "UPDATE users SET photo = NULL, modifiedAt = NOW() WHERE id = ?",
      [id]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    // Eliminar el archivo de imagen
    if (currentImage) {
      deleteImageFile(currentImage);
    }

    await connection.commit();

    console.log("✅ Foto eliminada para usuario:", id);
    return {
      success: true,
      affectedRows: result.affectedRows,
      message: "Foto eliminada correctamente"
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en removeUserPhoto:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// ✅ FUNCIÓN updateUserFingerprint
export const updateUserFingerprint = async (id, fingerprintData) => {
  try {
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

// ✅ FUNCIÓN removeUserFingerprint
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

// ✅ FUNCIÓN validateFingerprintUniqueness
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

// ✅ FUNCIÓN updateUser
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

// ✅ FUNCIÓN deleteUser
export const deleteUser = async (id) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar que el usuario tenga rol 3
    const [userRows] = await connection.query("SELECT role, photo FROM users WHERE id = ?", [id]);
    
    if (userRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    const user = userRows[0];
    
    if (user.role !== 3) {
      await connection.rollback();
      return {
        success: false,
        message: "Solo se pueden eliminar cuentas de usuarios normales (rol 3)"
      };
    }

    // Eliminar la foto de perfil si existe
    if (user.photo) {
      deleteImageFile(user.photo);
    }

    // Eliminar el usuario de la base de datos
    const [result] = await connection.query("DELETE FROM users WHERE id = ?", [id]);
    
    await connection.commit();

    return {
      success: true,
      affectedRows: result.affectedRows,
      message: "Usuario eliminado correctamente"
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en deleteUser:", error);
    
    // Verificar si es error de clave foránea
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      throw new Error("No se puede eliminar el usuario porque tiene datos relacionados. Contacte con un administrador.");
    }
    
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// ✅ FUNCIÓN findUsersByCityId - CORREGIDA
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
        u.photo,
        u.createdAt,
        c.name as cityName  
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id  
       WHERE u.City_id = ? 
       ORDER BY u.createdAt DESC`,
      [cityId]
    );
    
    // Construir URLs completas para las fotos
    const usersWithFullUrls = rows.map(user => ({
      ...user,
      photo: user.photo ? buildImageUrl(user.photo) : null
    }));
    
    return usersWithFullUrls;
  } catch (error) {
    console.error("Error en findUsersByCityId:", error);
    throw error;
  }
};

// ✅ FUNCIÓN findUserWithCity - CORREGIDA
export const findUserWithCity = async (id) => {
  try {
    const [rows] = await pool.query(
      "SELECT u.*, c.name as cityName FROM users u LEFT JOIN city c ON u.City_id = c.id WHERE u.id = ?",
      [id]
    );
    const user = rows[0];
    
    if (user && user.photo) {
      user.photo = buildImageUrl(user.photo);
    }
    
    return user;
  } catch (error) {
    console.error("Error en findUserWithCity:", error);
    throw error;
  }
};

// ✅ FUNCIÓN updateUserRoleModel
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

// ✅ FUNCIÓN findAllUsers - CORREGIDA
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
        u.photo,
        u.createdAt,
        c.name as cityName
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id
       ORDER BY u.createdAt DESC`
    );
    
    // Construir URLs completas para las fotos
    const usersWithFullUrls = rows.map(user => ({
      ...user,
      photo: user.photo ? buildImageUrl(user.photo) : null
    }));
    
    return usersWithFullUrls;
  } catch (error) {
    console.error("Error en findAllUsers:", error);
    throw error;
  }
};

// ✅ FUNCIÓN findUsersBySpecificCity - CORREGIDA
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
        u.photo,
        u.createdAt,
        c.name as cityName
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id
       WHERE u.City_id = ?
       ORDER BY u.createdAt DESC`,
      [cityId]
    );
    
    // Construir URLs completas para las fotos
    const usersWithFullUrls = rows.map(user => ({
      ...user,
      photo: user.photo ? buildImageUrl(user.photo) : null
    }));
    
    return usersWithFullUrls;
  } catch (error) {
    console.error("Error en findUsersBySpecificCity:", error);
    throw error;
  }
};

// ✅ FUNCIÓN getAllCities
export const getAllCities = async () => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM city ORDER BY name");
    return rows;
  } catch (error) {
    console.error("Error en getAllCities:", error);
    throw error;
  }
};

// ✅ FUNCIÓN findUsersWithCityByCityId - CORREGIDA
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
        u.photo,
        u.createdAt,
        c.name as cityName
       FROM users u 
       LEFT JOIN city c ON u.City_id = c.id
       WHERE u.City_id = ?
       ORDER BY u.createdAt DESC`,
      [cityId]
    );
    
    // Construir URLs completas para las fotos
    const usersWithFullUrls = rows.map(user => ({
      ...user,
      photo: user.photo ? buildImageUrl(user.photo) : null
    }));
    
    return usersWithFullUrls;
  } catch (error) {
    console.error("Error en findUsersWithCityByCityId:", error);
    throw error;
  }
};

// ✅ FUNCIÓN getDashboardStats
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