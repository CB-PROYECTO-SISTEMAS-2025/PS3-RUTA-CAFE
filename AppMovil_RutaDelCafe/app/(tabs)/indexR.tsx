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

// 🔧 AGREGAR ESTA FUNCIÓN - Normaliza URLs de imágenes
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

  useEffect(() => {
    loadUserData();
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (userRole === 2) {
      const userRoutes = routes.filter(r => r.createdBy === userId);
      setFilteredRoutes(userRoutes);
      const pending = userRoutes.some(r => r.status === 'pendiente');
      setHasPendingRoutes(pending);
    } else if (userRole === 3 || userRole === 0) {
      setFilteredRoutes(routes.filter(r => r.status === 'aprobada'));
      setHasPendingRoutes(false);
    } else if (userRole === 1) {
      setFilteredRoutes(routes);
      setHasPendingRoutes(false);
    } else {
      setFilteredRoutes(routes.filter(r => r.status === 'aprobada'));
      setHasPendingRoutes(false);
    }
  }, [routes, userRole, userId]);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);

      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user: UserData = JSON.parse(userData);
        setUserRole(user.role || 3);
        setUserId(user.id || 0);
      } else {
        setUserRole(0);
        setUserId(0);
      }
    } catch {
      setUserRole(0);
    }
  };

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
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          setUserToken(null);
          setUserRole(0);
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

  const handleDelete = async (route: Route) => {
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

// 🎨 estilos del estado (pill) en claro/oscuro - OCULTO para usuarios normales
const statusStyles = (status: string) => {
  // Si es usuario normal o invitado, no mostrar estado
  if (isUser || isVisitor) {
    return {
      bg: 'transparent',
      border: 'transparent',
      text: 'transparent',
    };
  }
  
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
  // Si es usuario normal o invitado, no mostrar texto de estado
  if (isUser || isVisitor) {
    return '';
  }
  
  switch (status) {
    case 'aprobada':
      return 'Aprobada';
    case 'rechazada':
      return 'Rechazada';
    default:
      return 'Pendiente';
  };
};

  const isTechnician = userRole === 2;
  const isAdmin = userRole === 1;
  const isUser = userRole === 3;
  const isVisitor = userRole === 0;

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
          {isTechnician ? 'Mis Rutas' : 'Rutas Disponibles'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4 }}>
          {isTechnician
            ? 'Gestiona tus rutas gastronómicas'
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
        style={{ flex: 1, paddingHorizontal: 24, marginTop: 24 }}
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
              {isTechnician ? 'No hay rutas creadas' : 'No hay rutas disponibles'}
            </Text>
            <Text style={{ color: themed.muted, textAlign: 'center', marginTop: 8 }}>
              {isTechnician
                ? '¡Comienza creando tu primera ruta gastronómica!'
                : 'Pronto habrá nuevas rutas disponibles'}
            </Text>
          </View>
        ) : (
          filteredRoutes.map(route => {
            const pill = statusStyles(route.status);
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
                  // 🔥 CAMBIO ESPECÍFICO AQUÍ - Usar normalizeImageUrl
                  <Image
                    source={{ uri: normalizeImageUrl(route.image_url) }}
                    style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <Text style={{ color: themed.text, fontWeight: 'bold', fontSize: 18, flex: 1 }}>
                    {route.name}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: pill.bg,
                      borderColor: pill.border,
                      display: (isUser || isVisitor) ? 'none' : 'flex',
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

                {route.status === 'rechazada' && route.rejectionComment ? (
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
                ) : null}

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
      // Estado bloqueado para pendiente/rechazada
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
    )}

    {/* Botones de editar y eliminar (mantener igual) */}
    {(route.status === 'pendiente' || route.status === 'rechazada') && (
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