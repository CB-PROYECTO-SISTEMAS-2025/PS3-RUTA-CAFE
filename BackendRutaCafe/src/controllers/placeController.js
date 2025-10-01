// src/controllers/placeController.js
import {
  createPlace,
  getAllPlaces,
  getPlaceById,
  getPlacesByRoute,
  updatePlace,
  deletePlace,
  createPlaceSchedules,
  getSchedulesByPlaceId,
  deletePlaceSchedules
} from "../models/placeModel.js";
import pool, { SCHEMA } from "../config/db.js";
import path from "path";

// genera URL pública absoluta si viene relativa
const toPublicUrl = (req, maybeRelative) => {
  if (!maybeRelative) return "";
  if (maybeRelative.startsWith("http")) return maybeRelative;
  return `${req.protocol}://${req.get("host")}${maybeRelative}`;
};

export const createPlaceController = async (req, res) => {
  try {
    const { name, description, latitude, longitude, route_id, website, phoneNumber, schedules } = req.body;
    const createdBy = req.user?.id;

    console.log("📥 Datos recibidos:", {
      name, description, latitude, longitude, route_id, website, phoneNumber,
      schedules: schedules ? JSON.parse(schedules) : null
    });

    if (!name || !description || !latitude || !longitude || !route_id) {
      return res.status(400).json({
        message: "Faltan campos obligatorios: name, description, latitude, longitude, route_id",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const routeIdNum = parseInt(route_id);

    if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(routeIdNum)) {
      return res.status(400).json({ message: "Tipos inválidos en latitude/longitude/route_id" });
    }

    // Verificar existencia de la ruta
    const [rows] = await pool.query(
      `SELECT id FROM \`${SCHEMA}\`.route WHERE id = ?`,
      [routeIdNum]
    );
    if (!rows.length) {
      return res.status(400).json({ message: `La ruta ${routeIdNum} no existe` });
    }

    let image_url = "";
    if (req.file) {
      image_url = path.posix.join("/uploads/places", req.file.filename);
    }

    // Crear el lugar
    const placeId = await createPlace({
      name,
      description,
      latitude: lat,
      longitude: lng,
      route_id: routeIdNum,
      website: (website || "").trim(),
      phoneNumber: (phoneNumber || "").trim(),
      image_url,
      createdBy,
    });

    // Procesar horarios si existen
    let createdSchedules = [];
    if (schedules) {
      try {
        const schedulesData = JSON.parse(schedules);
        console.log("📅 Procesando horarios:", schedulesData);
        
        if (Array.isArray(schedulesData) && schedulesData.length > 0) {
          createdSchedules = await createPlaceSchedules(placeId, schedulesData);
          console.log("✅ Horarios creados:", createdSchedules);
        }
      } catch (scheduleError) {
        console.error("❌ Error procesando horarios:", scheduleError);
        // No hacemos return aquí para no bloquear la creación del lugar
      }
    }

    return res.status(201).json({
      message: "Lugar creado con éxito",
      placeId,
      image_url: toPublicUrl(req, image_url),
      status: "pendiente",
      schedules: createdSchedules
    });
  } catch (error) {
    console.error("Error al crear lugar:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPlacesController = async (req, res) => {
  try {
    const places = await getAllPlaces();
    
    // Obtener horarios para cada lugar
    const placesWithSchedules = await Promise.all(
      places.map(async (place) => {
        const schedules = await getSchedulesByPlaceId(place.id);
        return {
          ...place,
          image_url: place.image_url ? toPublicUrl(req, place.image_url) : "",
          schedules
        };
      })
    );
    
    res.json(placesWithSchedules);
  } catch (error) {
    console.error("Error al obtener lugares:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPlacesByRouteController = async (req, res) => {
  try {
    const { routeId } = req.params;
    const places = await getPlacesByRoute(routeId);
    
    // Obtener horarios para cada lugar
    const placesWithSchedules = await Promise.all(
      places.map(async (place) => {
        const schedules = await getSchedulesByPlaceId(place.id);
        return {
          ...place,
          image_url: place.image_url ? toPublicUrl(req, place.image_url) : "",
          schedules
        };
      })
    );
    
    res.json(placesWithSchedules);
  } catch (error) {
    console.error("Error al obtener lugares por ruta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPlaceByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const place = await getPlaceById(id);
    if (!place) return res.status(404).json({ message: "Lugar no encontrado" });
    
    // Obtener horarios del lugar
    const schedules = await getSchedulesByPlaceId(id);
    
    place.image_url = place.image_url ? toPublicUrl(req, place.image_url) : "";
    place.schedules = schedules;
    
    res.json(place);
  } catch (error) {
    console.error("Error al obtener lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updatePlaceController = async (req, res) => {
  try {
    const { id } = req.params;
    const { schedules, ...updates } = req.body;
    const modifiedBy = req.user.id;

    console.log("📥 Actualizando lugar:", { id, updates, schedules });

    if (updates.latitude) updates.latitude = parseFloat(updates.latitude);
    if (updates.longitude) updates.longitude = parseFloat(updates.longitude);

    if (updates.route_id) {
      updates.route_id = parseInt(updates.route_id);
      const [r] = await pool.query(
        `SELECT id FROM \`${SCHEMA}\`.route WHERE id = ?`,
        [updates.route_id]
      );
      if (!r.length) return res.status(400).json({ message: `La ruta ${updates.route_id} no existe` });
    }

    const existingPlace = await getPlaceById(id);
    if (!existingPlace) return res.status(404).json({ message: "Lugar no encontrado" });

    if (req.file) {
      updates.image_url = path.posix.join("/uploads/places", req.file.filename);
    }

    const updated = await updatePlace(id, updates, modifiedBy);
    if (!updated) return res.status(400).json({ message: "No se pudo actualizar el lugar" });

    // Actualizar horarios si se enviaron
    let updatedSchedules = [];
    if (schedules) {
      try {
        // Eliminar horarios existentes
        await deletePlaceSchedules(id);
        
        // Crear nuevos horarios
        const schedulesData = JSON.parse(schedules);
        if (Array.isArray(schedulesData) && schedulesData.length > 0) {
          updatedSchedules = await createPlaceSchedules(id, schedulesData);
        }
      } catch (scheduleError) {
        console.error("❌ Error actualizando horarios:", scheduleError);
      }
    }

    const merged = { ...existingPlace, ...updates };
    merged.image_url = merged.image_url ? toPublicUrl(req, merged.image_url) : "";
    merged.schedules = updatedSchedules;
    
    res.json({ 
      message: "Lugar actualizado correctamente", 
      updatedPlace: merged 
    });
  } catch (error) {
    console.error("Error al actualizar lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deletePlaceController = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPlace = await getPlaceById(id);
    if (!existingPlace) return res.status(404).json({ message: "Lugar no encontrado" });

    // Eliminar horarios primero (por la foreign key)
    await deletePlaceSchedules(id);
    
    // Luego eliminar el lugar
    const deleted = await deletePlace(id);
    if (!deleted) return res.status(400).json({ message: "No se pudo eliminar el lugar" });

    res.json({ message: "Lugar eliminado permanentemente" });
  } catch (error) {
    console.error("Error al eliminar lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};