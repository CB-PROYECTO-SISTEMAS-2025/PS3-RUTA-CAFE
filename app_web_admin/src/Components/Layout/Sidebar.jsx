import React from 'react';

const Sidebar = ({ user, activeSection, setActiveSection, isSidebarOpen, setIsSidebarOpen, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'text-blue-600' },
    { id: 'users', label: 'Usuarios', icon: '👥', color: 'text-green-600' },
    { id: 'routes', label: 'Rutas', icon: '🗺️', color: 'text-purple-600' },
    { id: 'places', label: 'Lugares', icon: '📍', color: 'text-orange-600' },
    { id: 'advertising', label: 'Publicidades', icon: '🖼️', color: 'text-pink-600' },
    { id: 'profile', label: 'Mi Perfil', icon: '👤', color: 'text-gray-600' },
  ];

  return (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-xl border-r border-gray-200 transition-all duration-300 flex flex-col`}>
      {/* Header Sidebar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">

          {isSidebarOpen && (
            <div className="flex items-center space-x-3">

              {/* FOTO DEL USUARIO EN EL HEADER */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center text-white font-bold">
                {user?.photo ? (
                  <img
                    src={user.photo}
                    alt={user.fullName || "Usuario"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {user?.fullName?.charAt(0) || user?.name?.charAt(0) || "?"}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-lg font-bold text-gray-800">AdminPanel</h1>
                <p className="text-xs text-gray-500">v2.1</p>
              </div>

            </div>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? "«" : "»"}
          </button>

        </div>
      </div>


      {/* Menú de Navegación */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${activeSection === item.id
                ? 'bg-gray-800 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
              }`}
          >
            <span className="text-xl">{item.icon}</span>
            {isSidebarOpen && (
              <span className="font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer Sidebar */}
      <div className="p-4 border-t border-gray-200">
        {user && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center text-white font-bold">
              {user.photo ? (
                <img
                  src={user.photo}
                  alt={user.fullName || 'Usuario'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {user.fullName?.charAt(0) || user.name?.charAt(0)}
                </span>
              )}
            </div>

            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">Administrador</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onLogout}
          className={`w-full mt-4 flex items-center space-x-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 ${!isSidebarOpen && 'justify-center'
            }`}
        >
          <span className="text-xl">🚪</span>
          {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;