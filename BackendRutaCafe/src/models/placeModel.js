// models/placeModel.js
import pool from "../config/db.js";

// Crear lugar
export const createPlace = async ({ name, description, latitude, longitude, route_id, website, phoneNumber, image_url, createdBy }) => {
  const [result] = await pool.query(
    `INSERT INTO rutadelcafe.place (name, description, latitude, longitude, route_id, website, phoneNumber, image_url, createdBy, createdAt, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pendiente')`, // Cambiado 'activo' por 'pendiente'
    [
      name, 
      description, 
      latitude, 
      longitude, 
      route_id, 
      website || '',
      phoneNumber || '',
      image_url || '',
      createdBy
    ]
  );
  return result.insertId;
};

// models/placeModel.js

// Obtener todos los lugares (SIN filtrar por status)
export const getAllPlaces = async () => {
  const [rows] = await pool.query(`
    SELECT p.*, r.name as route_name 
    FROM rutadelcafe.place p 
    LEFT JOIN rutadelcafe.route r ON p.route_id = r.id 
    ORDER BY p.createdAt DESC
  `);
  return rows;
};

// Obtener lugares por ruta (SIN filtrar por status)
export const getPlacesByRoute = async (routeId) => {
  const [rows] = await pool.query(`
    SELECT p.*, r.name as route_name 
    FROM rutadelcafe.place p 
    LEFT JOIN rutadelcafe.route r ON p.route_id = r.id 
    WHERE p.route_id = ?
    ORDER BY p.createdAt DESC
  `, [routeId]);
  return rows;
};

// Obtener lugar por ID (SIN filtrar por status)
export const getPlaceById = async (id) => {
  const [rows] = await pool.query(`
    SELECT p.*, r.name as route_name 
    FROM rutadelcafe.place p 
    LEFT JOIN rutadelcafe.route r ON p.route_id = r.id 
    WHERE p.id = ?
  `, [id]);
  return rows[0];
}; 

// Actualizar lugar
export const updatePlace = async (id, updates, modifiedBy) => {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
  const values = Object.values(updates);

  values.push(modifiedBy);
  values.push(id);

  const [result] = await pool.query(
    `UPDATE rutadelcafe.place SET ${fields}, modifiedAt = NOW(), modifiedBy = ? WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

// Eliminar lugar (BORRADO FÍSICO - no soft delete)
export const deletePlace = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM rutadelcafe.place WHERE id = ?",
    [id]
  );
  return result.affectedRows;
};