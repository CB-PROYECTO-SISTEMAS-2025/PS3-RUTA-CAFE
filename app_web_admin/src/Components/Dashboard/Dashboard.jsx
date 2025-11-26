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
      const token =
        localStorage.getItem('adminToken') ||
        sessionStorage.getItem('adminToken') ||
        localStorage.getItem('token');

      if (!token) throw new Error('No hay token de autenticación disponible');

      const response = await fetch('http://localhost:4000/api/users/dashboard', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok)
        throw new Error(`Error ${response.status}: ${response.statusText}`);

      const data = await response.json();
      if (data.success) setStats(data.data);
      else throw new Error(data.message || 'Error al obtener datos');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Error al cargar los datos del dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-700 font-medium text-lg">Cargando datos del Dashboard...</p>
      </div>
    );

  if (error)
    return (
      <div className="p-10 flex flex-col justify-center items-center bg-gradient-to-br from-red-50 to-pink-100 h-screen">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">❌ Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Reintentar 🔁
          </button>
        </div>
      </div>
    );

  if (!stats)
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No hay datos disponibles.
          <button
            onClick={fetchDashboardData}
            className="ml-4 bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );

  const adminCount = stats.usersByRole.find(item => item.role === 1)?.count || 0;
  const technicianCount = stats.usersByRole.find(item => item.role === 2)?.count || 0;
  const userCount = stats.usersByRole.find(item => item.role === 3)?.count || 0;

  return (
    <div className="p-8 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-10 flex items-center gap-3">
        📊 <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Panel General de Datos</span>
      </h2>

      {/* 🔹 Tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        {[
          { title: "Total Usuarios", value: stats.totalUsers, icon: "👥", color: "bg-blue-100 text-blue-700" },
          { title: "Administradores", value: adminCount, icon: "👑", color: "bg-red-100 text-red-700" },
          { title: "Técnicos", value: technicianCount, icon: "🧰", color: "bg-green-100 text-green-700" },
          { title: "Usuarios Normales", value: userCount, icon: "👤", color: "bg-purple-100 text-purple-700" },
        ].map((card, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                <p className="text-4xl font-extrabold text-gray-800 mt-2">{card.value}</p>
              </div>
              <div className={`w-14 h-14 ${card.color} rounded-xl flex items-center justify-center text-3xl shadow-inner`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔸 Rutas y Usuarios por departamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rutas Aprobadas */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Rutas Aprobadas</h3>
            <div className="bg-green-100 w-10 h-10 flex items-center justify-center rounded-lg text-2xl">✅</div>
          </div>
          <p className="text-4xl font-extrabold text-green-600 mb-3">{stats.approvedRoutes}</p>
          {stats.routesByDepartment?.length > 0 && (
            <div className="mt-3 space-y-1 text-sm">
              <h4 className="text-gray-600 font-semibold mb-1">Por Departamento:</h4>
              {stats.routesByDepartment.map((dept, i) => (
                <div key={i} className="flex justify-between text-gray-700">
                  <span>{dept.department}</span>
                  <span className="font-bold text-green-600">{dept.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usuarios por Departamento */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Usuarios por Departamento</h3>
            <div className="bg-blue-100 w-10 h-10 flex items-center justify-center rounded-lg text-2xl">🏢</div>
          </div>
          {stats.usersByDepartment?.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto text-sm">
              {stats.usersByDepartment.map((dept, i) => (
                <div
                  key={i}
                  className="flex justify-between bg-gray-50 px-3 py-2 rounded-lg"
                >
                  <span>{dept.department || "Sin departamento"}</span>
                  <span className="font-semibold text-blue-700">{dept.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No hay datos registrados</p>
          )}
        </div>
      </div>

      {/* 🔹 Sitios aprobados */}
      <div className="mt-10 bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Sitios Aprobados</h3>
          <div className="bg-green-100 w-10 h-10 flex items-center justify-center rounded-lg text-2xl">🏕️</div>
        </div>
        <p className="text-4xl font-extrabold text-green-600 mb-3">{stats.approvedPlaces}</p>
        {stats.placesApprovedByCity?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {stats.placesApprovedByCity.map((city, i) => (
              <div
                key={i}
                className="flex justify-between bg-gray-50 px-3 py-2 rounded-lg"
              >
                <span>{city.city}</span>
                <span className="font-semibold text-gray-700">{city.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ❤️ Likes y 💬 Comentarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
          <h3 className="text-lg font-bold text-pink-600 mb-3">❤️ Top 5 Sitios con más Likes</h3>
          {stats.topPlacesByLikes?.length > 0 ? (
            <ol className="list-decimal list-inside text-gray-700 text-sm space-y-1">
              {stats.topPlacesByLikes.map((p, i) => (
                <li key={i} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="font-semibold text-pink-600">{p.likes_count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-gray-500 text-sm">No hay lugares con likes aún</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
          <h3 className="text-lg font-bold text-indigo-600 mb-3">💬 Sitios con más Comentarios</h3>
          {stats.topPlacesByComments?.length > 0 ? (
            <ol className="list-decimal list-inside text-gray-700 text-sm space-y-1">
              {stats.topPlacesByComments.map((p, i) => (
                <li key={i} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="font-semibold text-indigo-600">{p.comments_count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-gray-500 text-sm">Sin comentarios aún</p>
          )}
        </div>
      </div>

      {/* ❤️ Likes por Ciudad */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition mt-10">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Likes por Ciudad 🌆</h3>
        {stats.likesByCity?.length > 0 ? (
          <div className="space-y-2 text-sm text-gray-700">
            {stats.likesByCity.map((c, i) => (
              <div key={i} className="flex justify-between bg-gray-50 px-3 py-2 rounded-lg">
                <span>{c.city}</span>
                <span className="font-semibold text-blue-600">{c.total_likes}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Sin likes registrados</p>
        )}
      </div>

      {/* ⏳ Pendientes */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-2xl shadow-lg border border-orange-100 mt-10">
        <h3 className="text-lg font-bold text-orange-700 mb-3">Pendientes ⏳</h3>
        <div className="grid grid-cols-2 text-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Rutas Pendientes</p>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingRoutes}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sitios Pendientes</p>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingPlaces}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex justify-between items-center text-gray-500 text-sm">
        <p>Última actualización: {new Date().toLocaleTimeString()}</p>
        <button
          onClick={fetchDashboardData}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-lg hover:scale-105 transition shadow-md flex items-center gap-2"
        >
          🔄 Actualizar Datos
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
