// src/models/placeModel.js
import pool, { SCHEMA } from "../config/db.js";

// Crear
export const createPlace = async ({
  name, description, latitude, longitude, route_id,
  website, phoneNumber, image_url, createdBy
}) => {
  const [result] = await pool.query(
    `INSERT INTO \`${SCHEMA}\`.place
     (name, description, latitude, longitude, route_id, website, phoneNumber, image_url, createdBy, createdAt, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pendiente')`,
    [
      name, description, latitude, longitude, route_id,
      website || "", phoneNumber || "", image_url || "", createdBy
    ]
  );
  return result.insertId;
};

// Leer
export const getAllPlaces = async () => {
  const [rows] = await pool.query(`
    SELECT p.*, r.name AS route_name
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    ORDER BY p.createdAt DESC
  `);
  return rows;
};

export const getPlacesByRoute = async (routeId) => {
  const [rows] = await pool.query(`
    SELECT p.*, r.name AS route_name
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    WHERE p.route_id = ?
    ORDER BY p.createdAt DESC
  `, [routeId]);
  return rows;
};

export const getPlaceById = async (id) => {
  const [rows] = await pool.query(`
    SELECT p.*, r.name AS route_name
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    WHERE p.id = ?
  `, [id]);
  return rows[0];
};

// Update
export const updatePlace = async (id, updates, modifiedBy) => {
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), modifiedBy, id];

  const [result] = await pool.query(
    `UPDATE \`${SCHEMA}\`.place SET ${fields}, modifiedAt = NOW(), modifiedBy = ? WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

// Delete
export const deletePlace = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM \`${SCHEMA}\`.place WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
};
