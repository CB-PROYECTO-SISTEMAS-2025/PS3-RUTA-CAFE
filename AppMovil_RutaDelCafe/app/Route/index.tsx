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

interface Route {
  id: number;
  name: string;
  description: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  rejectionComment?: string; // 👈 Nuevo campo añadido
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
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<number>(0); // 0 = visitante
  const [userId, setUserId] = useState<number>(0);
  const [hasPendingRoutes, setHasPendingRoutes] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  // 🔹 Al iniciar, carga usuario (si existe) y rutas
  useEffect(() => {
    loadUserData();
    fetchRoutes();
  }, []);

  // 🔹 Filtrado de rutas según rol y verificación de rutas pendientes
  useEffect(() => {
    if (userRole === 2) {
      // 🧑‍🔧 Técnico: solo sus rutas, cualquier estado
      const userRoutes = routes.filter(r => r.createdBy === userId);
      setFilteredRoutes(userRoutes);
      
      // Verificar si tiene rutas pendientes
      const pending = userRoutes.some(r => r.status === 'pendiente');
      setHasPendingRoutes(pending);
    } else if (userRole === 3 || userRole === 0) {
      // 👤 Usuario logueado o visitante: solo aprobadas
      setFilteredRoutes(routes.filter(r => r.status === 'aprobada'));
      setHasPendingRoutes(false);
    } else if (userRole === 1) {
      // 👑 Administrador: puede ver todas las rutas
      setFilteredRoutes(routes);
      setHasPendingRoutes(false);
    } else {
      // Rol desconocido: seguridad -> solo aprobadas
      setFilteredRoutes(routes.filter(r => r.status === 'aprobada'));
      setHasPendingRoutes(false);
    }
  }, [routes, userRole, userId]);

  // 🔹 Cargar datos del usuario (si hay sesión)
  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);
      
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user: UserData = JSON.parse(userData);
        setUserRole(user.role || 3);
        setUserId(user.id || 0);
        console.log("👤 Usuario cargado:", { role: user.role, id: user.id, name: user.name });
      } else {
        // 🌐 Visitante sin login
        setUserRole(0);
        setUserId(0);
        console.log("👤 Visitante sin sesión");
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserRole(0);
    }
  };

  // 🔹 Obtener rutas desde backend (ahora permite visitante)
  const fetchRoutes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`; // opcional

      console.log("🌍 Fetching routes with token:", !!token);
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        // Si hay error de autenticación, limpiar token inválido
        if (response.status === 401) {
          console.log("🔐 Token inválido, limpiando sesión...");
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          setUserToken(null);
          setUserRole(0);
        }
        throw new Error('Error al cargar las rutas');
      }
      
      const data = await response.json();
      setRoutes(data);
      console.log("✅ Rutas cargadas:", data.length);
    } catch (error) {
      console.error('Error fetching routes:', error);
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
        [{ text: 'Entendido', style: 'default' }]
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
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            });
            
            if (response.ok) {
              Alert.alert('Éxito', 'Ruta eliminada correctamente');
              fetchRoutes();
            } else if (response.status === 401) {
              // Token expirado
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobada':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'rechazada':
        return 'bg-red-100 border-red-500 text-red-700';
      default:
        return 'bg-orange-100 border-orange-500 text-orange-700';
    }
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

  // 🔹 CORREGIDO: Definir correctamente los roles
  const isTechnician = userRole === 2; // Técnico
  const isAdmin = userRole === 1; // Administrador
  const isUser = userRole === 3; // Usuario normal
  const isVisitor = userRole === 0; // Visitante

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">Cargando rutas...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      {/* 🔹 Header */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">
          {isTechnician ? 'Mis Rutas' : 'Rutas Disponibles'}
        </Text>
        <Text className="text-orange-100 text-center mt-1">
          {isTechnician
            ? 'Gestiona tus rutas gastronómicas'
            : 'Descubre las mejores rutas gastronómicas'}
        </Text>
        {/* 👇 Texto dinámico del rol */}
        <Text className="text-orange-200 text-center mt-1 text-xs">
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

      {/* 🔹 Alerta de ruta pendiente para técnicos */}
      {isTechnician && hasPendingRoutes && (
        <View className="mx-6 mt-4 bg-orange-200 border border-orange-400 rounded-xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={24} color="#ea580c" />
            <Text className="text-orange-800 font-bold ml-2 flex-1">
              Tienes rutas pendientes de aprobación
            </Text>
          </View>
          <Text className="text-orange-700 mt-2 text-sm">
            No puedes crear nuevas rutas hasta que el administrador apruebe tus rutas pendientes.
          </Text>
        </View>
      )}

      {/* 🔹 Botón crear (solo técnicos sin rutas pendientes) */}
      {isTechnician && (
        <View className="px-6 mt-4">
          <TouchableOpacity
            onPress={handleCreateRoute}
            className={`py-4 rounded-2xl shadow-lg flex-row items-center justify-center ${
              hasPendingRoutes ? 'bg-orange-300' : 'bg-orange-500'
            }`}
            disabled={hasPendingRoutes}
          >
            <Ionicons 
              name="add-circle" 
              size={24} 
              color={hasPendingRoutes ? "#9a3412" : "white"} 
            />
            <Text className={`font-bold text-lg ml-2 ${
              hasPendingRoutes ? 'text-orange-800' : 'text-white'
            }`}>
              {hasPendingRoutes ? 'Creación Bloqueada' : 'Crear Nueva Ruta'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔹 Botón volver */}
      <View className="px-6 mt-4">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/advertisement');
            }
          }}
          className="bg-orange-100 border border-orange-400 py-3 rounded-xl shadow flex-row items-center justify-center mb-2"
        >
          <Ionicons name="arrow-back" size={22} color="#f97316" />
          <Text className="text-orange-700 font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
      </View>

      {/* 🔹 Lista de rutas */}
      <ScrollView
        className="flex-1 px-6 mt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredRoutes.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center mt-8">
            <Ionicons name="map-outline" size={64} color="#f97316" />
            <Text className="text-orange-700 text-lg font-bold mt-4 text-center">
              {isTechnician ? 'No hay rutas creadas' : 'No hay rutas disponibles'}
            </Text>
            <Text className="text-orange-500 text-center mt-2">
              {isTechnician
                ? '¡Comienza creando tu primera ruta gastronómica!'
                : 'Pronto habrá nuevas rutas disponibles'}
            </Text>
          </View>
        ) : (
          filteredRoutes.map(route => (
            <View
              key={route.id}
              className="bg-orange-100 rounded-2xl p-4 mb-4 shadow-md border border-orange-300"
            >
              {route.image_url && (
                <Image
                  source={{ uri: route.image_url }}
                  className="w-full h-40 rounded-xl mb-4"
                  resizeMode="cover"
                />
              )}

              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-orange-900 font-bold text-lg flex-1">{route.name}</Text>
                <View
                  className={`px-3 py-1 rounded-full border ${getStatusColor(route.status)}`}
                >
                  <Text className="text-xs font-bold">{getStatusText(route.status)}</Text>
                </View>
              </View>

              <Text className="text-orange-700 mb-4" numberOfLines={3}>
                {route.description}
              </Text>

              {/* 🔹 MOSTRAR COMENTARIO DE RECHAZO SI EXISTE */}
              {route.status === 'rechazada' && route.rejectionComment && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <View className="flex-row items-start">
                    <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
                    <Text className="text-red-800 font-bold ml-2 flex-1">
                      Motivo del rechazo:
                    </Text>
                  </View>
                  <Text className="text-red-700 mt-1 text-sm">
                    {route.rejectionComment}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-center">
                <Text className="text-orange-500 text-sm">
                  {new Date(route.createdAt).toLocaleDateString()}
                </Text>

                {/* Acciones */}
                {isTechnician ? (
                  <View className="flex-row space-x-2 gap-2">
                    {/* Ver Sitios */}
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/Place',
                          params: { routeId: String(route.id), routeName: route.name },
                        })
                      }
                      className="bg-orange-100 px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <Ionicons name="locate-outline" size={18} color="#ea580c" />
                      <Text className="text-orange-700 font-semibold text-sm ml-1">Ver Sitios</Text>
                    </TouchableOpacity>

                    {/* Editar - Solo disponible para rutas pendientes o rechazadas */}
                    {(route.status === 'pendiente' || route.status === 'rechazada') && (
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/Route/edit',
                            params: { id: route.id.toString() },
                          })
                        }
                        className="bg-orange-200 p-2 rounded-lg"
                      >
                        <Ionicons name="pencil" size={20} color="#ea580c" />
                      </TouchableOpacity>
                    )}

                    {/* Eliminar - Solo disponible para rutas pendientes o rechazadas */}
                    {(route.status === 'pendiente' || route.status === 'rechazada') && (
                      <TouchableOpacity
                        onPress={() => handleDelete(route.id)}
                        className="bg-orange-300 p-2 rounded-lg"
                      >
                        <Ionicons name="trash" size={20} color="#f97316" />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View className="flex-row gap-2">
                    {/* Ver Sitios */}
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/Place',
                          params: { routeId: String(route.id), routeName: route.name },
                        })
                      }
                      className="bg-orange-100 px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <Ionicons name="locate-outline" size={18} color="#ea580c" />
                      <Text className="text-orange-700 font-semibold text-sm ml-1">Ver Sitios</Text>
                    </TouchableOpacity>

                    {/* Ver Detalles */}
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/Route/details',
                          params: { id: route.id.toString() },
                        })
                      }
                      className="bg-orange-200 px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <Ionicons name="eye" size={16} color="#ea580c" />
                      <Text className="text-orange-700 font-semibold text-sm ml-1">Ver Detalles</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default RoutesScreen;