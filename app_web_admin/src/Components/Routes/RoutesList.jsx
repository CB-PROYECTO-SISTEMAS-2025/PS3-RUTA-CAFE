import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const RoutesList = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('admin-city');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [currentCityName, setCurrentCityName] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Modales globales
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });
  // Resuelve rutas relativas del backend a URL absolutas
  // ✅ Resolver robusto de imágenes
  const resolveImageUrl = (url) => {
    if (!url) return "";
    // Si ya es absoluta, úsala tal cual
    if (/^https?:\/\//i.test(url)) return url;
    // 1) Normaliza barras (por si MySQL guardó con backslashes en Windows)
    let pathOnly = url.replace(/^https?:\/\/[^/]+/i, "").replace(/\\/g, "/");
    // 2) Asegura que empiece con "/"
    if (!pathOnly.startsWith("/")) pathOnly = `/${pathOnly}`;
    // 3) Toma la base del API pero quita cualquier "/api" final
    const rawBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    const baseWithoutApi = rawBase.replace(/\/api(?:\/|$)/i, ""); // ← clave
    // Resultado final: http://host:puerto + /uploads/...
    return `${baseWithoutApi}${pathOnly}`;
  };

  // Modal para ver imagen en grande
  const [imageModal, setImageModal] = useState({ open: false, src: "", alt: "" });

  const openImageModal = (src, alt = "") =>
    setImageModal({ open: true, src, alt });

  const closeImageModal = () =>
    setImageModal({ open: false, src: "", alt: "" });

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeImageModal();
    if (imageModal.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageModal.open]);

  // Modal de confirmación genérico
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    onConfirm: null,
  });

  // Cargar ciudades
  const loadCities = async () => {
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/cities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.cities) setCities(data.cities);
    } catch (error) {
      console.error('Error cargando ciudades:', error);
      setErrorModal({ open: true, message: "Error al cargar ciudades" });
    }
  };

  // Cargar rutas
  const loadRoutes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      let url = '';
      if (filter === 'admin-city') {
        url = `${import.meta.env.VITE_API_URL}/routes/admin/city`;
      } else if (filter === 'all') {
        url = `${import.meta.env.VITE_API_URL}/routes/admin/pending`;
      } else if (filter === 'specific-city' && selectedCityId) {
        url = `${import.meta.env.VITE_API_URL}/routes/admin/city/${selectedCityId}`;
      } else {
        return;
      }

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const data = await response.json();
      if (data.routes) {
        setRoutes(data.routes);
        if (filter === 'admin-city') setCurrentCityName(data.adminCity?.name || 'tu ciudad');
        else if (filter === 'specific-city') setCurrentCityName(data.selectedCity?.name || 'ciudad seleccionada');
        else setCurrentCityName('todas las ciudades');
      }
    } catch (error) {
      console.error('❌ Error cargando rutas:', error);
      setErrorModal({ open: true, message: `Error al cargar rutas: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Aprobar ruta (sin confirm nativo; lo dispara el confirm modal)
  const approveRoute = async (routeId) => {
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/routes/admin/${routeId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'aprobada' })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessModal({ open: true, message: "✅ Ruta aprobada correctamente" });
        await loadRoutes();
      } else {
        setErrorModal({ open: true, message: data.message || "Error al aprobar ruta" });
      }
    } catch (error) {
      console.error('Error aprobando ruta:', error);
      setErrorModal({ open: true, message: "❌ Error al aprobar ruta" });
    }
  };

  // Rechazar ruta (se llama desde el modal de motivo)
  const rejectRoute = async (routeId, comment) => {
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/routes/admin/${routeId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rechazada', rejectionComment: comment })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessModal({ open: true, message: "✅ Ruta rechazada correctamente" });
        setShowRejectionModal(false);
        setRejectionComment('');
        setSelectedRoute(null);
        await loadRoutes();
      } else {
        setErrorModal({ open: true, message: data.message || "Error al rechazar ruta" });
      }
    } catch (error) {
      console.error('Error rechazando ruta:', error);
      setErrorModal({ open: true, message: "❌ Error al rechazar ruta" });
    }
  };

  // Abrir confirmación para aprobar
  const openConfirmApprove = (route) => {
    setSelectedRoute(route);
    setConfirmModal({
      open: true,
      title: "Aprobar ruta",
      message: `¿Estás seguro de aprobar la ruta "${route.name}"?`,
      confirmText: "Sí, aprobar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        await approveRoute(route.id);
      },
    });
  };

  // Abrir confirmación para rechazar (antes del modal de motivo)
  const openConfirmReject = (route) => {
    setSelectedRoute(route);
    setConfirmModal({
      open: true,
      title: "Rechazar ruta",
      message: `¿Estás seguro de rechazar la ruta "${route.name}"?`,
      confirmText: "Sí, rechazar",
      cancelText: "Cancelar",
      onConfirm: () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        setShowRejectionModal(true);
      },
    });
  };

  // Efectos
  useEffect(() => { loadCities(); }, []);
  useEffect(() => { loadRoutes(); }, [filter, selectedCityId]);

  // Filtros
  const handleFilterChange = (newFilter) => {
    if (newFilter !== 'specific-city') setSelectedCityId('');
    setFilter(newFilter);
  };
  const handleSpecificCityChange = (cityId) => {
    setSelectedCityId(cityId);
    if (cityId) setFilter('specific-city');
  };

  // Filtrado de rutas por búsqueda
  const filteredRoutes = routes.filter(route => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      route.name?.toLowerCase().includes(term) ||
      route.description?.toLowerCase().includes(term) ||
      route.creatorName?.toLowerCase().includes(term) ||
      route.creatorLastName?.toLowerCase().includes(term) ||
      route.cityName?.toLowerCase().includes(term)
    );
  });

  // Helpers UI
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
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  const getFilterIcon = () => {
    switch (filter) {
      case 'admin-city': return '👤';
      case 'all': return '🌎';
      case 'specific-city': return '🏙️';
      default: return '🗺️';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestión de Rutas Pendientes</h1>
            <div className="flex items-center space-x-3">
              <span className="text-lg text-gray-600">
                {getFilterIcon()} Mostrando rutas de <span className="font-semibold text-blue-600">{currentCityName}</span>
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                {routes.length} rutas pendientes
              </span>
            </div>
          </div>

          <button
            onClick={loadRoutes}
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
              placeholder="🔍 Buscar por nombre de ruta, descripción, creador o ciudad..."
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

      {/* Lista de Rutas */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Cargando rutas...</p>
            <p className="text-gray-500 text-sm mt-2">Espere un momento por favor</p>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm ? 'No se encontraron rutas' : 'No hay rutas pendientes'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? `No hay resultados para "${searchTerm}"`
                : 'No se encontraron rutas pendientes con el filtro actual'}
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
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ruta</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Creador</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ciudad</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha Creación</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="hover:bg-blue-50 transition-all duration-150 group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        {route.image_url && (
                          <img
                            src={resolveImageUrl(route.image_url)}
                            alt={route.name}
                            className="w-16 h-16 rounded-xl object-cover shadow-lg bg-gray-100
               cursor-zoom-in transition-transform duration-200 hover:scale-110"
                            onClick={() => openImageModal(resolveImageUrl(route.image_url), route.name)}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        )}



                        <div className="flex-1">
                          <div className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {route.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1 max-w-md">
                            {route.description}
                          </div>
                          {/* <div className="text-sm text-gray-500 font-mono mt-1">ID: {route.id}</div> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-base font-medium text-gray-900">
                        {route.creatorName} {route.creatorLastName}
                      </div>
                      {/* <div className="text-sm text-gray-500">ID: {route.createdBy}</div> */}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium border border-gray-200">
                        🏙️ {route.cityName || 'Sin ciudad'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full border-2 ${getStatusColor(route.status)}`}>
                        {route.status === 'pendiente' ? '⏳ Pendiente' :
                          route.status === 'aprobada' ? '✅ Aprobada' : '❌ Rechazada'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(route.createdAt)}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openConfirmApprove(route)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
                        >
                          <span>✅</span>
                          <span>Aprobar</span>
                        </button>
                        <button
                          onClick={() => openConfirmReject(route)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center space-x-2"
                        >
                          <span>❌</span>
                          <span>Rechazar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Rechazo (motivo) */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Rechazar Ruta</h3>
            <p className="text-gray-600 mb-2">
              ¿Estás seguro de que quieres rechazar la ruta "<span className="font-semibold">{selectedRoute?.name}</span>"?
            </p>
            <p className="text-sm text-gray-500 mb-4">Esta acción no se puede deshacer.</p>
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
                  setSelectedRoute(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => rejectRoute(selectedRoute.id, rejectionComment)}
                disabled={!rejectionComment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rechazar Ruta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {confirmModal.title || "Confirmar acción"}
              </h3>
              <p className="text-gray-600">{confirmModal.message}</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmModal((m) => ({ ...m, open: false, onConfirm: null }))}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  {confirmModal.cancelText || "Cancelar"}
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (typeof confirmModal.onConfirm === "function") {
                        await confirmModal.onConfirm();
                      }
                    } finally {
                      setConfirmModal((m) => ({ ...m, open: false, onConfirm: null }));
                    }
                  }}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                >
                  {confirmModal.confirmText || "Confirmar"}
                </button>
              </div>
            </div>
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
      {imageModal.open && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()} // evita cerrar si clicas dentro
          >
            <button
              onClick={closeImageModal}
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full shadow
                   w-9 h-9 flex items-center justify-center hover:bg-gray-100"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>

            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-black">
                <img
                  src={imageModal.src}
                  alt={imageModal.alt}
                  className="max-h-[80vh] w-full object-contain select-none"
                  draggable={false}
                />
              </div>
              <div className="p-3 text-sm text-gray-700 flex items-center justify-between">
                <span className="font-medium truncate pr-2">{imageModal.alt || "Vista previa"}</span>
                <a
                  href={imageModal.src}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                  title="Abrir en nueva pestaña"
                >
                  Abrir original ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer con Estadísticas */}
      {!loading && filteredRoutes.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-800">{filteredRoutes.length}</span> de{' '}
            <span className="font-semibold text-gray-800">{routes.length}</span> rutas pendientes
            {searchTerm && (
              <span> para "<span className="font-semibold text-blue-600">{searchTerm}</span>"</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesList;
