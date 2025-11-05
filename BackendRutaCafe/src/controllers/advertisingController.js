// src/controllers/advertisingController.js
import {
  createAd, getAllAds, getAdById, updateAd, deleteAd, getPublicActiveAds
} from "../models/advertisingModel.js";
import path from "path";

// ==== helpers comunes ====

const toPublicUrl = (req, maybeRelative) => {
  if (!maybeRelative) return "";
  if (maybeRelative.startsWith("http")) return maybeRelative;
  return `${req.protocol}://${req.get("host")}${maybeRelative}`;
};

// Normaliza espacios (colapsa múltiples y recorta)
const normalizeSpaces = (s = "") => s.replace(/\s+/g, " ").trim();

// No permite iniciar con espacio ni dobles espacios
const noLeadingOrDoubleSpaces = (s = "") => /^[^\s](?!.*\s{2,}).*$/.test(s);

// Devuelve una fecha sin hora (00:00:00) en TZ del servidor
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Agrega días
const addDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

// ==== controladores ====

export const listAdsAdmin = async (req, res) => {
  try {
    const ads = await getAllAds();
    const mapped = ads.map(a => ({
      ...a,
      image_url: a.image_url ? toPublicUrl(req, a.image_url) : ""
    }));
    res.json(mapped);
  } catch (e) {
    console.error("listAdsAdmin:", e);
    res.status(500).json({ message: "Error al obtener publicidades" });
  }
};

export const listAdsPublic = async (req, res) => {
  try {
    const ads = await getPublicActiveAds();
    const mapped = ads.map(a => ({
      ...a,
      image_url: a.image_url ? toPublicUrl(req, a.image_url) : ""
    }));
    res.json(mapped);
  } catch (e) {
    console.error("listAdsPublic:", e);
    res.status(500).json({ message: "Error al obtener publicidades" });
  }
};

export const getAdCtrl = async (req, res) => {
  try {
    const ad = await getAdById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Publicidad no encontrada" });
    ad.image_url = ad.image_url ? toPublicUrl(req, ad.image_url) : "";
    res.json(ad);
  } catch (e) {
    console.error("getAdCtrl:", e);
    res.status(500).json({ message: "Error al obtener publicidad" });
  }
};

export const createAdCtrl = async (req, res) => {
  try {
    let {
      title, description, enlace_url, status, start_date, end_date, image_url
    } = req.body;

    // --------- VALIDACIONES ---------
    // Requeridos: title, description, start_date, end_date, imagen (file o image_url), status
    title = normalizeSpaces(title);
    description = normalizeSpaces(description);

    if (!title || !description || !start_date || !end_date || (!req.file && !image_url)) {
      return res.status(400).json({ message: "Todos los campos son obligatorios excepto enlace_url" });
    }

    if (!noLeadingOrDoubleSpaces(title)) {
      return res.status(400).json({ message: "El título no debe iniciar con espacios ni contener dobles espacios" });
    }
    if (!noLeadingOrDoubleSpaces(description)) {
      return res.status(400).json({ message: "La descripción no debe iniciar con espacios ni contener dobles espacios" });
    }

    // Fechas
    const now0 = startOfDay(new Date());
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Fechas inválidas" });
    }
    if (start < now0) {
      return res.status(400).json({ message: "La fecha de inicio debe ser hoy o posterior" });
    }
    const minEnd = addDays(startOfDay(start), 1); // al menos mañana respecto al día de inicio
    if (end < minEnd) {
      return res.status(400).json({ message: "La fecha fin debe ser al menos un día después de la fecha inicio" });
    }

    // Imagen (si viene archivo, pisa image_url)
    let finalImage = image_url || "";
    if (req.file) {
      finalImage = path.posix.join("/uploads/ads", req.file.filename);
    }

    const id = await createAd({
      title,
      description,
      image_url: finalImage,
      enlace_url: (enlace_url || "").trim(),
      status: (status || "activo"),
      start_date,
      end_date,
      createdBy: req.user?.id || null
    });

    const ad = await getAdById(id);
    ad.image_url = ad.image_url ? toPublicUrl(req, ad.image_url) : "";
    res.status(201).json(ad);
  } catch (e) {
    console.error("createAdCtrl:", e);
    res.status(500).json({ message: "Error al crear publicidad" });
  }
};

export const updateAdCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getAdById(id);
    if (!existing) return res.status(404).json({ message: "Publicidad no encontrada" });

    // Campos recibidos (algunos pueden venir vacíos, pero son obligatorios conceptualmente)
    let {
      title, description, enlace_url, status, start_date, end_date, image_url
    } = req.body;

    // Normalizar y validar título/descr si vienen en el body
    if (title !== undefined) {
      title = normalizeSpaces(title);
      if (!title || !noLeadingOrDoubleSpaces(title)) {
        return res.status(400).json({ message: "Título inválido: no debe iniciar con espacios ni contener dobles espacios" });
      }
    }
    if (description !== undefined) {
      description = normalizeSpaces(description);
      if (!description || !noLeadingOrDoubleSpaces(description)) {
        return res.status(400).json({ message: "Descripción inválida: no debe iniciar con espacios ni contener dobles espacios" });
      }
    }

    // Si mandan fechas, validarlas ambas en conjunto:
    const haveStart = start_date !== undefined ? new Date(start_date) : null;
    const haveEnd = end_date !== undefined ? new Date(end_date) : null;

    if (haveStart && Number.isNaN(haveStart.getTime())) {
      return res.status(400).json({ message: "Fecha de inicio inválida" });
    }
    if (haveEnd && Number.isNaN(haveEnd.getTime())) {
      return res.status(400).json({ message: "Fecha fin inválida" });
    }

    // Determinar fechas efectivas (si no mandan, tomar las existentes)
    const effStart = haveStart || new Date(existing.start_date);
    const effEnd = haveEnd || new Date(existing.end_date);

    const now0 = startOfDay(new Date());
    if (effStart < now0) {
      return res.status(400).json({ message: "La fecha de inicio debe ser hoy o posterior" });
    }
    const minEnd = addDays(startOfDay(effStart), 1);
    if (effEnd < minEnd) {
      return res.status(400).json({ message: "La fecha fin debe ser al menos un día después de la fecha inicio" });
    }

    // Validar obligatoriedad global en update:
    // (si algo queda vacío por el update, debe seguir cumpliendo)
    const willTitle = title ?? existing.title;
    const willDesc = description ?? existing.description;
    const willStatus = status ?? existing.status;
    let willImage = existing.image_url;

    if (req.file) {
      willImage = path.posix.join("/uploads/ads", req.file.filename);
    } else if (image_url !== undefined) {
      willImage = image_url; // "" para quitar o ruta existente
    }

    if (!willTitle || !willDesc || !effStart || !effEnd || !willImage || !willStatus) {
      return res.status(400).json({ message: "Todos los campos son obligatorios excepto enlace_url" });
    }

    const updates = {
      title: willTitle,
      description: willDesc,
      enlace_url: enlace_url !== undefined ? (enlace_url || "").trim() : existing.enlace_url,
      status: willStatus,
      start_date: effStart,
      end_date: effEnd,
      image_url: willImage
    };

    const affected = await updateAd(id, updates, req.user?.id || null);
    if (!affected) return res.status(400).json({ message: "No se pudo actualizar" });

    const updated = await getAdById(id);
    updated.image_url = updated.image_url ? toPublicUrl(req, updated.image_url) : "";
    res.json(updated);
  } catch (e) {
    console.error("updateAdCtrl:", e);
    res.status(500).json({ message: "Error al actualizar publicidad" });
  }
};

export const deleteAdCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getAdById(id);
    if (!existing) return res.status(404).json({ message: "Publicidad no encontrada" });

    const affected = await deleteAd(id);
    if (!affected) return res.status(400).json({ message: "No se pudo eliminar" });

    res.json({ message: "Publicidad eliminada" });
  } catch (e) {
    console.error("deleteAdCtrl:", e);
    res.status(500).json({ message: "Error al eliminar publicidad" });
  }
};
