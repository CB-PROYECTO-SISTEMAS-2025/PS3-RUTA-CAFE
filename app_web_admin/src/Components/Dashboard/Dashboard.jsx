import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // ✅ USAR LA MISMA LÓGICA QUE EN GESTIÓN DE USUARIOS
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    console.log("🔑 Token obtenido:", token.substring(0, 20) + "...");
      // ✅ CORREGIDO: Cambia a puerto 4000
      const response = await fetch('http://localhost:4000/api/users/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Error al obtener datos');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Error al cargar los datos del dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 ml-4">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>{error}</strong>
          <div className="mt-2 text-sm">
            <p>Verifica que:</p>
            <ul className="list-disc list-inside ml-4">
              <li>El backend esté corriendo en puerto 4000</li>
              <li>Estés logueado como administrador</li>
              <li>Tu token sea válido</li>
            </ul>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No hay datos disponibles
          <button 
            onClick={fetchDashboardData}
            className="ml-4 bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Encontrar counts por rol
  const adminCount = stats.usersByRole.find(item => item.role === 1)?.count || 0;
  const technicianCount = stats.usersByRole.find(item => item.role === 2)?.count || 0;
  const userCount = stats.usersByRole.find(item => item.role === 3)?.count || 0;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      
      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{adminCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👑</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Técnicos</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{technicianCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Normales</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{userCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda Fila - Rutas y Departamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rutas Aprobadas */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Rutas Aprobadas</h3>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.approvedRoutes}</p>
          
          {/* Rutas por Departamento */}
          {stats.routesByDepartment && stats.routesByDepartment.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Por Departamento:</h4>
              <div className="space-y-2">
                {stats.routesByDepartment.map((dept, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{dept.department}</span>
                    <span className="font-semibold">{dept.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-2">No hay rutas aprobadas</p>
          )}
        </div>

        {/* Usuarios por Departamento */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Usuarios por Departamento</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🏢</span>
            </div>
          </div>
          
          {stats.usersByDepartment && stats.usersByDepartment.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {stats.usersByDepartment.map((dept, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{dept.department || 'Sin departamento'}</span>
                  <span className="font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {dept.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No hay datos de departamentos</p>
          )}
        </div>
      </div>

      {/* Botón para actualizar datos */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Última actualización: {new Date().toLocaleTimeString()}
        </p>
        <button 
          onClick={fetchDashboardData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <span>🔄</span>
          <span className="ml-2">Actualizar Datos</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;