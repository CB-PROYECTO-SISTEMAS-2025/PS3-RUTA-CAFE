// models/favoriteModel.js
import pool, { SCHEMA } from "../config/db.js";

export class FavoriteModel {
  // Agregar a favoritos
  static async create(userId, placeId) {
    try {
      const query = `
        INSERT INTO ${SCHEMA}.favorites (user_id, place_id, createdAt) 
        VALUES (?, ?, NOW()) 
      `;
      const values = [userId, placeId];
      
      const [result] = await pool.execute(query, values);
      
      // Obtener el favorito recién creado
      const [favorite] = await pool.execute(
        `SELECT * FROM ${SCHEMA}.favorites WHERE id = ?`,
        [result.insertId]
      );
      
      return favorite[0];
    } catch (error) {
      console.error("Error creating favorite:", error);
      throw error;
    }
  }

  // Eliminar de favoritos
  static async delete(userId, placeId) {
    try {
      // Primero obtener el favorito antes de eliminarlo
      const [favorite] = await pool.execute(
        `SELECT * FROM ${SCHEMA}.favorites WHERE user_id = ? AND place_id = ?`,
        [userId, placeId]
      );
      
      const query = `
        DELETE FROM ${SCHEMA}.favorites 
        WHERE user_id = ? AND place_id = ?
      `;
      const values = [userId, placeId];
      
      await pool.execute(query, values);
      return favorite[0] || null;
    } catch (error) {
      console.error("Error deleting favorite:", error);
      throw error;
    }
  }

  // Verificar si un lugar es favorito
  static async isFavorite(userId, placeId) {
    try {
      const query = `
        SELECT * FROM ${SCHEMA}.favorites 
        WHERE user_id = ? AND place_id = ?
      `;
      const values = [userId, placeId];
      
      const [rows] = await pool.execute(query, values);
      return rows.length > 0;
    } catch (error) {
      console.error("Error checking favorite:", error);
      throw error;
    }
  }

  // Obtener favoritos de un usuario con información del lugar
  static async getByUserId(userId) {
    try {
      const query = `
        SELECT 
          f.*,
          p.id as place_id,
          p.name as place_name,
          p.description as place_description,
          p.latitude,
          p.longitude,
          p.route_id,
          p.website,
          p.phoneNumber,
          p.image_url,
          p.status,
          p.createdAt as place_createdAt,
          r.name as route_name
        FROM ${SCHEMA}.favorites f
        JOIN ${SCHEMA}.place p ON f.place_id = p.id
        LEFT JOIN ${SCHEMA}.route r ON p.route_id = r.id
        WHERE f.user_id = ? AND p.status = 'aprobada'
        ORDER BY f.createdAt DESC
      `;
      const values = [userId];
      
      const [rows] = await pool.execute(query, values);
      return rows;
    } catch (error) {
      console.error("Error getting user favorites:", error);
      throw error;
    }
  }

  // Contar favoritos de un lugar
  static async countByPlaceId(placeId) {
    try {
      const query = `
        SELECT COUNT(*) as favorite_count 
        FROM ${SCHEMA}.favorites 
        WHERE place_id = ?
      `;
      const values = [placeId];
      
      const [rows] = await pool.execute(query, values);
      return parseInt(rows[0].favorite_count);
    } catch (error) {
      console.error("Error counting favorites:", error);
      throw error;
    }
  }

  // Obtener información completa de un favorito por ID
  static async getById(favoriteId) {
    try {
      const query = `
        SELECT 
          f.*,
          p.name as place_name,
          p.description as place_description,
          p.image_url,
          p.status
        FROM ${SCHEMA}.favorites f
        JOIN ${SCHEMA}.place p ON f.place_id = p.id
        WHERE f.id = ?
      `;
      const values = [favoriteId];
      
      const [rows] = await pool.execute(query, values);
      return rows[0] || null;
    } catch (error) {
      console.error("Error getting favorite by id:", error);
      throw error;
    }
  }
}