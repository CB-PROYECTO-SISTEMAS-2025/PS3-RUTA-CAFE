// src/models/placeModel.js
import pool, { SCHEMA } from "../config/db.js";

// Verificar si el usuario tiene lugares pendientes
export const hasPendingPlaces = async (userId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM \`${SCHEMA}\`.place 
     WHERE createdBy = ? AND status = 'pendiente'`,
    [userId]
  );
  return rows[0].count > 0;
};

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

export const getAllPlaces = async (user = null) => {
  let userId = null;
  let role = 0;

  if (user && typeof user === 'object') {
    userId = user.id ?? null;
    role = user.role ?? 0;
  } else if (typeof user === 'number' || typeof user === 'string') {
    userId = Number(user) || null;
  }

  let where = '1=1';
  const whereParams = [];

  if (role === 2 && userId) {
    where = 'p.createdBy = ?';
    whereParams.push(userId);
  } else {
    where = "p.status = 'aprobada'";
  }

  const query = `
    SELECT 
      p.*,
      r.name AS route_name,
      COUNT(DISTINCT l.id) AS likes_count,
      COUNT(DISTINCT c.id) AS comments_count,
      ${
        userId
          ? `EXISTS(
               SELECT 1 FROM \`${SCHEMA}\`.likes l2 
               WHERE l2.place_id = p.id AND l2.user_id = ?
             ) AS user_liked`
          : `FALSE AS user_liked`
      }
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `;

  const params = userId ? [userId, ...whereParams] : whereParams;

  const [rows] = await pool.query(query, params);
  return rows;
};

export const getPlacesByRoute = async (routeId, user = null) => {
  let userId = null;
  let role = 0;

  if (user && typeof user === 'object') {
    userId = user.id ?? null;
    role = user.role ?? 0;
  } else if (typeof user === 'number' || typeof user === 'string') {
    userId = Number(user) || null;
  }

  let extraWhere = '';
  const whereParams = [routeId];

  if (role === 2 && userId) {
    extraWhere = 'AND p.createdBy = ?';
    whereParams.push(userId);
  } else {
    extraWhere = "AND p.status = 'aprobada'";
  }

  const query = `
    SELECT 
      p.*,
      r.name AS route_name,
      COUNT(DISTINCT l.id) AS likes_count,
      COUNT(DISTINCT c.id) AS comments_count,
      ${
        userId
          ? `EXISTS(
               SELECT 1 FROM \`${SCHEMA}\`.likes l2
               WHERE l2.place_id = p.id AND l2.user_id = ?
             ) AS user_liked`
          : `FALSE AS user_liked`
      }
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE p.route_id = ?
      ${extraWhere}
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `;

  const params = userId ? [userId, ...whereParams] : whereParams;

  const [rows] = await pool.query(query, params);
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

export const updatePlace = async (id, updates, modifiedBy) => {
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), modifiedBy, id];

  const [result] = await pool.query(
    `UPDATE \`${SCHEMA}\`.place SET ${fields}, modifiedAt = NOW(), modifiedBy = ? WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

export const deletePlace = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM \`${SCHEMA}\`.place WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
};

export const findPlacesByCityId = async (cityId) => {
  const [rows] = await pool.query(
    `SELECT 
      p.*, 
      r.name AS route_name,
      u.name as creatorName,
      u.lastName as creatorLastName,
      u.City_id,
      c.name as cityName,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT cm.id) as comments_count
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.users u ON p.createdBy = u.id
    LEFT JOIN \`${SCHEMA}\`.city c ON u.City_id = c.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment cm ON p.id = cm.place_id
    WHERE u.City_id = ? AND p.status = 'pendiente'
    GROUP BY p.id
    ORDER BY p.createdAt DESC`,
    [cityId]
  );

  const placesWithSchedules = await Promise.all(
    rows.map(async (place) => {
      const schedules = await getSchedulesByPlaceId(place.id);
      return {
        ...place,
        schedules
      };
    })
  );

  return placesWithSchedules;
};

export const findAllPendingPlaces = async () => {
  const [rows] = await pool.query(
    `SELECT 
      p.*, 
      r.name AS route_name,
      u.name as creatorName,
      u.lastName as creatorLastName,
      u.City_id,
      c.name as cityName,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT cm.id) as comments_count
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.users u ON p.createdBy = u.id
    LEFT JOIN \`${SCHEMA}\`.city c ON u.City_id = c.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment cm ON p.id = cm.place_id
    WHERE p.status = 'pendiente'
    GROUP BY p.id
    ORDER BY p.createdAt DESC`
  );

  const placesWithSchedules = await Promise.all(
    rows.map(async (place) => {
      const schedules = await getSchedulesByPlaceId(place.id);
      return {
        ...place,
        schedules
      };
    })
  );

  return placesWithSchedules;
};