import { createRoute, getAllRoutes, getRouteById, updateRoute, deleteRoute, findRoutesByCityId, findAllPendingRoutes }
    from "../models/routeModel.js";
import { findUserWithCity, getAllCities } from "../models/userModel.js";
// Crear nueva ruta
export const createRouteController = async (req, res) => {
  try {
    const { name, description } = req.body;
    const createdBy = req.user.id;

    if (!name || !description) {
      return res.status(400).json({ message: "Faltan campos obligatorios: name y description" });
    }

    // 🔥 CAMBIO: Manejar la imagen subida
    let image_url = '';
    if (req.file) {
      image_url = `/uploads/routes/${req.file.filename}`;
    }

    const status = "pendiente";

    const routeId = await createRoute({
      name,
      description,
      status,
      image_url,
      createdBy
    });

    res.status(201).json({
      message: "Ruta creada con éxito",
      routeId,
      status: "pendiente"
    });
  } catch (error) {
    console.error("Error al crear ruta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
// Listar todas las rutas
export const getRoutesController = async (req, res) => {
    try {
        const viewer = { role: req.user?.role ?? 0, userId: req.user?.id ?? null };
    const routes = await getAllRoutes(viewer);
    res.json(routes);
    } catch (error) {
        console.error("Error al obtener rutas:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
// Listar todas las rutas PENDIENTES
export const getPendingRoutesController = async (req, res) => {
  try {
    const routes = await findAllPendingRoutes();
    res.json({
      message: "Rutas pendientes obtenidas correctamente",
      routes,
      filter: 'all'
    });
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
// Obtener rutas de la ciudad del admin
export const getRoutesByAdminCity = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const admin = await findUserWithCity(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Administrador no encontrado" });
    }

    if (!admin.City_id) {
      return res.status(400).json({ message: "El administrador no tiene ciudad asignada" });
    }

    const routes = await findRoutesByCityId(admin.City_id);

    res.json({
      message: "Rutas obtenidas correctamente",
      routes,
      adminCity: {
        id: admin.City_id,
        name: admin.cityName || 'Ciudad no especificada'
      }
    });

  } catch (error) {
    console.error("Error en getRoutesByAdminCity:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
// Obtener rutas por ciudad específica
export const getRoutesBySpecificCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    
    if (!cityId) {
      return res.status(400).json({ message: "ID de ciudad no proporcionado" });
    }

    const routes = await findRoutesByCityId(cityId);
    const cities = await getAllCities();
    const selectedCity = cities.find(city => city.id == cityId);

    res.json({
      message: `Rutas de ${selectedCity?.name || 'ciudad seleccionada'} obtenidas correctamente`,
      routes,
      selectedCity: selectedCity || { id: cityId, name: 'Ciudad no encontrada' }
    });

  } catch (error) {
    console.error("Error en getRoutesBySpecificCity:", error);
    res.status(500).json({ 
      message: "Error en el servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Aprobar o rechazar ruta
export const approveRejectRoute = async (req, res) => {
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

    const updated = await updateRoute(id, updates, modifiedBy);
    if (updated === 0) return res.status(404).json({ message: "Ruta no encontrada" });

    res.json({ 
      message: `Ruta ${status} correctamente`,
      status,
      rejectionComment: status === 'rechazada' ? rejectionComment : null
    });

  } catch (error) {
    console.error("Error al aprobar/rechazar ruta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
// Obtener ruta por ID
export const getRouteByIdController = async (req, res) => {
    try {
        const { id } = req.params;
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
    } catch (error) {
        console.error("Error al obtener ruta:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Actualizar ruta
export const updateRouteController = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const modifiedBy = req.user.id;

    // 🔥 CAMBIO: Manejar la imagen subida
    let updates = { name, description };
    if (req.file) {
      updates.image_url = `/uploads/routes/${req.file.filename}`;
    }

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
