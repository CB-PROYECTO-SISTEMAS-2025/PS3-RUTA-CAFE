import React from 'react';

const Profile = ({ user }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mi Perfil</h2>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-2xl">
        {user && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.fullName?.charAt(0) || user.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{user.fullName}</h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">Administrador</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Teléfono</label>
                <p className="text-gray-800">{user.phone || 'No especificado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Rol</label>
                <p className="text-gray-800">Administrador</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;