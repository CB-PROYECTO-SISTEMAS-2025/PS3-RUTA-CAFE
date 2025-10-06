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
  deletePlaceSchedules,
  findPlacesByCityId,
  findAllPendingPlaces
} from "../models/placeModel.js";
import pool, { SCHEMA } from "../config/db.js";
import path from "path";
import { findUserWithCity, getAllCities } from "../models/userModel.js";

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
// Obtener lugares pendientes de la ciudad del admin
export const getPlacesByAdminCity = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const admin = await findUserWithCity(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Administrador no encontrado" });
    }

    if (!admin.City_id) {
      return res.status(400).json({ message: "El administrador no tiene ciudad asignada" });
    }

    // Obtener lugares pendientes de usuarios de la misma ciudad
    const places = await findPlacesByCityId(admin.City_id);
    // Convertir URLs de imágenes
    const placesWithPublicUrls = places.map(place => ({
      ...place,
      image_url: place.image_url ? toPublicUrl(req, place.image_url) : ""
    }));

    res.json({
      message: "Lugares obtenidos correctamente",
      places,
      adminCity: {
        id: admin.City_id,
        name: admin.cityName || 'Ciudad no especificada'
      }
    });

  } catch (error) {
    console.error("Error en getPlacesByAdminCity:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
// Obtener lugares por ciudad específica
export const getPlacesBySpecificCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    
    if (!cityId) {
      return res.status(400).json({ message: "ID de ciudad no proporcionado" });
    }

    const places = await findPlacesByCityId(cityId);
    const cities = await getAllCities();
    const selectedCity = cities.find(city => city.id == cityId);
        // Convertir URLs de imágenes
    const placesWithPublicUrls = places.map(place => ({
      ...place,
      image_url: place.image_url ? toPublicUrl(req, place.image_url) : ""
    }));

    res.json({
      message: `Lugares de ${selectedCity?.name || 'ciudad seleccionada'} obtenidos correctamente`,
      places,
      selectedCity: selectedCity || { id: cityId, name: 'Ciudad no encontrada' }
    });

  } catch (error) {
    console.error("Error en getPlacesBySpecificCity:", error);
    res.status(500).json({ 
      message: "Error en el servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener todos los lugares pendientes
export const getPendingPlacesController = async (req, res) => {
  try {
    const places = await findAllPendingPlaces();
     // Convertir URLs de imágenes
    const placesWithPublicUrls = places.map(place => ({
      ...place,
      image_url: place.image_url ? toPublicUrl(req, place.image_url) : ""
    }));
    res.json({
      message: "Lugares pendientes obtenidos correctamente",
      places,
      filter: 'all'
    });
  } catch (error) {
    console.error("Error al obtener lugares pendientes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Aprobar o rechazar lugar
export const approveRejectPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionComment } = req.body;
    const modifiedBy = req.user.id;

    if (!['aprobada', 'rechazada'].includes(status)) {
      return res.status(400).json({ 
        message: "Estado inválido. Debe ser 'aprobada' o 'rechazada'" 
      });
    }

    if (status === 'rechazada' && !rejectionComment) {
      return res.status(400).json({ 
        message: "Se requiere un comentario de rechazo" 
      });
    }

    const updates = { 
      status,
      ...(status === 'rechazada' && { rejectionComment })
    };

    const updated = await updatePlace(id, updates, modifiedBy);
    if (updated === 0) return res.status(404).json({ message: "Lugar no encontrado" });

    res.json({ 
      message: `Lugar ${status} correctamente`,
      status,
      rejectionComment: status === 'rechazada' ? rejectionComment : null
    });

  } catch (error) {
    console.error("Error al aprobar/rechazar lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};