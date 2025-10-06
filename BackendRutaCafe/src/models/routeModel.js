// src/models/routeModel.js
import pool, { SCHEMA } from "../config/db.js";

// Crear ruta
export const createRoute = async ({ name, description, status, image_url, createdBy }) => {
  const [result] = await pool.query(
    `INSERT INTO \`${SCHEMA}\`.route (name, description, status, image_url, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [name, description, status, image_url, createdBy]
  );
  return result.insertId;
};

// Obtener todas las rutas
export const getAllRoutes = async () => {
  const [rows] = await pool.query(`SELECT * FROM \`${SCHEMA}\`.route ORDER BY createdAt DESC`);
  return rows;
};

// Obtener todas las rutas PENDIENTES
export const getAllRoutesPending = async () => {
  const [rows] = await pool.query(
    `SELECT 
      r.*,
      u.name as creatorName,
      u.lastName as creatorLastName,
      u.City_id,
      c.name as cityName
     FROM route r
     JOIN users u ON r.createdBy = u.id
     LEFT JOIN city c ON u.City_id = c.id
     WHERE r.status = 'pendiente'
     ORDER BY r.createdAt DESC`
  );
  return rows;
};

// Obtener ruta por ID
export const getRouteById = async (id) => {
  const [rows] = await pool.query(
    `SELECT 
      r.*,
      u.name as creatorName,
      u.lastName as creatorLastName,
      u.City_id,
      c.name as cityName
     FROM route r
     JOIN users u ON r.createdBy = u.id
     LEFT JOIN city c ON u.City_id = c.id
     WHERE r.id = ?`,
    [id]
  );
  return rows[0];
};

// Actualizar ruta
export const updateRoute = async (id, updates, modifiedBy) => {
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), modifiedBy, id];

  const [result] = await pool.query(
    `UPDATE \`${SCHEMA}\`.route SET ${fields}, modifiedAt = NOW(), modifiedBy = ? WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

// Eliminar ruta
export const deleteRoute = async (id) => {
  const [result] = await pool.query(`DELETE FROM \`${SCHEMA}\`.route WHERE id = ?`, [id]);
  return result.affectedRows;
};
// Obtener rutas por ID de ciudad (a través del usuario)
export const findRoutesByCityId = async (cityId) => {
  const [rows] = await pool.query(
    `SELECT 
      r.*,
      u.name as creatorName,
      u.lastName as creatorLastName,
      u.City_id,
      c.name as cityName
     FROM route r
     JOIN users u ON r.createdBy = u.id
     LEFT JOIN city c ON u.City_id = c.id
     WHERE u.City_id = ? AND r.status = 'pendiente'
     ORDER BY r.createdAt DESC`,
    [cityId]
  );
  return rows;
};

// Obtener todas las rutas pendientes (para filtro "todas las ciudades")
export const findAllPendingRoutes = async () => {
  const [rows] = await pool.query(
    `SELECT 
      r.*,
      u.name as creatorName,
      u.lastName as creatorLastName,
      u.City_id,
      c.name as cityName
     FROM route r
     JOIN users u ON r.createdBy = u.id
     LEFT JOIN city c ON u.City_id = c.id
     WHERE r.status = 'pendiente'
     ORDER BY r.createdAt DESC`
  );
  return rows;
};