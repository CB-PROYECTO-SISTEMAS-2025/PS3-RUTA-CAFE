import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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

  const handleDelete = async (id: number) => {
    Alert.alert('Eliminar Ruta', '¿Estás seguro de que quieres eliminar esta ruta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
              Alert.alert('Error', 'Sesión expirada. Por favor inicia sesión nuevamente.');
              return;
            }

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              Alert.alert('Éxito', 'Ruta eliminada correctamente');
              fetchRoutes();
            } else if (response.status === 401) {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              Alert.alert('Sesión expirada', 'Por favor inicia sesión nuevamente.');
            } else {
              throw new Error('Error al eliminar la ruta');
            }
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la ruta');
          }
        },
      },
    ]);
  };

  // 🎨 estilos del estado (pill) en claro/oscuro
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
        <Text style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4, fontSize: 12 }}>
          {isTechnician
            ? 'Rol: Técnico'
            : isAdmin
            ? 'Rol: Administrador'
            : isUser
            ? 'Rol: Usuario'
            : 'Rol: Visitante'}
          {userToken && ' • Con sesión'}
        </Text>
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

      {/* Botón volver */}
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/advertisement');
            }
          }}
          style={{
            backgroundColor: themed.isDark ? '#0b1220' : '#fff7ed',
            borderColor: themed.accent as string,
            borderWidth: 1,
            paddingVertical: 12,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={themed.accent as string} />
          <Text style={{ color: themed.accent, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
            Volver
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de rutas */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24, marginTop: 24 }}
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
                  <Image
                    source={{ uri: route.image_url }}
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
                      {/* Ver Sitios */}
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/Place',
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

                      {(route.status === 'pendiente' || route.status === 'rechazada') && (
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
                      )}

                      {(route.status === 'pendiente' || route.status === 'rechazada') && (
                        <TouchableOpacity
                          onPress={() => handleDelete(route.id)}
                          style={{
                            backgroundColor: themed.isDark ? '#4a2e0b' : '#fdba74',
                            padding: 8,
                            borderRadius: 10,
                          }}
                        >
                          <Ionicons name="trash" size={20} color={themed.accent as string} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {/* Ver Sitios */}
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/Place',
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
      </ScrollView>
    </View>
  );
}

export default RoutesScreen;
