import {
  createPlace,
  getAllPlaces,
  getPlaceById,
  getPlacesByRoute,
  updatePlace,
  deletePlace
} from "../models/placeModel.js";

// Crear nuevo lugar
export const createPlaceController = async (req, res) => {
  try {
    const { name, description, latitude, longitude, route_id, website, phoneNumber } = req.body;
    const createdBy = req.user?.id;

    // Validar campos obligatorios
    if (!name || !description || !latitude || !longitude || !route_id) {
      return res.status(400).json({ 
        message: "Faltan campos obligatorios: name, description, latitude, longitude, route_id" 
      });
    }

    // Manejar la imagen si se subió
    let image_url = '';
    if (req.file) {
      image_url = req.file.filename || req.file.path || '';
    }

    const placeId = await createPlace({ 
      name, 
      description, 
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      route_id: parseInt(route_id),
      website: website || '',
      phoneNumber: phoneNumber || '',
      image_url: image_url,
      createdBy 
    });
    
    res.status(201).json({ 
      message: "Lugar creado con éxito", 
      placeId,
      status: "activo"
    });
  } catch (error) {
    console.error("Error al crear lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Listar todos los lugares
export const getPlacesController = async (req, res) => {
  try {
    const places = await getAllPlaces();
    res.json(places);
  } catch (error) {
    console.error("Error al obtener lugares:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener lugares por ruta
export const getPlacesByRouteController = async (req, res) => {
  try {
    const { routeId } = req.params;
    const places = await getPlacesByRoute(routeId);
    res.json(places);
  } catch (error) {
    console.error("Error al obtener lugares por ruta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener lugar por ID
export const getPlaceByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const place = await getPlaceById(id);
    
    if (!place) {
      return res.status(404).json({ message: "Lugar no encontrado" });
    }
    
    res.json(place);
  } catch (error) {
    console.error("Error al obtener lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updatePlaceController = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const modifiedBy = req.user.id;

    // Convertir tipos numéricos
    if (updates.latitude) updates.latitude = parseFloat(updates.latitude);
    if (updates.longitude) updates.longitude = parseFloat(updates.longitude);
    if (updates.route_id) updates.route_id = parseInt(updates.route_id);

    const existingPlace = await getPlaceById(id);
    if (!existingPlace) {
      return res.status(404).json({ message: "Lugar no encontrado" });
    }

    if (req.file) {
      updates.image_url = req.file.filename || req.file.path || '';
    }

    const updated = await updatePlace(id, updates, modifiedBy);
    if (updated === 0) {
      return res.status(400).json({ message: "No se pudo actualizar el lugar" });
    }

    res.json({ 
      message: "Lugar actualizado correctamente",
      updatedPlace: { ...existingPlace, ...updates }
    });
  } catch (error) {
    console.error("Error al actualizar lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Eliminar lugar (BORRADO FÍSICO)
export const deletePlaceController = async (req, res) => {
  try {
    const { id } = req.params;

    const existingPlace = await getPlaceById(id);
    if (!existingPlace) {
      return res.status(404).json({ message: "Lugar no encontrado" });
    }

    const deleted = await deletePlace(id);
    if (deleted === 0) {
      return res.status(400).json({ message: "No se pudo eliminar el lugar" });
    }

    res.json({ message: "Lugar eliminado permanentemente" });
  } catch (error) {
    console.error("Error al eliminar lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};