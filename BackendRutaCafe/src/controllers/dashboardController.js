import { getDashboardStats } from "../models/userModel.js";

export const getDashboardData = async (req, res) => {
  try {
    console.log("🚀 Iniciando obtención de datos del dashboard...");
    
    const stats = await getDashboardStats();

    // Mapear los roles a nombres legibles
    const roleNames = {
      1: 'Administrador',
      2: 'Técnico', 
      3: 'Usuario Normal'
    };

    const formattedStats = {
      totalUsers: stats.totalUsers,
      usersByRole: Object.keys(stats.usersByRole || {}).map(role => ({
        role: parseInt(role),
        roleName: roleNames[role] || `Rol ${role}`,
        count: stats.usersByRole[role]
      })),
      approvedRoutes: stats.approvedRoutes || 0,
      routesByDepartment: stats.routesByDepartment || [],
      usersByDepartment: stats.usersByDepartment || []
    };

    console.log("✅ Datos del dashboard formateados:", formattedStats);

    res.json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error("❌ Error en getDashboardData:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener datos del dashboard",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};