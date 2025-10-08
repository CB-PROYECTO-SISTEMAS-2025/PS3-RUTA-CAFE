import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Layout/Sidebar';
import Header from './Layout/Header';
import Dashboard from './Dashboard/Dashboard';
import UsersList from './Users/UsersList';
import Profile from './Profile/Profile';
import RoutesList from './Routes/RoutesList';
import PlacesManagement from './Places/PlacesManagement';
import AdvertisingList from './Advertising/AdvertisingList';

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
       return <PlacesManagement />;
       case 'advertising': 
       return <AdvertisingList />;
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