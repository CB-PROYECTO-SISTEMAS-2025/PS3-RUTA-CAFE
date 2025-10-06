import { createRoute, getAllRoutes, getRouteById, updateRoute, deleteRoute, }
    from "../models/routeModel.js";

// Crear nueva ruta
// Crear nueva ruta
export const createRouteController = async (req, res) => {
  try {
    const { name, description, image_url } = req.body;
    const createdBy = req.user.id; // 👈 del token

    if (!name || !description) {
      return res.status(400).json({ message: "Faltan campos obligatorios: name y description" });
    }

    // Establecer estado "pendiente" por defecto
    const status = "pendiente";

    const routeId = await createRoute({ 
      name, 
      description, 
      status, // 👈 Estado por defecto
      image_url, 
      createdBy 
    });
    
    res.status(201).json({ 
      message: "Ruta creada con éxito", 
      routeId,
      status: "pendiente" // Confirmar el estado
    });
  } catch (error) {
    console.error("Error al crear ruta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
// GET index (con filtro backend)
export const getRoutesController = async (req, res) => {
  try {
    const viewer = { role: req.user?.role ?? 0, userId: req.user?.id ?? null };
    const routes = await getAllRoutes(viewer);
    res.json(routes);
  } catch (e) {
    console.error("Error al obtener rutas:", e);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener ruta por ID
export const getRouteByIdController = async (req, res) => {
  try {
    const route = await getRouteById(req.params.id);
    if (!route) return res.status(404).json({ message: "Ruta no encontrada" });

    const role = req.user?.role ?? 0;
    const uid  = req.user?.id ?? null;

    if ((role === 0 || role === 3) && route.status !== "aprobada") {
      return res.status(403).json({ message: "No autorizado" });
    }
    if (role === 2 && uid && route.createdBy !== uid) {
      return res.status(403).json({ message: "No autorizado" });
    }

    res.json(route);
  } catch (e) {
    console.error("Error al obtener ruta:", e);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Actualizar ruta
export const updateRouteController = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const modifiedBy = req.user.id;

        const updated = await updateRoute(id, updates, modifiedBy);
        if (updated === 0) return res.status(404).json({ message: "Ruta no encontrada" });

        res.json({ message: "Ruta actualizada correctamente" });
    } catch (error) {
        console.error("Error al actualizar ruta:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Eliminar ruta
export const deleteRouteController = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await deleteRoute(id);
        if (deleted === 0) return res.status(404).json({ message: "Ruta no encontrada" });

        res.json({ message: "Ruta eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar ruta:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
