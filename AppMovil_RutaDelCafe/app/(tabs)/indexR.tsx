import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface Route {
  id: number;
  name: string;
  description: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  rejectionComment?: string;
  image_url: string;
  createdBy: number;
  createdAt: string;
}

interface UserData {
  role: number;
  id: number;
  name: string;
  email: string;
}

// 🔧 FUNCIÓN MEJORADA - Normaliza URLs de imágenes (de tu versión)
const normalizeImageUrl = (url?: string | null) => {
  if (!url) return '';
  // Si ya es una URL completa, mantenerla
  if (url.startsWith('http')) return url;
  // Si es una ruta relativa, construir la URL completa
  if (url.startsWith('/uploads/')) return `${process.env.EXPO_PUBLIC_API_URL}${url}`;
  // Si viene con host local de desarrollo, convertir
  if (url.includes('192.168.') || url.includes('localhost')) {
    const match = url.match(/\/uploads\/.+$/);
    return match ? `${process.env.EXPO_PUBLIC_API_URL}${match[0]}` : url;
  }
  return url;
};

// Tipos de filtro (de la versión nueva)
type FilterType = 'todas' | 'mis-rutas' | 'aprobadas' | 'pendientes' | 'rechazadas';

function RoutesScreen() {
  const router = useRouter();
  const themed = useThemedStyles(); // 🎨 tema

  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<number>(0);
  const [userId, setUserId] = useState<number>(0);
  const [hasPendingRoutes, setHasPendingRoutes] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'success' as 'success' | 'error',
  });
  const [activeFilter, setActiveFilter] = useState<FilterType>('todas');

  useEffect(() => {
    loadUserData();
    fetchRoutes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [routes, userRole, userId, activeFilter]);

  // 🎯 FILTROS MEJORADOS (de la versión nueva)
  const applyFilters = () => {
    let filtered = [...routes];

    if (userRole === 2) {
      // Técnico: aplicar filtros específicos
      switch (activeFilter) {
        case 'mis-rutas':
          filtered = routes.filter(r => r.createdBy === userId);
          break;
        case 'aprobadas':
          filtered = routes.filter(r => r.status === 'aprobada');
          break;
        case 'pendientes':
          filtered = routes.filter(r => r.status === 'pendiente' && r.createdBy === userId);
          break;
        case 'rechazadas':
          filtered = routes.filter(r => r.status === 'rechazada' && r.createdBy === userId);
          break;
        case 'todas':
        default:
          // Todas las rutas (sus rutas + rutas aprobadas de otros)
          filtered = routes.filter(r => r.createdBy === userId || r.status === 'aprobada');
          break;
      }
      
      // Verificar si tiene rutas pendientes propias
      const userPendingRoutes = routes.filter(r => r.createdBy === userId && r.status === 'pendiente');
      setHasPendingRoutes(userPendingRoutes.length > 0);
    } else if (userRole === 3 || userRole === 0) {
      filtered = routes.filter(r => r.status === 'aprobada');
      setHasPendingRoutes(false);
    } else if (userRole === 1) {
      // Admin ve todas las rutas sin filtro
      setHasPendingRoutes(false);
    } else {
      filtered = routes.filter(r => r.status === 'aprobada');
      setHasPendingRoutes(false);
    }

    setFilteredRoutes(filtered);
  };

  // 🔐 MEJOR MANEJO DE SESIÓN (de tu versión)
  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);

      // 🔥 CRÍTICO: Si no hay token, forzar rol de visitante
      if (!token) {
        console.log('🔐 No hay token - Usuario es visitante');
        setUserRole(0);
        setUserId(0);
        return;
      }

      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        try {
          const user: UserData = JSON.parse(userData);
          console.log('👤 Usuario cargado:', { id: user.id, role: user.role });
          setUserRole(user.role || 3); // Default a usuario normal si no hay rol
          setUserId(user.id || 0);
        } catch (parseError) {
          console.error('❌ Error parseando userData:', parseError);
          // Si hay error al parsear, forzar visitante
          setUserRole(0);
          setUserId(0);
        }
      } else {
        console.log('📝 No hay userData - Usuario es visitante');
        setUserRole(0);
        setUserId(0);
      }
    } catch (error) {
      console.error('❌ Error en loadUserData:', error);
      // En caso de error, forzar visitante
      setUserRole(0);
      setUserId(0);
    }
  };

  // 📡 FETCH MEJORADO (combinado)
  const fetchRoutes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔐 Token inválido - Limpiando sesión');
          await AsyncStorage.multiRemove(['userToken', 'userData']);
          setUserToken(null);
          setUserRole(0); // 🔥 FORZAR VISITANTE
          setUserId(0);
        }
        throw new Error('Error al cargar las rutas');
      }

      const data = await response.json();
      setRoutes(data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las rutas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
  };

  const handleCreateRoute = () => {
    if (hasPendingRoutes) {
      Alert.alert(
        'Ruta Pendiente',
        'No puedes crear una nueva ruta hasta que el administrador apruebe tu ruta pendiente.',
        [{ text: 'Entendido', style: 'default' }],
      );
      return;
    }
    router.push('/Route/create');
  };

  // 🗑️ DELETE MEJORADO (combinado)
  const handleDelete = async (route: Route) => {
    // Solo permitir eliminar rutas propias (de la versión nueva)
    if (route.createdBy !== userId) {
      Alert.alert('Error', 'Solo puedes eliminar tus propias rutas');
      return;
    }
    
    setRouteToDelete(route);
    setModalConfig({
      title: 'Confirmar Eliminación',
      message: `¿Estás seguro de que quieres eliminar la ruta "${route.name}"? Esta acción no se puede deshacer.`,
      type: 'error',
    });
    setDeleteModalVisible(true);
  };

  const confirmDeleteRoute = async () => {
    if (!routeToDelete) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setModalConfig({
          title: 'Error',
          message: 'Sesión expirada. Por favor inicia sesión nuevamente.',
          type: 'error',
        });
        setDeleteModalVisible(true);
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${routeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setModalConfig({
          title: '¡Éxito!',
          message: 'Ruta eliminada correctamente',
          type: 'success',
        });
        setDeleteModalVisible(true);
        fetchRoutes(); // Recargar la lista
      } else if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setModalConfig({
          title: 'Sesión Expirada',
          message: 'Por favor inicia sesión nuevamente.',
          type: 'error',
        });
        setDeleteModalVisible(true);
      } else {
        throw new Error('Error al eliminar la ruta');
      }
    } catch {
      setModalConfig({
        title: 'Error',
        message: 'No se pudo eliminar la ruta',
        type: 'error',
      });
      setDeleteModalVisible(true);
    } finally {
      setRouteToDelete(null);
    }
  };

  // 🎨 ESTILOS DE ESTADO MEJORADOS (combinado)
  const statusStyles = (status: string) => {
    if (status === 'aprobada') {
      return {
        bg: themed.isDark ? '#052e1a' : '#d1fae5',
        border: themed.isDark ? '#10b981' : '#10b981',
        text: themed.isDark ? '#6ee7b7' : '#065f46',
      };
    }
    if (status === 'rechazada') {
      return {
        bg: themed.isDark ? '#2f0b0b' : '#fee2e2',
        border: themed.isDark ? '#ef4444' : '#ef4444',
        text: themed.isDark ? '#fecaca' : '#7f1d1d',
      };
    }
    // pendiente
    return {
      bg: themed.isDark ? '#341a05' : '#ffedd5',
      border: themed.isDark ? '#f59e0b' : '#f59e0b',
      text: themed.isDark ? '#fde68a' : '#7c2d12',
    };
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  };

  // 🎯 FUNCIONES DE FILTRO (de la versión nueva)
  const getFilterText = (filter: FilterType) => {
    switch (filter) {
      case 'todas': return 'Todas';
      case 'mis-rutas': return 'Mis Rutas';
      case 'aprobadas': return 'Aprobadas';
      case 'pendientes': return 'Pendientes';
      case 'rechazadas': return 'Rechazadas';
      default: return 'Todas';
    }
  };

  const isTechnician = userRole === 2;
  const isAdmin = userRole === 1;
  const isUser = userRole === 3;
  const isVisitor = userRole === 0;

  // Función para determinar si una ruta es del usuario actual (de la versión nueva)
  const isMyRoute = (route: Route) => route.createdBy === userId;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: themed.background,
        }}
      >
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ color: themed.accent, marginTop: 16 }}>Cargando rutas...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: themed.accent,
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>
          {isTechnician ? 'Todas las Rutas' : 'Rutas Disponibles'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4 }}>
          {isTechnician
            ? 'Tus rutas y rutas aprobadas de otros'
            : 'Descubre las mejores rutas gastronómicas'}
        </Text>
        {/* <Text style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4, fontSize: 12 }}>
          {isTechnician
            ? 'Rol: Técnico'
            : isAdmin
            ? 'Rol: Administrador'
            : isUser
            ? 'Rol: Usuario'
            : 'Rol: Visitante'}
          {userToken && ' • Con sesión'}
        </Text> */}
      </View>

      {/* 🎯 FILTROS PARA TÉCNICOS (de la versión nueva) */}
      {isTechnician && (
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <Text style={{ color: themed.text, fontWeight: '600', marginBottom: 8, fontSize: 16 }}>
            Filtrar por:
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['todas', 'mis-rutas', 'aprobadas', 'pendientes', 'rechazadas'] as FilterType[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: activeFilter === filter 
                      ? (themed.accent as string)
                      : (themed.isDark ? '#374151' : '#e5e7eb'),
                    borderWidth: 1,
                    borderColor: activeFilter === filter 
                      ? (themed.accent as string)
                      : (themed.isDark ? '#4b5563' : '#d1d5db'),
                  }}
                >
                  <Text style={{
                    color: activeFilter === filter ? '#fff' : themed.text,
                    fontSize: 14,
                    fontWeight: '600',
                  }}>
                    {getFilterText(filter)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          {/* Contador de resultados */}
          <Text style={{ color: themed.muted, fontSize: 12 }}>
            {filteredRoutes.length} {filteredRoutes.length === 1 ? 'ruta encontrada' : 'rutas encontradas'}
          </Text>
        </View>
      )}

      {/* Alerta de pendiente (técnico) */}
      {isTechnician && hasPendingRoutes && (
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            backgroundColor: themed.isDark ? '#3b2106' : '#fde68a',
            borderColor: themed.isDark ? '#f59e0b' : '#f59e0b',
            borderWidth: 1,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="information-circle" size={24} color={themed.accent as string} />
            <Text
              style={{
                color: themed.isDark ? '#fde68a' : '#9a3412',
                fontWeight: 'bold',
                marginLeft: 8,
                flex: 1,
              }}
            >
              Tienes rutas pendientes de aprobación
            </Text>
          </View>
          <Text style={{ color: themed.isDark ? '#fde68a' : '#9a3412', marginTop: 8, fontSize: 13 }}>
            No puedes crear nuevas rutas hasta que el administrador apruebe tus rutas pendientes.
          </Text>
        </View>
      )}

      {/* Botón crear (técnico) */}
      {isTechnician && (
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <TouchableOpacity
            onPress={handleCreateRoute}
            disabled={hasPendingRoutes}
            style={{
              paddingVertical: 16,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hasPendingRoutes ? (themed.isDark ? '#b45309' : '#fdba74') : (themed.accent as string),
              opacity: hasPendingRoutes ? 0.95 : 1,
              elevation: 3,
            }}
          >
            <Ionicons
              name="add-circle"
              size={24}
              color={hasPendingRoutes ? (themed.isDark ? '#1f1305' : '#7c2d12') : '#fff'}
            />
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 18,
                marginLeft: 8,
                color: hasPendingRoutes ? (themed.isDark ? '#1f1305' : '#7c2d12') : '#fff',
              }}
            >
              {hasPendingRoutes ? 'Creación Bloqueada' : 'Crear Nueva Ruta'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de rutas */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24, marginTop: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredRoutes.length === 0 ? (
          <View
            style={{
              backgroundColor: themed.card,
              borderColor: themed.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <Ionicons name="map-outline" size={64} color={themed.accent as string} />
            <Text
              style={{
                color: themed.text,
                fontSize: 18,
                fontWeight: 'bold',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              {isTechnician ? 'No hay rutas disponibles' : 'No hay rutas disponibles'}
            </Text>
            <Text style={{ color: themed.muted, textAlign: 'center', marginTop: 8 }}>
              {isTechnician
                ? `No se encontraron rutas con el filtro "${getFilterText(activeFilter)}"`
                : 'Pronto habrá nuevas rutas disponibles'}
            </Text>
            {isTechnician && activeFilter !== 'todas' && (
              <TouchableOpacity
                onPress={() => setActiveFilter('todas')}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: themed.accent as string,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  Ver todas las rutas
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredRoutes.map(route => {
            const pill = statusStyles(route.status);
            const isMyRouteItem = isMyRoute(route);
            
            return (
              <View
                key={route.id}
                style={{
                  backgroundColor: themed.isDark ? '#1b283f' : '#fff7ed',
                  borderColor: themed.isDark ? '#314264' : '#fdba74',
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOpacity: 0.1,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {route.image_url ? (
                  // 🔥 USAR normalizeImageUrl MEJORADA
                  <Image
                    source={{ uri: normalizeImageUrl(route.image_url) }}
                    style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: themed.text, fontWeight: 'bold', fontSize: 18 }}>
                      {route.name}
                    </Text>
                    {isTechnician && (
                      <Text style={{ color: themed.muted, fontSize: 12, marginTop: 2 }}>
                        {isMyRouteItem ? 'Mi ruta' : 'Ruta de otro usuario'}
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: pill.bg,
                      borderColor: pill.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: pill.text }}>
                      {getStatusText(route.status)}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: themed.muted, marginBottom: 12 }} numberOfLines={3}>
                  {route.description}
                </Text>

                {route.status === 'rechazada' && route.rejectionComment && isMyRouteItem && (
                  <View
                    style={{
                      backgroundColor: themed.isDark ? '#2f0b0b' : '#fef2f2',
                      borderColor: themed.isDark ? '#7f1d1d' : '#fecaca',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
                      <Text style={{ color: themed.text, fontWeight: 'bold', marginLeft: 8, flex: 1 }}>
                        Motivo del rechazo:
                      </Text>
                    </View>
                    <Text style={{ color: themed.isDark ? '#fecaca' : '#991b1b', marginTop: 6, fontSize: 13 }}>
                      {route.rejectionComment}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: themed.muted, fontSize: 12 }}>
                    {new Date(route.createdAt).toLocaleDateString()}
                  </Text>

                  {isTechnician ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {/* Botón "Ver Sitios" SOLO para rutas aprobadas */}
                      {route.status === 'aprobada' ? (
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: '/indexP',
                              params: { routeId: String(route.id), routeName: route.name },
                            })
                          }
                          style={{
                            backgroundColor: themed.isDark ? '#0b1220' : '#fff7ed',
                            borderColor: themed.accent as string,
                            borderWidth: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="locate-outline" size={18} color={themed.accent as string} />
                          <Text style={{ color: themed.accent, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>
                            Ver Sitios
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        // Estado bloqueado para pendiente/rechazada (solo mostrar para mis rutas)
                        isMyRouteItem && (
                          <View style={{
                            backgroundColor: themed.isDark ? '#2a2a2a' : '#f3f4f6',
                            borderColor: themed.isDark ? '#4b5563' : '#d1d5db',
                            borderWidth: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}>
                            <Ionicons 
                              name="lock-closed" 
                              size={16} 
                              color={themed.isDark ? '#9ca3af' : '#6b7280'} 
                            />
                            <Text style={{ 
                              color: themed.isDark ? '#9ca3af' : '#6b7280', 
                              fontWeight: '500', 
                              fontSize: 12, 
                              marginLeft: 6 
                            }}>
                              {route.status === 'pendiente' ? 'En revisión' : 'Ruta rechazada'}
                            </Text>
                          </View>
                        )
                      )}

                      {/* Botones de editar y eliminar SOLO para mis rutas (en cualquier estado) */}
                      {isMyRouteItem && (
                        <>
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: '/Route/edit',
                                params: { id: route.id.toString() },
                              })
                            }
                            style={{
                              backgroundColor: themed.isDark ? '#34240f' : '#fed7aa',
                              padding: 8,
                              borderRadius: 10,
                            }}
                          >
                            <Ionicons name="pencil" size={20} color={themed.accent as string} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDelete(route)}
                            style={{
                              backgroundColor: themed.isDark ? '#4a2e0b' : '#fdba74',
                              padding: 8,
                              borderRadius: 10,
                            }}
                          >
                            <Ionicons name="trash" size={20} color={themed.accent as string} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {/* Ver Sitios */}
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/indexP',
                            params: { routeId: String(route.id), routeName: route.name },
                          })
                        }
                        style={{
                          backgroundColor: themed.isDark ? '#0b1220' : '#fff7ed',
                          borderColor: themed.accent as string,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="locate-outline" size={18} color={themed.accent as string} />
                        <Text style={{ color: themed.accent, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>
                          Ver Sitios
                        </Text>
                      </TouchableOpacity>

                      {/* Ver Detalles */}
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/Route/details',
                            params: { id: route.id.toString() },
                          })
                        }
                        style={{
                          backgroundColor: themed.isDark ? '#34240f' : '#fed7aa',
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="eye" size={16} color={themed.accent as string} />
                        <Text style={{ color: themed.accent, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>
                          Ver Detalles
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Modal de Confirmación de Eliminación */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)'
          }}>
            <View style={{
              backgroundColor: themed.card,
              borderRadius: 20,
              padding: 24,
              margin: 20,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              minWidth: '80%'
            }}>
              {/* Icono */}
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: modalConfig.type === 'success' 
                  ? (themed.isDark ? '#059669' : '#10b981') 
                  : (themed.isDark ? '#dc2626' : '#ef4444'),
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <Ionicons 
                  name={modalConfig.type === 'success' ? "checkmark" : "alert-circle"} 
                  size={32} 
                  color="#fff" 
                />
              </View>

              {/* Título */}
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: themed.text,
                textAlign: 'center',
                marginBottom: 8
              }}>
                {modalConfig.title}
              </Text>

              {/* Mensaje */}
              <Text style={{
                fontSize: 16,
                color: themed.muted,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 22
              }}>
                {modalConfig.message}
              </Text>

              {/* Botones */}
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                {modalConfig.type === 'error' ? (
                  // Modal de confirmación (eliminar)
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        setDeleteModalVisible(false);
                        setRouteToDelete(null);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: themed.softBg,
                        borderWidth: 1,
                        borderColor: themed.border,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{
                        color: themed.text,
                        fontSize: 16,
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmDeleteRoute}
                      style={{
                        flex: 1,
                        backgroundColor: '#ef4444',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  // Modal de resultado (éxito/error)
                  <TouchableOpacity
                    onPress={() => setDeleteModalVisible(false)}
                    style={{
                      backgroundColor: modalConfig.type === 'success' 
                        ? (themed.accent as string)
                        : (themed.isDark ? '#dc2626' : '#ef4444'),
                      paddingHorizontal: 32,
                      paddingVertical: 12,
                      borderRadius: 12,
                      minWidth: 120
                    }}
                  >
                    <Text style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      {modalConfig.type === 'success' ? 'Continuar' : 'Entendido'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
        
      </ScrollView>
    </View>
  );
}

export default RoutesScreen;