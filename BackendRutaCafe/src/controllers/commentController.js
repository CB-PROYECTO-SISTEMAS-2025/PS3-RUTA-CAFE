import { CommentModel } from "../models/commentModel.js";

export const commentController = {
  // Crear comentario
  async create(req, res) {
    try {
      const { place_id, comment } = req.body;
      const user_id = req.user.id;

      if (!place_id || !comment) {
        return res.status(400).json({
          success: false,
          message: "Place ID y comentario son requeridos"
        });
      }

      // Validar que el comentario no esté vacío
      if (comment.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "El comentario no puede estar vacío"
        });
      }

      const commentData = {
        user_id,
        place_id,
        comment: comment.trim(),
        createdBy: user_id
      };

      const newComment = await CommentModel.create(commentData);
      
      if (!newComment) {
        return res.status(500).json({
          success: false,
          message: "Error al crear el comentario"
        });
      }

      res.status(201).json({
        success: true,
        message: "Comentario creado exitosamente",
        data: newComment
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Obtener comentarios por lugar
  async getByPlaceId(req, res) {
    try {
      const { place_id } = req.params;

      if (!place_id) {
        return res.status(400).json({
          success: false,
          message: "Place ID es requerido"
        });
      }

      const comments = await CommentModel.getByPlaceId(place_id);
      
      res.status(200).json({
        success: true,
        data: comments
      });
    } catch (error) {
      console.error("Error getting comments:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Actualizar comentario
  async update(req, res) {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const user_id = req.user.id;

      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "El comentario es requerido y no puede estar vacío"
        });
      }

      // Verificar que el comentario existe y pertenece al usuario
      const existingComment = await CommentModel.getById(id);
      if (!existingComment) {
        return res.status(404).json({
          success: false,
          message: "Comentario no encontrado"
        });
      }

      if (existingComment.user_id !== user_id) {
        return res.status(403).json({
          success: false,
          message: "No tienes permiso para editar este comentario"
        });
      }

      const updatedComment = await CommentModel.update(id, {
        comment: comment.trim(),
        modifiedBy: user_id
      });

      if (!updatedComment) {
        return res.status(500).json({
          success: false,
          message: "Error al actualizar el comentario"
        });
      }

      res.status(200).json({
        success: true,
        message: "Comentario actualizado exitosamente",
        data: updatedComment
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Eliminar comentario
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      // Verificar que el comentario existe
      const existingComment = await CommentModel.getById(id);
      if (!existingComment) {
        return res.status(404).json({
          success: false,
          message: "Comentario no encontrado"
        });
      }

      // Solo el creador del comentario puede eliminarlo
      if (existingComment.user_id !== user_id) {
        return res.status(403).json({
          success: false,
          message: "No tienes permiso para eliminar este comentario"
        });
      }

      const deleted = await CommentModel.delete(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: "Error al eliminar el comentario"
        });
      }

      res.status(200).json({
        success: true,
        message: "Comentario eliminado exitosamente"
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }
};