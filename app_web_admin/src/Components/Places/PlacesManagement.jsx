import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PlacesManagement = () => {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('admin-city');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [currentCityName, setCurrentCityName] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedPlaceForMap, setSelectedPlaceForMap] = useState(null);
  const [showSchedulesModal, setShowSchedulesModal] = useState(false);
  const [selectedPlaceForSchedules, setSelectedPlaceForSchedules] = useState(null);

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

  // Cargar lugares
  const loadPlaces = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

      let url = '';
      if (filter === 'admin-city') {
        url = `${import.meta.env.VITE_API_URL}/places/admin/city`;
      } else if (filter === 'all') {
        url = `${import.meta.env.VITE_API_URL}/places/admin/pending`;
      } else if (filter === 'specific-city' && selectedCityId) {
        url = `${import.meta.env.VITE_API_URL}/places/admin/city/${selectedCityId}`;
      } else {
        return;
      }

      console.log('📡 Cargando lugares desde:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Lugares recibidos:', data);

      if (data.places) {
        setPlaces(data.places);
        if (filter === 'admin-city') {
          setCurrentCityName(data.adminCity?.name || 'tu ciudad');
        } else if (filter === 'specific-city') {
          setCurrentCityName(data.selectedCity?.name || 'ciudad seleccionada');
        } else {
          setCurrentCityName('todas las ciudades');
        }
      }
    } catch (error) {
      console.error('❌ Error cargando lugares:', error);
      alert('Error al cargar lugares: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Aprobar lugar
  const approvePlace = async (placeId) => {
    if (!confirm('¿Estás seguro de que quieres aprobar este lugar?')) return;

    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/places/admin/${placeId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'aprobada' })
      });

      const data = await response.json();
      if (response.ok) {
        alert('✅ Lugar aprobado correctamente');
        loadPlaces();
      } else {
        alert(data.message || 'Error al aprobar lugar');
      }
    } catch (error) {
      console.error('Error aprobando lugar:', error);
      alert('❌ Error al aprobar lugar');
    }
  };

  // Rechazar lugar
  const rejectPlace = async (placeId, comment) => {
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/places/admin/${placeId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rechazada',
          rejectionComment: comment
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert('✅ Lugar rechazado correctamente');
        setShowRejectionModal(false);
        setRejectionComment('');
        setSelectedPlace(null);
        loadPlaces();
      } else {
        alert(data.message || 'Error al rechazar lugar');
      }
    } catch (error) {
      console.error('Error rechazando lugar:', error);
      alert('❌ Error al rechazar lugar');
    }
  };

  // Efectos
  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    console.log('🔄 Cambio de filtro:', filter, 'ciudad:', selectedCityId);
    loadPlaces();
  }, [filter, selectedCityId]);

  // Filtrado de lugares
  const filteredPlaces = places.filter(place => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      place.name?.toLowerCase().includes(term) ||
      place.description?.toLowerCase().includes(term) ||
      place.route_name?.toLowerCase().includes(term) ||
      place.creatorName?.toLowerCase().includes(term) ||
      place.cityName?.toLowerCase().includes(term)
    );
  });

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'aprobada': 'bg-green-100 text-green-800 border-green-200',
      'rechazada': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
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
      default: return '📍';
    }
  };

  const handleFilterChange = (newFilter) => {
    if (newFilter !== 'specific-city') {
      setSelectedCityId('');
    }
    setFilter(newFilter);
  };

  const handleSpecificCityChange = (cityId) => {
    setSelectedCityId(cityId);
    if (cityId) {
      setFilter('specific-city');
    }
  };

  // Función segura para formatear coordenadas
  const formatCoordinate = (coord) => {
    if (!coord) return '0.000000';
    const num = parseFloat(coord);
    return isNaN(num) ? '0.000000' : num.toFixed(6);
  };

  // Función para formatear horarios
  const formatSchedules = (schedules) => {
    if (!schedules || !Array.isArray(schedules)) return [];

    const daysOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

    return schedules
      .sort((a, b) => daysOrder.indexOf(a.dayOfWeek) - daysOrder.indexOf(b.dayOfWeek))
      .map(schedule => ({
        ...schedule,
        formatted: `${schedule.dayOfWeek.charAt(0).toUpperCase() + schedule.dayOfWeek.slice(1)}: ${schedule.openTime || 'Cerrado'} - ${schedule.closeTime || 'Cerrado'}`
      }));
  };

  // Función para ver mapa
  const handleViewMap = (place) => {
    setSelectedPlaceForMap(place);
    setShowMapModal(true);
  };

  // Función para ver horarios
  const handleViewSchedules = (place) => {
    setSelectedPlaceForSchedules(place);
    setShowSchedulesModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestión de Lugares Pendientes</h1>
            <div className="flex items-center space-x-3">
              <span className="text-lg text-gray-600">
                {getFilterIcon()} Mostrando lugares de <span className="font-semibold text-blue-600">{currentCityName}</span>
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                {places.length} lugares pendientes
              </span>
            </div>
          </div>

          <button
            onClick={loadPlaces}
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

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">FILTRAR POR:</span>

            <button
              onClick={() => handleFilterChange('admin-city')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium ${filter === 'admin-city'
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
            >
              <span>👤</span>
              <span>Mi Ciudad</span>
            </button>

            <button
              onClick={() => handleFilterChange('all')}
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
                onChange={(e) => handleSpecificCityChange(e.target.value)}
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

        {/* Búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, descripción, ruta, creador o ciudad..."
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

      {/* Grid de Lugares */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📍</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchTerm ? 'No se encontraron lugares' : 'No hay lugares pendientes'}
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? `No hay resultados para "${searchTerm}"`
              : 'No se encontraron lugares pendientes con el filtro actual'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlaces.map((place) => (
            <div key={place.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
              {/* Imagen */}
              {place.image_url && (
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={place.image_url}
                    alt={place.name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => {
                      setSelectedImage(place.image_url);
                      setShowImageModal(true);
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full border-2 ${getStatusColor(place.status)}`}>
                      {place.status === 'pendiente' ? '⏳ Pendiente' : '✅ Aprobada'}
                    </span>
                  </div>
                </div>
              )}

              {/* Contenido */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{place.name}</h3>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-3">{place.description}</p>

                {/* Información de la ruta */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <span>🗺️</span>
                    <span className="font-semibold">Ruta:</span>
                    <span>{place.route_name || 'Sin ruta asignada'}</span>
                  </div>
                </div>

                {/* Metadatos */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-5">👤</span>
                    <span>{place.creatorName} {place.creatorLastName}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-5">🏙️</span>
                    <span>{place.cityName || 'Sin ciudad'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-5">📅</span>
                    <span>{formatDate(place.createdAt)}</span>
                  </div>
                  {place.website && (
                    <div className="flex items-center text-sm text-blue-600">
                      <span className="w-5">🌐</span>
                      <a href={place.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {place.website}
                      </a>
                    </div>
                  )}
                  {place.phoneNumber && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-5">📞</span>
                      <span>{place.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {/* Botones de acción adicionales */}
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => handleViewMap(place)}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-1 text-sm"
                  >
                    <span>🗺️</span>
                    <span>Ver Mapa</span>
                  </button>
                  <button
                    onClick={() => handleViewSchedules(place)}
                    className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center space-x-1 text-sm"
                  >
                    <span>🕒</span>
                    <span>Horarios</span>
                  </button>
                </div>

                {/* Acciones principales */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => approvePlace(place.id)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Aprobar</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPlace(place);
                      setShowRejectionModal(true);
                    }}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <span>❌</span>
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Rechazo */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Rechazar Lugar</h3>
            <p className="text-gray-600 mb-2">
              ¿Estás seguro de que quieres rechazar el lugar "<span className="font-semibold">{selectedPlace?.name}</span>"?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer.
            </p>
            <textarea
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Ingresa el motivo del rechazo (obligatorio)..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionComment('');
                  setSelectedPlace(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => rejectPlace(selectedPlace.id, rejectionComment)}
                disabled={!rejectionComment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rechazar Lugar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagen */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Vista previa"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Modal de Mapa */}
      {showMapModal && selectedPlaceForMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                Ubicación: {selectedPlaceForMap.name}
              </h3>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="h-96 w-full">
              <MapContainer
                center={[parseFloat(selectedPlaceForMap.latitude), parseFloat(selectedPlaceForMap.longitude)]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker
                  position={[parseFloat(selectedPlaceForMap.latitude), parseFloat(selectedPlaceForMap.longitude)]}
                >
                  <Popup>
                    <div className="text-center">
                      <strong>{selectedPlaceForMap.name}</strong>
                      <br />
                      {selectedPlaceForMap.description}
                      <br />
                      <small>
                        {formatCoordinate(selectedPlaceForMap.latitude)}, {formatCoordinate(selectedPlaceForMap.longitude)}
                      </small>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-600 text-center">
                Coordenadas: {formatCoordinate(selectedPlaceForMap.latitude)}, {formatCoordinate(selectedPlaceForMap.longitude)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Horarios */}
      {showSchedulesModal && selectedPlaceForSchedules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                Horarios: {selectedPlaceForSchedules.name}
              </h3>
              <button
                onClick={() => setShowSchedulesModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {selectedPlaceForSchedules.schedules && selectedPlaceForSchedules.schedules.length > 0 ? (
                <div className="space-y-3">
                  {formatSchedules(selectedPlaceForSchedules.schedules).map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-800 capitalize">
                        {schedule.dayOfWeek}
                      </span>
                      <span className="text-gray-600">
                        {schedule.openTime && schedule.closeTime ? (
                          `${schedule.openTime} - ${schedule.closeTime}`
                        ) : (
                          <span className="text-red-500">Cerrado</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🕒</span>
                  </div>
                  <p className="text-gray-500">No hay horarios registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Footer con Estadísticas */}
      {!loading && filteredPlaces.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-800">{filteredPlaces.length}</span> de{' '}
            <span className="font-semibold text-gray-800">{places.length}</span> lugares pendientes
            {searchTerm && (
              <span> para "<span className="font-semibold text-blue-600">{searchTerm}</span>"</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacesManagement;