import pool, { SCHEMA } from "../config/db.js";

// Crear lugar
export const createPlace = async ({
  name, description, latitude, longitude, route_id,
  website, phoneNumber, image_url, createdBy
}) => {
  console.log("💾 Guardando en BD - Website:", website);
  
  const [result] = await pool.query(
    `INSERT INTO \`${SCHEMA}\`.place
     (name, description, latitude, longitude, route_id, webSite, phoneNumber, image_url, createdBy, createdAt, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pendiente')`,
    [
      name, description, latitude, longitude, route_id,
      website || "",
      phoneNumber || "", 
      image_url || "", 
      createdBy
    ]
  );
  return result.insertId;
};

// Obtener solo los lugares del técnico logeado (para filtros)
export const getPlacesByTechnician = async (userId) => {
  const query = `
    SELECT 
      p.*,
      r.name AS route_name,
      COUNT(DISTINCT l.id) AS likes_count,
      COUNT(DISTINCT c.id) AS comments_count,
      EXISTS(
        SELECT 1 FROM \`${SCHEMA}\`.likes l2 
        WHERE l2.place_id = p.id AND l2.user_id = ?
      ) AS user_liked
    FROM \`${SCHEMA}\`.place p
    LEFT JOIN \`${SCHEMA}\`.route r ON p.route_id = r.id
    LEFT JOIN \`${SCHEMA}\`.likes l ON p.id = l.place_id
    LEFT JOIN \`${SCHEMA}\`.comment c ON p.id = c.place_id
    WHERE p.createdBy = ?
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `;

  const [rows] = await pool.query(query, [userId, userId]);
  console.log(`📊 getPlacesByTechnician - UserId: ${userId}, Lugares encontrados: ${rows.length}`);
  return rows;
};



// Crear imágenes adicionales para un lugar
export const createPlaceImages = async (placeId, imageUrls) => {
  const createdImages = [];
  
  for (const imageUrl of imageUrls) {
    const [result] = await pool.query(
      `INSERT INTO \`${SCHEMA}\`.place_images 
       (place_id, image_url, created_at) 
       VALUES (?, ?, NOW())`,
      [placeId, imageUrl]
    );
    
    createdImages.push({
      id: result.insertId,
      place_id: placeId,
      image_url: imageUrl,
      created_at: new Date()
    });
  }
  
  return createdImages;
};

// Obtener imágenes por lugar
export const getImagesByPlaceId = async (placeId) => {
  const [rows] = await pool.query(
    `SELECT * FROM \`${SCHEMA}\`.place_images WHERE place_id = ? ORDER BY created_at ASC`,
    [placeId]
  );
  return rows;
};

// Eliminar imágenes de un lugar
export const deletePlaceImages = async (placeId) => {
  const [result] = await pool.query(
    `DELETE FROM \`${SCHEMA}\`.place_images WHERE place_id = ?`,
    [placeId]
  );
  return result.affectedRows;
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
export const getAllPlaces = async (user = null) => {
  let userId = null;
  let role = 0;

  if (user && typeof user === 'object') {
    userId = user.id ?? null;
    role = user.role ?? 0;
  } else if (typeof user === 'number' || typeof user === 'string') {
    userId = Number(user) || null;
  }

  // ✅ CORREGIDO: Técnicos ven TODOS los lugares aprobados, no solo los suyos
  let where = "1=1";
  const whereParams = [];

  if (role === 2) {
    // Técnico: ve TODOS los lugares aprobados (de todos los técnicos)
    where = "p.status = 'aprobada'";
  } else if (role === 0 || role === 3) {
    // Visitante o usuario normal: solo lugares aprobados
    where = "p.status = 'aprobada'";
  }
  // Admin (role = 1) ve todo sin filtro

  // SELECT con user_liked opcional
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

  // Orden de parámetros: primero el de user_liked (si aplica), luego los del WHERE
  const params = userId ? [userId, ...whereParams] : whereParams;

  const [rows] = await pool.query(query, params);
  
  console.log(`📊 getAllPlaces - Rol: ${role}, UserId: ${userId}, Lugares encontrados: ${rows.length}`);
  return rows;
};

// src/models/placeModel.js
export const getPlacesByRoute = async (routeId, user = null) => {
  let userId = null;
  let role = 0;

  if (user && typeof user === 'object') {
    userId = user.id ?? null;
    role = user.role ?? 0;
  } else if (typeof user === 'number' || typeof user === 'string') {
    userId = Number(user) || null;
  }

  // ✅ CORREGIDO: Técnicos ven TODOS los lugares aprobados de la ruta
  let extraWhere = '';
  const whereParams = [routeId];

  if (role === 2) {
    // Técnico: ve TODOS los lugares aprobados de esta ruta
    extraWhere = "AND p.status = 'aprobada'";
  } else if (role === 0 || role === 3) {
    // Visitante o usuario normal: solo lugares aprobados
    extraWhere = "AND p.status = 'aprobada'";
  }
  // Admin (role = 1) ve todo sin filtro

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

  // Si hay userId: primero para EXISTS, luego routeId
  const params = userId ? [userId, ...whereParams] : whereParams;

  const [rows] = await pool.query(query, params);
  
  console.log(`📊 getPlacesByRoute - Ruta: ${routeId}, Rol: ${role}, UserId: ${userId}, Lugares encontrados: ${rows.length}`);
  return rows;
};

export const getPlaceById = async (id, userId = null) => {
  let query = `
    SELECT 
      p.id, p.name, p.description, p.latitude, p.longitude, 
      p.route_id, p.status, p.rejectionComment, 
      p.webSite as website, p.phoneNumber, p.image_url,  
      p.createdBy, p.createdAt, p.modifiedAt, p.modifiedBy,
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
  console.log('🔍 Ejecutando consulta getPlaceById:', { id, userId });
  const [rows] = await pool.query(query, params);

  // 🔍 LOG CRÍTICO - Ver TODOS los campos que vienen de la BD
  if (rows.length > 0) {
    console.log('📊 TODOS los campos del lugar desde BD:', Object.keys(rows[0]));
    console.log('🌐 Valor específico de website:', rows[0].website);
  }

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

export const updatePlace = async (id, updates, modifiedBy) => {
  // ✅ CORRECCIÓN: Usar webSite (con S mayúscula)
  const allowedFields = [
    'name', 'description', 'latitude', 'longitude', 'route_id', 
    'webSite', 'phoneNumber', 'image_url', 'status', 'rejectionComment' 
  ];
  
  const filteredUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = value;
    }
  }
  
  // Si no hay campos válidos para actualizar, retornar 0
  if (Object.keys(filteredUpdates).length === 0) {
    console.log('⚠️ No hay campos válidos para actualizar');
    return 0;
  }
  
  const fields = Object.keys(filteredUpdates).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(filteredUpdates), modifiedBy, id];

  console.log('📝 Ejecutando UPDATE con:', { fields, values });

  const [result] = await pool.query(
    `UPDATE \`${SCHEMA}\`.place SET ${fields}, modifiedAt = NOW(), modifiedBy = ? WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

// ✅ Cuenta lugares en estado 'pendiente' del usuario
export const countPendingPlacesByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count 
     FROM \`${SCHEMA}\`.place 
     WHERE createdBy = ? AND status = 'pendiente'`,
    [userId]
  );
  return rows[0]?.count ?? 0;
};


// Eliminar lugar
export const deletePlace = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM \`${SCHEMA}\`.place WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
};

// Obtener lugares por ID de ciudad (a través del usuario creador)
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

  // Obtener horarios e imágenes para cada lugar
  const placesWithDetails = await Promise.all(
    rows.map(async (place) => {
      const schedules = await getSchedulesByPlaceId(place.id);
      const images = await getImagesByPlaceId(place.id);
      return {
        ...place,
        schedules,
        additional_images: images
      };
    })
  );

  return placesWithDetails;
};

// Obtener todos los lugares pendientes
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

  // Obtener horarios e imágenes para cada lugar
  const placesWithDetails = await Promise.all(
    rows.map(async (place) => {
      const schedules = await getSchedulesByPlaceId(place.id);
      const images = await getImagesByPlaceId(place.id);
      return {
        ...place,
        schedules,
        additional_images: images
      };
    })
  );

  return placesWithDetails;
};