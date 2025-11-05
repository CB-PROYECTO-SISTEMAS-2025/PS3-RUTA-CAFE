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
  findAllPendingPlaces,
  countPendingPlacesByUser, // 👈 import del contador
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
// Función para limpiar y validar URLs
const cleanAndValidateUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  
  // Limpiar espacios y caracteres especiales
  let cleaned = url.trim()
                   .replace(/\s+/g, '')  // Remover todos los espacios
                   .replace(/[”“"''‘’`]/g, '') // Remover comillas curvas y especiales
                   .replace(/[，,。]/g, '.') // Reemplazar caracteres especiales por puntos
                   .replace(/[~]/g, '') // Remover caracteres inválidos
                   .replace(/[二]/g, '+'); // Reemplazar caracteres chinos por +

  // Si está vacío después de limpiar, retornar vacío
  if (!cleaned) return '';

  // Si no tiene protocolo, agregar https://
  if (!cleaned.match(/^https?:\/\//i)) {
    cleaned = 'https://' + cleaned;
  }

  // Validación básica de formato URL
  try {
    const urlObj = new URL(cleaned);
    
    // Asegurar que el protocolo sea http o https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }

    return cleaned.toLowerCase();
  } catch (error) {
    console.log('❌ URL inválida después de limpieza:', cleaned);
    return '';
  }
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

    // 🔧 LIMPIAR Y VALIDAR URL ANTES DE GUARDAR
    const cleanedWebsite = cleanAndValidateUrl(website);
    if (website && !cleanedWebsite) {
      return res.status(400).json({
        message: "La URL del sitio web proporcionada no es válida",
        originalUrl: website
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

    // 🔒 Límite de sitios pendientes por usuario
    const MAX_PENDING = parseInt(process.env.MAX_PENDING_PLACES_PER_USER || '1', 10);
    if (createdBy && Number.isFinite(MAX_PENDING) && MAX_PENDING > 0) {
      const pendingCount = await countPendingPlacesByUser(createdBy);
      if (pendingCount >= MAX_PENDING) {
        return res.status(409).json({
          code: 'PENDING_LIMIT',
          message: `No puedes crear más lugares. Límite de pendientes: ${MAX_PENDING}.`,
          currentPending: pendingCount,
          limit: MAX_PENDING
        });
      }
    }

    // Procesar imagen principal
    let image_url = "";
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
      const limitedFiles = files.slice(0, 8);
      additionalImages = limitedFiles.map(file => 
        path.posix.join("/uploads/places", file.filename)
      );
      console.log("🖼️ Imágenes adicionales procesadas:", additionalImages.length);
    }

    // Crear el lugar con la URL limpia
    console.log("📝 Creando lugar en BD...");
    const placeId = await createPlace({
      name,
      description,
      latitude: lat,
      longitude: lng,
      route_id: routeIdNum,
      website: cleanedWebsite, // 🔧 USAR URL LIMPIA
      phoneNumber: (phoneNumber || "").trim(),
      image_url,
      createdBy,
    });

    console.log("✅ Lugar creado con ID:", placeId);
    console.log("🌐 Website guardado:", cleanedWebsite || 'No proporcionado');

    // Horarios
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

    // Imágenes adicionales
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
      website: cleanedWebsite, // 🔧 RETORNAR URL LIMPIA AL CLIENTE
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
    


    // 🔍 AGREGAR LOG PARA DEBUG DEL WEBSITE
    console.log('🌐 Website del lugar:', {
      id: place.id,
      name: place.name,
      website: place.website,
      websiteType: typeof place.website,
      websiteLength: place.website ? place.website.length : 0,
      hasWebsite: !!place.website
    });


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
    const {
      schedules,
      remove_main_image,
      deleted_additional_image_ids,
      ...updates
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

    // 🔥 NUEVO: Obtener el lugar actual para verificar su estado
    const currentPlace = await getPlaceById(id);
    if (!currentPlace) {
      return res.status(404).json({ message: "Lugar no encontrado" });
    }

    console.log('🎯 Estado actual del lugar:', currentPlace.status);

    // 🔧 LIMPIAR Y VALIDAR URL SI SE PROPORCIONA
    if (updates.website !== undefined) {
      const cleanedWebsite = cleanAndValidateUrl(updates.website);
      if (updates.website && !cleanedWebsite) {
        return res.status(400).json({
          message: "La URL del sitio web proporcionada no es válida",
          originalUrl: updates.website
        });
      }
      updates.website = cleanedWebsite;
      console.log("🌐 Website actualizado:", cleanedWebsite || 'Eliminado');
    }

    const allowedFields = [
      'name', 'description', 'latitude', 'longitude', 'route_id',
      'website', 'phoneNumber', 'image_url', 'status', 'rejectionComment'
    ];
    const filteredUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allowedFields.includes(k)) filteredUpdates[k] = v;
    }

    // 🔥 NUEVO: Si el lugar está rechazado, cambiar a pendiente
    if (currentPlace.status === 'rechazada') {
      console.log('🔄 Lugar rechazado detectado - Cambiando estado a pendiente');
      filteredUpdates.status = 'pendiente';
      filteredUpdates.rejectionComment = null; // Limpiar el comentario de rechazo
    }

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

    // Imagen principal
    const wantRemoveMain = remove_main_image === '1' || remove_main_image === 'true';
    if (wantRemoveMain) {
      filteredUpdates.image_url = "";
      console.log("🧹 Se eliminará la imagen principal");
    } else if (req.files && req.files.image && req.files.image[0]) {
      filteredUpdates.image_url = path.posix.join("/uploads/places", req.files.image[0].filename);
      console.log("🖼️ Imagen principal actualizada:", filteredUpdates.image_url);
    } else {
      console.log("ℹ️ Imagen principal: se mantiene la existente");
    }

    console.log('📤 Updates a aplicar:', filteredUpdates);

    const updated = await updatePlace(id, filteredUpdates, modifiedBy);
    if (!updated) return res.status(400).json({ message: "No se pudo actualizar el lugar" });

    // Imágenes adicionales
    let updatedImages = [];
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

    updatedImages = await getImagesByPlaceId(id);

    // Horarios
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

    const updatedPlace = await getPlaceById(id);
    const merged = {
      ...updatedPlace,
      additional_images: updatedImages,
      schedules: updatedSchedules,
    };

    merged.image_url = merged.image_url ? toPublicUrl(req, merged.image_url) : null;
    merged.additional_images = merged.additional_images.map(img => ({
      ...img,
      image_url: toPublicUrl(req, img.image_url)
    }));

    res.json({
      message: "Lugar actualizado correctamente",
      // 🔥 NUEVO: Informar si cambió el estado
      statusChanged: currentPlace.status === 'rechazada',
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

    await deletePlaceSchedules(id);
    await deletePlaceImages(id);
    
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

    const places = await findPlacesByCityId(admin.City_id);
    
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

export const getPlacesBySpecificCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    
    if (!cityId) {
      return res.status(400).json({ message: "ID de ciudad no proporcionado" });
    }

    const places = await findPlacesByCityId(cityId);
    const cities = await getAllCities();
    const selectedCity = cities.find(city => city.id == cityId);
    
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

export const getPendingPlacesController = async (req, res) => {
  try {
    const places = await findAllPendingPlaces();
    
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

// ✅ Aprobar o rechazar lugar (limpia comentario al aprobar)
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
      ...(status === 'rechazada' && { rejectionComment }),
      ...(status === 'aprobada' && { rejectionComment: null }) // 👈 limpiar si se aprueba
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

// ✅ Consultar si el usuario tiene pendientes (para bloquear botón en el cliente)
export const checkPendingPlaces = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await countPendingPlacesByUser(userId);
    res.json({ hasPending: count > 0, pendingCount: count });
  } catch (error) {
    console.error('Error checking pending places:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
