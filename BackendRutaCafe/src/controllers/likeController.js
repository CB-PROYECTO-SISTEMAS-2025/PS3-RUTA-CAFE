import { LikeModel } from "../models/likeModel.js";

export const likeController = {
  // Toggle like
  async toggle(req, res) {
    try {
      const { place_id } = req.params;
      const user_id = req.user.id;

      if (!place_id) {
        return res.status(400).json({
          success: false,
          message: "Place ID es requerido"
        });
      }

      const likeData = {
        user_id,
        place_id: parseInt(place_id)
      };

      const result = await LikeModel.toggle(likeData);
      
      res.status(200).json({
        success: true,
        message: result.liked ? "Like agregado" : "Like removido",
        data: result
      });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Obtener likes count por lugar
  async getCountByPlace(req, res) {
    try {
      const { place_id } = req.params;

      const count = await LikeModel.countByPlaceId(place_id);
      
      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error("Error getting like count:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Verificar si usuario dio like
  async checkUserLike(req, res) {
    try {
      const { place_id } = req.params;
      const user_id = req.user.id;

      const liked = await LikeModel.userLikedPlace(user_id, place_id);
      
      res.status(200).json({
        success: true,
        data: { liked }
      });
    } catch (error) {
      console.error("Error checking user like:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Obtener lugares liked por usuario
  async getUserLikedPlaces(req, res) {
    try {
      const user_id = req.user.id;

      const likedPlaces = await LikeModel.getLikedPlacesByUser(user_id);
      
      res.status(200).json({
        success: true,
        data: likedPlaces
      });
    } catch (error) {
      console.error("Error getting user liked places:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }
};