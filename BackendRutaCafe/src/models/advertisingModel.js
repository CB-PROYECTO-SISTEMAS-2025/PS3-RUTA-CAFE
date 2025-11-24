import pool, { SCHEMA } from "../config/db.js";

export const createAd = async ({
  title, description, image_url, enlace_url,
  status, start_date, end_date, createdBy
}) => {
  const [result] = await pool.query(
    `INSERT INTO \`${SCHEMA}\`.advertising
     (title, description, image_url, enlace_url, status, start_date, end_date, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      title,
      description || "",
      image_url || "",
      enlace_url || "",
      status || "activo",     // default activo
      start_date || null,
      end_date || null,
      createdBy || null
    ]
  );
  return result.insertId;
};

export const getAllAds = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM \`${SCHEMA}\`.advertising ORDER BY createdAt DESC`
  );
  return rows;
};

export const getAdById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM \`${SCHEMA}\`.advertising WHERE id = ?`,
    [id]
  );
  return rows[0];
};

export const updateAd = async (id, updates, modifiedBy) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), modifiedBy, id];

  const [result] = await pool.query(
    `UPDATE \`${SCHEMA}\`.advertising
     SET ${fields}, modifiedAt = NOW(), modifiedBy = ?
     WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

export const deleteAd = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM \`${SCHEMA}\`.advertising WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
};

// Público: activas y vigentes por fecha
export const getPublicActiveAds = async () => {
  const [rows] = await pool.query(
    `SELECT *
     FROM \`${SCHEMA}\`.advertising
     WHERE status = 'activo'
       AND (start_date IS NULL OR start_date <= NOW())
       AND (end_date IS NULL OR end_date >= NOW())
     ORDER BY createdAt DESC`
  );
  return rows;
};
