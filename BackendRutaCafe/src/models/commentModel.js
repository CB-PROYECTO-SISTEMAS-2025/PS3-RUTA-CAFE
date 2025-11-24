import pool, { SCHEMA } from "../config/db.js";

export const CommentModel = {
  // Crear un comentario
  async create(commentData) {
    const { user_id, place_id, comment, createdBy } = commentData;
    const query = `
      INSERT INTO \`${SCHEMA}\`.comment (user_id, place_id, comment, createdBy, createdAt, modifiedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    const values = [user_id, place_id, comment, createdBy];
    
    const [result] = await pool.query(query, values);
    
    // Obtener el comentario recién creado
    const [newComment] = await pool.query(
      `SELECT * FROM \`${SCHEMA}\`.comment WHERE id = ?`,
      [result.insertId]
    );
    return newComment[0];
  },

  // Obtener comentarios por lugar
  async getByPlaceId(place_id) {
    const query = `
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email
      FROM \`${SCHEMA}\`.comment c
      LEFT JOIN \`${SCHEMA}\`.users u ON c.user_id = u.id
      WHERE c.place_id = ?
      ORDER BY c.createdAt DESC
    `;
    const [result] = await pool.query(query, [place_id]);
    return result;
  },

  // Obtener comentario por ID
  async getById(id) {
    const query = `
      SELECT * FROM \`${SCHEMA}\`.comment 
      WHERE id = ?
    `;
    const [result] = await pool.query(query, [id]);
    return result[0];
  },

  // Actualizar comentario
  async update(id, commentData) {
    const { comment, modifiedBy } = commentData;
    const query = `
      UPDATE \`${SCHEMA}\`.comment 
      SET comment = ?, modifiedBy = ?, modifiedAt = NOW()
      WHERE id = ?
    `;
    const values = [comment, modifiedBy, id];
    
    const [result] = await pool.query(query, values);
    
    // Devolver el comentario actualizado
    if (result.affectedRows > 0) {
      return await this.getById(id);
    }
    return null;
  },

  // Eliminar comentario
  async delete(id) {
    // Primero obtener el comentario antes de eliminarlo
    const comment = await this.getById(id);
    
    const query = `
      DELETE FROM \`${SCHEMA}\`.comment 
      WHERE id = ?
    `;
    const [result] = await pool.query(query, [id]);
    
    return result.affectedRows > 0 ? comment : null;
  },

  // Contar comentarios por lugar
  async countByPlaceId(place_id) {
    const query = `
      SELECT COUNT(*) as count 
      FROM \`${SCHEMA}\`.comment 
      WHERE place_id = ?
    `;
    const [result] = await pool.query(query, [place_id]);
    return parseInt(result[0].count);
  }
};