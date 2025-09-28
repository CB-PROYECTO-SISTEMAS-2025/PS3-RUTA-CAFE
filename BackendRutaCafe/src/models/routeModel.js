import pool from "../config/db.js";

// Crear ruta
// Crear ruta
export const createRoute = async ({ name, description, status, image_url, createdBy }) => {
  const [result] = await pool.query(
    `INSERT INTO route (name, description, status, image_url, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [name, description, status, image_url, createdBy]
  );
  return result.insertId;
};

// Obtener todas las rutas
export const getAllRoutes = async () => {
  const [rows] = await pool.query("SELECT * FROM route ORDER BY createdAt DESC");
  return rows;
};

// Obtener ruta por ID
export const getRouteById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM route WHERE id = ?", [id]);
  return rows[0];
};

// Actualizar ruta
export const updateRoute = async (id, updates, modifiedBy) => {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
  const values = Object.values(updates);

  values.push(modifiedBy);
  values.push(id);

  const [result] = await pool.query(
    `UPDATE route SET ${fields}, modifiedAt = NOW(), modifiedBy = ? WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

// Eliminar ruta
export const deleteRoute = async (id) => {
  const [result] = await pool.query("DELETE FROM route WHERE id = ?", [id]);
  return result.affectedRows;
};
