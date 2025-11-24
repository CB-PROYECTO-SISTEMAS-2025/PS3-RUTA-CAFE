import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';


// Componente separado para el selector de roles
const RoleSelector = ({ userId, currentRole, isUpdating, onRoleChange, isCurrentUser }) => {
  const [selectedRole, setSelectedRole] = useState(currentRole?.toString() || '3');

  const handleChange = (e) => {
    const newRole = e.target.value;
    setSelectedRole(newRole);
    onRoleChange(userId, newRole);
  };

  const getRoleColor = (role) => {
    const colors = {
      1: 'border-red-200 bg-red-50 text-red-700',
      2: 'border-purple-200 bg-purple-50 text-purple-700',
      3: 'border-blue-200 bg-blue-50 text-blue-700'
    };
    return colors[role] || 'border-gray-200 bg-gray-50 text-gray-700';
  };

  return (
    <div className="relative">
      <select
        value={selectedRole}
        onChange={handleChange}
        disabled={isUpdating || isCurrentUser}
        className={`w-full border-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getRoleColor(currentRole)
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
      >
        <option value="1">👑 Administrador</option>
        <option value="2">🔧 Técnico</option>
        <option value="3">👤 Usuario Normal</option>
      </select>
      {isUpdating && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
      {isCurrentUser && (
        <div className="absolute -top-2 -right-2">
          <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold shadow-sm">TÚ</span>
        </div>
      )}
    </div>
  );
};

const UsersListEnhanced = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('admin-city');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [updatingRole, setUpdatingRole] = useState(null);
  const [currentCityName, setCurrentCityName] = useState('');

  // Modales de éxito y error
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Cargar ciudades
  const loadCities = async () => {
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/cities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await response.json();
      if (data.cities) setCities(data.cities);
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    }
  };

  // Cargar usuarios
  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

      let url = '';
      if (filter === 'admin-city') {
        url = `${import.meta.env.VITE_API_URL}/users/users`;
      } else if (filter === 'all') {
        url = `${import.meta.env.VITE_API_URL}/users/users/all`;
      } else if (filter === 'specific-city' && selectedCityId) {
        url = `${import.meta.env.VITE_API_URL}/users/users/${selectedCityId}`;
      } else {
        return;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
        // Actualizar nombre de ciudad actual
        if (filter === 'admin-city') {
          setCurrentCityName(data.adminCity?.name || 'tu ciudad');
        } else if (filter === 'specific-city') {
          setCurrentCityName(data.selectedCity?.name || 'ciudad seleccionada');
        } else {
          setCurrentCityName('todas las ciudades');
        }
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar rol
  const updateUserRole = async (userId, newRole) => {
    setUpdatingRole(userId);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newRole: parseInt(newRole) })
      });

      const data = await response.json();
      if (response.ok) {
        // Actualizar estado local
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: parseInt(newRole) } : u));
        setSuccessModal({ open: true, message: "✅ Rol actualizado correctamente" });
      } else {
        setErrorModal({ open: true, message: data.message || "Error al actualizar rol" });
      }
    } catch (error) {
      console.error('Error actualizando rol:', error);
      setErrorModal({ open: true, message: "❌ Error al actualizar rol" });
    } finally {
      setUpdatingRole(null);
    }
  };

  // Efectos
  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [filter, selectedCityId]);

  // Filtrado de usuarios
  const filteredUsers = users.filter(userItem => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      userItem.name?.toLowerCase().includes(term) ||
      userItem.lastName?.toLowerCase().includes(term) ||
      userItem.email?.toLowerCase().includes(term) ||
      userItem.phone?.toLowerCase().includes(term) ||
      userItem.cityName?.toLowerCase().includes(term)
    );
  });

  // Helper functions
  const getRoleText = (role) => {
    const roles = {
      1: 'Administrador',
      2: 'Técnico',
      3: 'Usuario Normal'
    };
    return roles[role] || 'Desconocido';
  };

  const getRoleColor = (role) => {
    const colors = {
      1: 'bg-red-100 text-red-800 border-red-200',
      2: 'bg-purple-100 text-purple-800 border-purple-200',
      3: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilterIcon = () => {
    switch (filter) {
      case 'admin-city': return '👤';
      case 'all': return '🌎';
      case 'specific-city': return '🏙️';
      default: return '👥';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Mejorado */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestión de Usuarios</h1>
            <div className="flex items-center space-x-3">
              <span className="text-lg text-gray-600">
                {getFilterIcon()} Mostrando usuarios de <span className="font-semibold text-blue-600">{currentCityName}</span>
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                {users.length} usuarios
              </span>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Cargando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar</span>
              </>
            )}
          </button>
        </div>

        {/* Filtros Mejorados */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">FILTRAR POR:</span>

            <button
              onClick={() => { setFilter('admin-city'); setSelectedCityId(''); }}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium ${filter === 'admin-city'
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
            >
              <span>👤</span>
              <span>Mi Ciudad</span>
            </button>

            <button
              onClick={() => { setFilter('all'); setSelectedCityId(''); }}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium ${filter === 'all'
                ? 'bg-green-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
            >
              <span>🌎</span>
              <span>Todas las Ciudades</span>
            </button>

            <div className="flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-700">🏙️ Ciudad específica:</span>
              <select
                value={selectedCityId}
                onChange={(e) => {
                  setSelectedCityId(e.target.value);
                  if (e.target.value) setFilter('specific-city');
                }}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium min-w-[200px]"
              >
                <option value="">Selecciona una ciudad</option>
                {cities.map(city => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Búsqueda Mejorada */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, apellido, email, teléfono o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg shadow-sm hover:shadow-md"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Mejorada */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Cargando usuarios...</p>
            <p className="text-gray-500 text-sm mt-2">Espere un momento por favor</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? `No hay resultados para "${searchTerm}"`
                : 'No se encontraron usuarios con el filtro actual'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Usuario</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contacto</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ciudad</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rol Actual</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cambiar Rol</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-blue-50 transition-all duration-150 group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-200 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 cursor-pointer"
                          onClick={() => {
                            if (userItem.photo) {
                              setSelectedImage(userItem.photo);
                              setImageModalOpen(true);
                            }
                          }}
                        >
                          {userItem.photo ? (
                            <img
                              src={userItem.photo}
                              alt={`${userItem.name} ${userItem.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-lg">
                              {userItem.name?.charAt(0)}{userItem.lastName?.charAt(0)}
                            </span>
                          )}
                        </div>



                        <div>
                          <div className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {userItem.name} {userItem.lastName}
                          </div>
                          {/* <div className="text-sm text-gray-500 font-mono">ID: {userItem.id}</div> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-base font-medium text-gray-900">{userItem.email}</div>
                      <div className="text-sm text-gray-600 flex items-center mt-1">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {userItem.phone || 'Sin teléfono'}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium border border-gray-200">
                        🏙️ {userItem.cityName || 'Sin ciudad'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full border-2 ${getRoleColor(userItem.role)}`}>
                        {getRoleText(userItem.role)}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="w-40">
                        <RoleSelector
                          userId={userItem.id}
                          currentRole={userItem.role}
                          isUpdating={updatingRole === userItem.id}
                          onRoleChange={updateUserRole}
                          isCurrentUser={userItem.id === user?.id}
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(userItem.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer con Estadísticas */}
      {!loading && filteredUsers.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-800">{filteredUsers.length}</span> de{' '}
            <span className="font-semibold text-gray-800">{users.length}</span> usuarios
            {searchTerm && (
              <span> para "<span className="font-semibold text-blue-600">{searchTerm}</span>"</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
              👑 Admin: {users.filter(u => u.role === 1).length}
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold border border-purple-200">
              🔧 Técnicos: {users.filter(u => u.role === 2).length}
            </span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
              👤 Usuarios: {users.filter(u => u.role === 3).length}
            </span>
          </div>
        </div>
      )}
      {/* Modal éxito */}
      {successModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">¡Operación exitosa!</h3>
              <p className="text-gray-600">{successModal.message}</p>
              <div className="mt-6">
                <button
                  onClick={() => setSuccessModal({ open: false, message: "" })}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal error */}
      {errorModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <span className="text-red-600 text-xl">✕</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Error</h3>
              <p className="text-gray-600">{errorModal.message}</p>
              <div className="mt-6">
                <button
                  onClick={() => setErrorModal({ open: false, message: "" })}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Imagen Ampliada */}
      {imageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setImageModalOpen(false)}>

          <div className="relative">
            {/* Botón de cerrar */}
            <button
              className="absolute -top-4 -right-4 bg-white rounded-full shadow-xl w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition"
              onClick={() => setImageModalOpen(false)}
            >
              ✕
            </button>

            {/* Imagen */}
            <img
              src={selectedImage}
              alt="Foto del usuario"
              className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersListEnhanced;