// controllers/favoriteController.js
import { FavoriteModel } from "../models/favoriteModel.js";

export const favoriteController = {
  // Agregar a favoritos
  async add(req, res) {
    try {
      const { place_id } = req.body;
      const user_id = req.user.id;

      if (!place_id) {
        return res.status(400).json({
          success: false,
          message: "Place ID es requerido"
        });
      }

      // Verificar si ya es favorito
      const isAlreadyFavorite = await FavoriteModel.isFavorite(user_id, place_id);
      if (isAlreadyFavorite) {
        return res.status(400).json({
          success: false,
          message: "Este lugar ya está en tus favoritos"
        });
      }

      const favorite = await FavoriteModel.create(user_id, place_id);
      
      res.status(201).json({
        success: true,
        message: "Lugar agregado a favoritos",
        data: favorite
      });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Eliminar de favoritos
  async remove(req, res) {
    try {
      const { place_id } = req.body;
      const user_id = req.user.id;

      if (!place_id) {
        return res.status(400).json({
          success: false,
          message: "Place ID es requerido"
        });
      }

      // Verificar si existe el favorito
      const isFavorite = await FavoriteModel.isFavorite(user_id, place_id);
      if (!isFavorite) {
        return res.status(404).json({
          success: false,
          message: "Este lugar no está en tus favoritos"
        });
      }

      const favorite = await FavoriteModel.delete(user_id, place_id);
      
      res.status(200).json({
        success: true,
        message: "Lugar eliminado de favoritos",
        data: favorite
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Toggle favorito
  async toggle(req, res) {
    try {
      const { place_id } = req.body;
      const user_id = req.user.id;

      if (!place_id) {
        return res.status(400).json({
          success: false,
          message: "Place ID es requerido"
        });
      }

      // Verificar si ya es favorito
      const isFavorite = await FavoriteModel.isFavorite(user_id, place_id);
      
      let action, result;
      if (isFavorite) {
        result = await FavoriteModel.delete(user_id, place_id);
        action = "removed";
      } else {
        result = await FavoriteModel.create(user_id, place_id);
        action = "added";
      }

      res.status(200).json({
        success: true,
        message: `Lugar ${action === 'added' ? 'agregado a' : 'eliminado de'} favoritos`,
        data: {
          favorite: result,
          is_favorite: action === 'added'
        }
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Obtener favoritos del usuario
  async getUserFavorites(req, res) {
    try {
      const user_id = req.user.id;

      const favorites = await FavoriteModel.getByUserId(user_id);
      
      res.status(200).json({
        success: true,
        data: favorites
      });
    } catch (error) {
      console.error("Error getting user favorites:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Verificar si un lugar es favorito
  async checkFavorite(req, res) {
    try {
      const { place_id } = req.params;
      const user_id = req.user.id;

      if (!place_id) {
        return res.status(400).json({
          success: false,
          message: "Place ID es requerido"
        });
      }

      const isFavorite = await FavoriteModel.isFavorite(user_id, place_id);
      
      res.status(200).json({
        success: true,
        data: {
          is_favorite: isFavorite
        }
      });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  },

  // Contar favoritos de un lugar
  async getFavoriteCount(req, res) {
    try {
      const { place_id } = req.params;

      if (!place_id) {
        return res.status(400).json({
          success: false,
          message: "Place ID es requerido"
        });
      }

      const count = await FavoriteModel.countByPlaceId(place_id);
      
      res.status(200).json({
        success: true,
        data: {
          favorite_count: count
        }
      });
    } catch (error) {
      console.error("Error getting favorite count:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }
};