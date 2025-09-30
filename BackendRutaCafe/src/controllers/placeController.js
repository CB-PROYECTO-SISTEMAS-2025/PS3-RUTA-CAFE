// src/controllers/placeController.js
import {
  createPlace,
  getAllPlaces,
  getPlaceById,
  getPlacesByRoute,
  updatePlace,
  deletePlace,
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
    const { name, description, latitude, longitude, route_id, website, phoneNumber } = req.body;
    const createdBy = req.user?.id;

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

    // ===================== DEBUG TEMPORAL =====================
    try {
      const [dbNameRows] = await pool.query("SELECT DATABASE() AS db");
      console.log("🟠 DEBUG DB EN USO  =>", dbNameRows?.[0]?.db);

      console.log("🟠 DEBUG route_id recibido (raw) =>", route_id, " | parseado =>", routeIdNum);

      const [firstRoutes] = await pool.query(
        `SELECT id, name, status FROM \`${SCHEMA}\`.route ORDER BY id LIMIT 5`
      );
      console.log("🟠 DEBUG primeras rutas en la DB actual =>", firstRoutes);
    } catch (dbgErr) {
      console.log("🟠 DEBUG error ejecutando pruebas:", dbgErr);
    }
    // =================== /DEBUG TEMPORAL ======================

    // ✅ verifica existencia en el schema correcto
    const [rows] = await pool.query(
      `SELECT id FROM \`${SCHEMA}\`.route WHERE id = ?`,
      [routeIdNum]
    );
    if (!rows.length) {
      return res.status(400).json({ message: `La ruta ${routeIdNum} no existe` });
    }

    let image_url = "";
    if (req.file) {
      image_url = path.posix.join("/uploads/places", req.file.filename); // guardamos relativo
    }

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

    return res.status(201).json({
      message: "Lugar creado con éxito",
      placeId,
      image_url: toPublicUrl(req, image_url),
      status: "pendiente",
    });
  } catch (error) {
    console.error("Error al crear lugar:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// (los demás controllers se quedan igual)
export const getPlacesController = async (req, res) => {
  try {
    const places = await getAllPlaces();
    const data = places.map((p) => ({
      ...p,
      image_url: p.image_url ? toPublicUrl(req, p.image_url) : "",
    }));
    res.json(data);
  } catch (error) {
    console.error("Error al obtener lugares:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPlacesByRouteController = async (req, res) => {
  try {
    const { routeId } = req.params;
    const places = await getPlacesByRoute(routeId);
    const data = places.map((p) => ({
      ...p,
      image_url: p.image_url ? toPublicUrl(req, p.image_url) : "",
    }));
    res.json(data);
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
    place.image_url = place.image_url ? toPublicUrl(req, place.image_url) : "";
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

    const merged = { ...existingPlace, ...updates };
    merged.image_url = merged.image_url ? toPublicUrl(req, merged.image_url) : "";
    res.json({ message: "Lugar actualizado correctamente", updatedPlace: merged });
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

    const deleted = await deletePlace(id);
    if (!deleted) return res.status(400).json({ message: "No se pudo eliminar el lugar" });

    res.json({ message: "Lugar eliminado permanentemente" });
  } catch (error) {
    console.error("Error al eliminar lugar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
