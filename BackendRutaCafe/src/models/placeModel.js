import pool, { SCHEMA } from "../config/db.js";

// Crear lugar
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

// Crear horarios para un lugar
export const createPlaceSchedules = async (placeId, schedules) => {
  const createdSchedules = [];
  
  for (const schedule of schedules) {
    const { dayOfWeek, openTime, closeTime } = schedule;
    
    const [result] = await pool.query(
      `INSERT INTO \`${SCHEMA}\`.placeschedule 
       (place_id, dayOfWeek, openTime, closeTime) 
       VALUES (?, ?, ?, ?)`,
      [placeId, dayOfWeek, openTime, closeTime]
    );
    
    createdSchedules.push({
      id: result.insertId,
      place_id: placeId,
      dayOfWeek,
      openTime,
      closeTime
    });
  }
  
  return createdSchedules;
};

// Obtener horarios por lugar
export const getSchedulesByPlaceId = async (placeId) => {
  const [rows] = await pool.query(
    `SELECT * FROM \`${SCHEMA}\`.placeschedule WHERE place_id = ? ORDER BY 
     FIELD(dayOfWeek, 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo')`,
    [placeId]
  );
  return rows;
};

// Eliminar horarios de un lugar
export const deletePlaceSchedules = async (placeId) => {
  const [result] = await pool.query(
    `DELETE FROM \`${SCHEMA}\`.placeschedule WHERE place_id = ?`,
    [placeId]
  );
  return result.affectedRows;
};

// src/models/placeModel.js
export const getAllPlaces = async (user) => {
  const { id: userId, role } = user || { id: null, role: 0 };
  const params = [];
  let where = "1=1";

  if (role === 2) {
    where = "p.createdBy = ?";
    params.push(userId);
  } else {
    where = "p.status = 'aprobada'";
  }

  const [rows] = await pool.query(
    `
    SELECT p.*, r.name AS route_name,
           COUNT(DISTINCT l.id) AS likes_count,
           COUNT(DISTINCT c.id) AS comments_count,
           ${userId ? `
             EXISTS(SELECT 1 FROM \`${SCHEMA}\`.likes l2 WHERE l2.place_id = p.id AND l2.user_id = ?) AS user_liked
           ` : `FALSE AS user_liked`}
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY p.createdAt DESC
    `,
    userId ? [userId, ...params] : params
  );
  return rows;
};

export const getPlacesByRoute = async (routeId, user) => {
  const { id: userId, role } = user || { id: null, role: 0 };
  const params = [routeId];
  let extraWhere = "";

  if (role === 2) {
    extraWhere = "AND p.createdBy = ?";
    params.push(userId);
  } else {
    extraWhere = "AND p.status = 'aprobada'";
  }

  const [rows] = await pool.query(
    `
    SELECT p.*, r.name AS route_name,
           COUNT(DISTINCT l.id) AS likes_count,
           COUNT(DISTINCT c.id) AS comments_count,
           ${userId ? `
             EXISTS(SELECT 1 FROM \`${SCHEMA}\`.likes l2 WHERE l2.place_id = p.id AND l2.user_id = ?) AS user_liked
           ` : `FALSE AS user_liked`}
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE p.route_id = ?
      ${extraWhere}
    GROUP BY p.id
    ORDER BY p.createdAt DESC
    `,
    userId ? [userId, ...params] : params
  );
  return rows;
};


export const getPlaceById = async (id, userId = null) => {
  let query = `
    SELECT 
      p.*, 
      r.name AS route_name,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT c.id) as comments_count
  `;

  // Agregar user_liked solo si se proporciona userId
  if (userId) {
    query += `,
      EXISTS(
        SELECT 1 FROM \`${SCHEMA}\`.likes l2 
        WHERE l2.place_id = p.id AND l2.user_id = ?
      ) as user_liked
    `;
  } else {
    query += `,
      FALSE as user_liked
    `;
  }

  query += `
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE p.id = ?
    GROUP BY p.id
  `;

  const params = userId ? [userId, id] : [id];
  const [rows] = await pool.query(query, params);
  return rows[0];
};

// Obtener lugares con filtro por usuario (para admin)
export const getPlacesByUser = async (userId) => {
  const query = `
    SELECT 
      p.*, 
      r.name AS route_name,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT c.id) as comments_count,
      EXISTS(
        SELECT 1 FROM \`${SCHEMA}\`.likes l2 
        WHERE l2.place_id = p.id AND l2.user_id = ?
      ) as user_liked
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE p.createdBy = ?
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `;

  const [rows] = await pool.query(query, [userId, userId]);
  return rows;
};

// Obtener lugares aprobados (para usuarios normales)
export const getApprovedPlaces = async (userId = null) => {
  let query = `
    SELECT 
      p.*, 
      r.name AS route_name,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT c.id) as comments_count
  `;

  // Agregar user_liked solo si se proporciona userId
  if (userId) {
    query += `,
      EXISTS(
        SELECT 1 FROM \`${SCHEMA}\`.likes l2 
        WHERE l2.place_id = p.id AND l2.user_id = ?
      ) as user_liked
    `;
  } else {
    query += `,
      FALSE as user_liked
    `;
  }

  query += `
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE p.status = 'aprobada'
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `;

  const params = userId ? [userId] : [];
  const [rows] = await pool.query(query, params);
  return rows;
};

// Actualizar lugar
export const updatePlace = async (id, updates, modifiedBy) => {
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), modifiedBy, id];

  const [result] = await pool.query(
    `UPDATE \`${SCHEMA}\`.place SET ${fields}, modifiedAt = NOW(), modifiedBy = ? WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

// Eliminar lugar
export const deletePlace = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM \`${SCHEMA}\`.place WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
};