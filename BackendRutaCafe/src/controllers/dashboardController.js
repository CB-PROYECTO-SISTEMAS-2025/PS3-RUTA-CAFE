// src/controllers/dashboardController.js
import { getDashboardStats } from "../models/userModel.js";

export const getDashboardData = async (req, res) => {
  try {
    console.log("🚀 Iniciando obtención de datos del dashboard...");

    const stats = await getDashboardStats();

    // Mapeo de nombres de roles legibles
    const roleNames = {
      1: "Administrador",
      2: "Técnico",
      3: "Usuario Normal",
    };

    // Convertir usersByRole (array o objeto) a formato unificado
    let usersByRole = [];
    if (Array.isArray(stats.usersByRole)) {
      usersByRole = stats.usersByRole.map((r) => ({
        role: r.role,
        roleName: roleNames[r.role] || `Rol ${r.role}`,
        count: r.count,
      }));
    } else {
      usersByRole = Object.keys(stats.usersByRole || {}).map((role) => ({
        role: parseInt(role),
        roleName: roleNames[role] || `Rol ${role}`,
        count: stats.usersByRole[role],
      }));
    }

    const formattedStats = {
      /* === Usuarios === */
      totalUsers: stats.totalUsers || 0,
      usersByRole,
      usersByDepartment: stats.usersByDepartment || [],

      /* === Rutas === */
      approvedRoutes: stats.approvedRoutes || 0,
      pendingRoutes: stats.pendingRoutes || 0,
      routesByDepartment: stats.routesByDepartment || [],

      /* === Sitios === */
      approvedPlaces: stats.approvedPlaces || 0,
      pendingPlaces: stats.pendingPlaces || 0,
      placesApprovedByCity: stats.placesApprovedByCity || [],

      /* === Likes y Comentarios === */
      topPlacesByLikes: stats.topPlacesByLikes || [],
      likesByCity: stats.likesByCity || [],
      topPlacesByComments: stats.topPlacesByComments || [],
    };

    console.log("✅ Datos del dashboard formateados:", formattedStats);

    res.json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    console.error("❌ Error en getDashboardData:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener datos del dashboard",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
