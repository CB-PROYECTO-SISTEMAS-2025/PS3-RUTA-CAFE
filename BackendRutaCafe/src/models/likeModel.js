import pool, { SCHEMA } from "../config/db.js";

export const LikeModel = {
  // Dar like o quitar like
  async toggle(likeData) {
    const { user_id, place_id } = likeData;
    
    // Verificar si ya existe el like
    const checkQuery = `
      SELECT * FROM \`${SCHEMA}\`.likes 
      WHERE user_id = ? AND place_id = ?
    `;
    const [checkResult] = await pool.query(checkQuery, [user_id, place_id]);
    
    if (checkResult.length > 0) {
      // Si existe, eliminar (quitar like)
      const deleteQuery = `
        DELETE FROM \`${SCHEMA}\`.likes 
        WHERE user_id = ? AND place_id = ?
      `;
      await pool.query(deleteQuery, [user_id, place_id]);
      return { liked: false };
    } else {
      // Si no existe, crear (dar like)
      const insertQuery = `
        INSERT INTO \`${SCHEMA}\`.likes (user_id, place_id, createdAt)
        VALUES (?, ?, NOW())
      `;
      await pool.query(insertQuery, [user_id, place_id]);
      return { liked: true };
    }
  },

  // Contar likes por lugar
  async countByPlaceId(place_id) {
    const query = `
      SELECT COUNT(*) as count 
      FROM \`${SCHEMA}\`.likes 
      WHERE place_id = ?
    `;
    const [result] = await pool.query(query, [place_id]);
    return parseInt(result[0].count);
  },

  // Verificar si el usuario dio like a un lugar
  async userLikedPlace(user_id, place_id) {
    const query = `
      SELECT * FROM \`${SCHEMA}\`.likes 
      WHERE user_id = ? AND place_id = ?
    `;
    const [result] = await pool.query(query, [user_id, place_id]);
    return result.length > 0;
  },

  // Obtener lugares liked por usuario
  async getLikedPlacesByUser(user_id) {
    const query = `
      SELECT l.*, p.name as place_name, p.description as place_description
      FROM \`${SCHEMA}\`.likes l
      JOIN \`${SCHEMA}\`.places p ON l.place_id = p.id
      WHERE l.user_id = ?
      ORDER BY l.createdAt DESC
    `;
    const [result] = await pool.query(query, [user_id]);
    return result;
  }
};