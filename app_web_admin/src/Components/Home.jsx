import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Layout/Sidebar';
import Header from './Layout/Header';
import Dashboard from './Dashboard/Dashboard';
import UsersList from './Users/UsersList';
import Profile from './Profile/Profile';
import RoutesList from './Routes/RoutesList';

const Home = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UsersList />;
      case 'profile':
        return <Profile user={user} />;
      case 'routes':
        return <RoutesList />;
      case 'places':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Lugares</h2>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <p className="text-gray-600">Aquí irá la gestión de lugares...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        user={user}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onLogout={logout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          activeSection={activeSection}
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Home;