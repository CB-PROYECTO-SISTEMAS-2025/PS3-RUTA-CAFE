import React from 'react';

const Header = ({ activeSection, user, isSidebarOpen, setIsSidebarOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Usuarios' },
    { id: 'routes', label: 'Rutas' },
    { id: 'places', label: 'Lugares' },
    { id: 'advertising', label: 'Publicidades' },
    { id: 'profile', label: 'Mi Perfil' },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            {isSidebarOpen ? '«' : '»'}
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Bienvenido, <span className="font-semibold">{user?.fullName}</span>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;