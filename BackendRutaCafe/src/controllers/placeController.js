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
  createPlaceImages,
  getImagesByPlaceId,
  deletePlaceImages,
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
  
  // En producción, usar dominio configurado
  if (process.env.NODE_ENV === 'production' && process.env.DOMAIN_URL) {
    return `${process.env.DOMAIN_URL}${maybeRelative}`;
  }
  
  // En desarrollo, usar el host de la request
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

    // 🔴 CORRECCIÓN CRÍTICA: Procesar imagen principal usando req.files
    let image_url = ""; // String vacío en lugar de null
    if (req.files && req.files.image && req.files.image[0]) {
      image_url = path.posix.join("/uploads/places", req.files.image[0].filename);
      console.log("🖼️ Imagen principal procesada:", image_url);
    } else {
      console.log("ℹ️ No se envió imagen principal");
    }

    // Procesar imágenes adicionales
    let additionalImages = [];
    if (req.files && req.files.additional_images) {
      const files = Array.isArray(req.files.additional_images) 
        ? req.files.additional_images 
        : [req.files.additional_images];
      
      // Limitar a 8 imágenes máximo
      const limitedFiles = files.slice(0, 8);
      additionalImages = limitedFiles.map(file => 
        path.posix.join("/uploads/places", file.filename)
      );
      console.log("🖼️ Imágenes adicionales procesadas:", additionalImages.length);
    }

    // Crear el lugar
    console.log("📝 Creando lugar en BD...");
    const placeId = await createPlace({
      name,
      description,
      latitude: lat,
      longitude: lng,
      route_id: routeIdNum,
      website: (website || "").trim(),
      phoneNumber: (phoneNumber || "").trim(),
      image_url, // Ahora será string vacío en lugar de null
      createdBy,
    });

    console.log("✅ Lugar creado con ID:", placeId);

    // Procesar horarios si existen
    let createdSchedules = [];
    if (schedules) {
      try {
        const schedulesData = JSON.parse(schedules);
        console.log("📅 Procesando horarios:", schedulesData);
        
        if (Array.isArray(schedulesData) && schedulesData.length > 0) {
          createdSchedules = await createPlaceSchedules(placeId, schedulesData);
          console.log("✅ Horarios creados:", createdSchedules.length);
        }
      } catch (scheduleError) {
        console.error("❌ Error procesando horarios:", scheduleError);
      }
    }

    // Crear imágenes adicionales si existen
    let createdImages = [];
    if (additionalImages.length > 0) {
      try {
        createdImages = await createPlaceImages(placeId, additionalImages);
        console.log("🖼️ Imágenes adicionales creadas:", createdImages.length);
      } catch (imageError) {
        console.error("❌ Error creando imágenes adicionales:", imageError);
      }
    }

    return res.status(201).json({
      message: "Lugar creado con éxito",
      placeId,
      image_url: image_url ? toPublicUrl(req, image_url) : null,
      additional_images: createdImages.map(img => ({
        ...img,
        image_url: toPublicUrl(req, img.image_url)
      })),
      status: "pendiente",
      schedules: createdSchedules
    });
  } catch (error) {
    console.error("❌ Error al crear lugar:", error);
    return res.status(500).json({ 
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getPlacesController = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    console.log("➡️ getPlacesController user=", req.user);

    console.log(`📊 Cargando lugares para usuario: ${userId || 'visitante'}`);
    
    const places = await getAllPlaces(req.user || { id: null, role: 0 });
    
    // Obtener horarios e imágenes para cada lugar
    const placesWithDetails = await Promise.all(
      places.map(async (place) => {
        const schedules = await getSchedulesByPlaceId(place.id);
        const images = await getImagesByPlaceId(place.id);
        return {
          ...place,
          image_url: place.image_url ? toPublicUrl(req, place.image_url) : null,
          additional_images: images.map(img => ({
            ...img,
            image_url: toPublicUrl(req, img.image_url)
          })),
          schedules
        };
      })
    );
    
    res.json(placesWithDetails);
  } catch (error) {
    console.error("Error al obtener lugares:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPlacesByRouteController = async (req, res) => {
  try {
   const { routeId } = req.params;
    const userId = req.user?.id || null;
    
    console.log(`📊 Cargando lugares de ruta ${routeId} para usuario: ${userId || 'visitante'}`);
    
    const places = await getPlacesByRoute(routeId, req.user || { id: null, role: 0 });
    
    // Obtener horarios e imágenes para cada lugar
    const placesWithDetails = await Promise.all(
      places.map(async (place) => {
        const schedules = await getSchedulesByPlaceId(place.id);
        const images = await getImagesByPlaceId(place.id);
        return {
          ...place,
          image_url: place.image_url ? toPublicUrl(req, place.image_url) : null,
          additional_images: images.map(img => ({
            ...img,
            image_url: toPublicUrl(req, img.image_url)
          })),
          schedules
        };
      })
    );
    
    res.json(placesWithDetails);
  } catch (error) {
    console.error("Error al obtener lugares por ruta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPlaceByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    console.log("➡️ getPlacesController user=", req.user);

    
    console.log(`📊 Cargando lugar ${id} para usuario: ${userId || 'visitante'}`);
    
    const place = await getPlaceById(id, userId);
    if (!place) return res.status(404).json({ message: "Lugar no encontrado" });
    
    // Obtener horarios e imágenes del lugar
    const schedules = await getSchedulesByPlaceId(id);
    const images = await getImagesByPlaceId(id);
    
    place.image_url = place.image_url ? toPublicUrl(req, place.image_url) : null;
    place.additional_images = images.map(img => ({
      ...img,
      image_url: toPublicUrl(req, img.image_url)
    }));
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

    // vienen como multipart/form-data
    const {
      schedules,                        // string JSON opcional
      remove_main_image,                // '1'|'0' o 'true'|'false'
      deleted_additional_image_ids,     // string JSON: "[1,2,3]"
      ...updates                        // el resto de campos editables
    } = req.body;

    const modifiedBy = req.user.id;

    console.log("📥 Actualizando lugar:", {
      id,
      bodyKeys: Object.keys(req.body),
      hasNewMain: !!(req.files && req.files.image && req.files.image[0]),
      hasNewAdditional: !!(req.files && req.files.additional_images),
      remove_main_image,
      deleted_additional_image_ids
    });

    // 🔒 Filtramos SOLO campos válidos de la tabla place
    const allowedFields = [
      'name', 'description', 'latitude', 'longitude', 'route_id',
      'website', 'phoneNumber', 'image_url', 'status', 'rejectionComment'
    ];
    const filteredUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allowedFields.includes(k)) filteredUpdates[k] = v;
    }

    // Normalización de tipos
    if (filteredUpdates.latitude) filteredUpdates.latitude = parseFloat(filteredUpdates.latitude);
    if (filteredUpdates.longitude) filteredUpdates.longitude = parseFloat(filteredUpdates.longitude);

    if (filteredUpdates.route_id) {
      filteredUpdates.route_id = parseInt(filteredUpdates.route_id);
      const [r] = await pool.query(
        `SELECT id FROM \`${SCHEMA}\`.route WHERE id = ?`,
        [filteredUpdates.route_id]
      );
      if (!r.length) return res.status(400).json({ message: `La ruta ${filteredUpdates.route_id} no existe` });
    }

    // Verificar que exista el place
    const existingPlace = await getPlaceById(id);
    if (!existingPlace) return res.status(404).json({ message: "Lugar no encontrado" });

    // =========================
    //  Imagen principal (place.image_url)
    // =========================
    const wantRemoveMain = remove_main_image === '1' || remove_main_image === 'true';
    if (wantRemoveMain) {
      filteredUpdates.image_url = ""; // limpiar
      console.log("🧹 Se eliminará la imagen principal");
    } else if (req.files && req.files.image && req.files.image[0]) {
      filteredUpdates.image_url = path.posix.join("/uploads/places", req.files.image[0].filename);
      console.log("🖼️ Imagen principal actualizada:", filteredUpdates.image_url);
    } else {
      console.log("ℹ️ Imagen principal: se mantiene la existente");
    }

    // 1) Actualizar datos base del place
    const updated = await updatePlace(id, filteredUpdates, modifiedBy);
    if (!updated) return res.status(400).json({ message: "No se pudo actualizar el lugar" });

    // =========================
    //  Imágenes adicionales (tabla place_images)
    // =========================
    let updatedImages = [];
    // 1) Borrado selectivo por IDs (si vienen)
    try {
      const ids = deleted_additional_image_ids ? JSON.parse(deleted_additional_image_ids) : [];
      if (Array.isArray(ids) && ids.length > 0) {
        await pool.query(
          `DELETE FROM \`${SCHEMA}\`.place_images 
           WHERE place_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
          [id, ...ids]
        );
        console.log(`🧹 Eliminadas ${ids.length} imágenes adicionales`);
      }
    } catch (e) {
      console.error("❌ JSON inválido en deleted_additional_image_ids:", e);
    }

    // 2) Agregar nuevas (si llegaron archivos)
    if (req.files && req.files.additional_images) {
      try {
        const files = Array.isArray(req.files.additional_images)
          ? req.files.additional_images
          : [req.files.additional_images];

        if (files.length > 0) {
          const limited = files.slice(0, 8);
          const urls = limited.map(f => path.posix.join("/uploads/places", f.filename));
          await createPlaceImages(id, urls);
          console.log("➕ Añadidas", urls.length, "imágenes adicionales nuevas");
        }
      } catch (imageError) {
        console.error("❌ Error agregando imágenes adicionales:", imageError);
      }
    }

    // 3) Cargar estado final de las imágenes
    updatedImages = await getImagesByPlaceId(id);

    // =========================
    //  Horarios
    // =========================
    let updatedSchedules = [];
    if (schedules) {
      try {
        await deletePlaceSchedules(id);
        const schedulesData = JSON.parse(schedules);
        if (Array.isArray(schedulesData) && schedulesData.length > 0) {
          updatedSchedules = await createPlaceSchedules(id, schedulesData);
          console.log("📅 Horarios actualizados:", updatedSchedules.length);
        }
      } catch (scheduleError) {
        console.error("❌ Error actualizando horarios:", scheduleError);
        updatedSchedules = await getSchedulesByPlaceId(id);
      }
    } else {
      updatedSchedules = await getSchedulesByPlaceId(id);
    }

    // =========================
    //  Respuesta final
    // =========================
    const updatedPlace = await getPlaceById(id);
    const merged = {
      ...updatedPlace,
      additional_images: updatedImages,
      schedules: updatedSchedules,
    };

    // URLs absolutas públicas
    merged.image_url = merged.image_url ? toPublicUrl(req, merged.image_url) : null;
    merged.additional_images = merged.additional_images.map(img => ({
      ...img,
      image_url: toPublicUrl(req, img.image_url)
    }));

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

    // Eliminar horarios e imágenes primero (por las foreign keys)
    await deletePlaceSchedules(id);
    await deletePlaceImages(id);
    
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
      image_url: place.image_url ? toPublicUrl(req, place.image_url) : null,
      additional_images: place.additional_images.map(img => ({
        ...img,
        image_url: toPublicUrl(req, img.image_url)
      }))
    }));

    res.json({
      message: "Lugares obtenidos correctamente",
      places: placesWithPublicUrls,
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
      image_url: place.image_url ? toPublicUrl(req, place.image_url) : null,
      additional_images: place.additional_images.map(img => ({
        ...img,
        image_url: toPublicUrl(req, img.image_url)
      }))
    }));

    res.json({
      message: `Lugares de ${selectedCity?.name || 'ciudad seleccionada'} obtenidos correctamente`,
      places: placesWithPublicUrls,
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
      image_url: place.image_url ? toPublicUrl(req, place.image_url) : null,
      additional_images: place.additional_images.map(img => ({
        ...img,
        image_url: toPublicUrl(req, img.image_url)
      }))
    }));
    
    res.json({
      message: "Lugares pendientes obtenidos correctamente",
      places: placesWithPublicUrls,
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