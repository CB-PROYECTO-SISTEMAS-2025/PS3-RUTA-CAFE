import { withAuth } from "../../components/ui/withAuth";
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
    View
} from 'react-native';

interface Route {
  id: number;
  name: string;
  description: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
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
  const [userRole, setUserRole] = useState<number>(0);
  const [userId, setUserId] = useState<number>(0);

  useEffect(() => {
    loadUserData();
    fetchRoutes();
  }, []);

      useEffect(() => {
      // ✅ Filtrar según rol
      if (userRole === 3) {
        // Usuario: solo aprobadas (de cualquiera)
        setFilteredRoutes(routes.filter(r => r.status === 'aprobada'));
      } else if (userRole === 2) {
        // Técnico: SOLO las que él creó (cualquier estado)
        setFilteredRoutes(routes.filter(r => r.createdBy === userId));
      } else {
        // Otros roles (por si acaso)
        setFilteredRoutes(routes);
      }
    }, [routes, userRole, userId]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user: UserData = JSON.parse(userData);
        setUserRole(user.role || 3); // Default a rol 3 si no existe
        setUserId(user.id || 0);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserRole(3); // Default a rol 3 en caso de error
    }
  };

  const fetchRoutes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRoutes(data);
      } else {
        throw new Error('Error al cargar las rutas');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las rutas');
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Eliminar Ruta',
      '¿Estás seguro de que quieres eliminar esta ruta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Ruta eliminada correctamente');
                fetchRoutes();
              } else {
                throw new Error('Error al eliminar la ruta');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la ruta');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobada': return 'bg-green-100 border-green-500 text-green-700';
      case 'rechazada': return 'bg-red-100 border-red-500 text-red-700';
      default: return 'bg-orange-100 border-orange-500 text-orange-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprobada': return 'Aprobada';
      case 'rechazada': return 'Rechazada';
      default: return 'Pendiente';
    }
  };

  // Verificar si el usuario tiene permisos de administrador (rol 2)
  const isAdmin = userRole === 2;

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
      {/* Header */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">
          {isAdmin ? 'Gestión de Rutas' : 'Rutas Disponibles'}
        </Text>
        <Text className="text-orange-100 text-center mt-1">
          {isAdmin ? 'Gestiona todas las rutas gastronómicas' : 'Descubre las mejores rutas gastronómicas'}
        </Text>
        <Text className="text-orange-200 text-center mt-1 text-xs">
          {isAdmin ? 'Rol: Técnico' : 'Rol: Usuario'}
        </Text>
      </View>

      {/* Botón crear (solo para admin) */}
      {isAdmin && (
        <View className="px-6 mt-4">
          <TouchableOpacity
            onPress={() => router.push('/Route/create')}
            className="bg-orange-500 py-4 rounded-2xl shadow-lg flex-row items-center justify-center"
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">Crear Nueva Ruta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botón volver */}
      <View className="px-6 mt-4">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/advertisement"); // 👈 siempre vuelve al Home
            }
          }}
          className="bg-orange-100 border border-orange-400 py-3 rounded-xl shadow flex-row items-center justify-center mb-2"
          >
          <Ionicons name="arrow-back" size={22} color="#f97316" />
          <Text className="text-orange-700 font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>

      </View>

      {/* Lista de rutas */}
      <ScrollView
        className="flex-1 px-6 mt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRoutes.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center mt-8">
            <Ionicons name="map-outline" size={64} color="#f97316" />
            <Text className="text-orange-700 text-lg font-bold mt-4 text-center">
              {isAdmin ? 'No hay rutas creadas' : 'No hay rutas disponibles'}
            </Text>
            <Text className="text-orange-500 text-center mt-2">
              {isAdmin 
                ? '¡Comienza creando tu primera ruta gastronómica!' 
                : 'Pronto habrá nuevas rutas disponibles'
              }
            </Text>
          </View>
        ) : (
          filteredRoutes.map((route) => (
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
                <Text className="text-orange-900 font-bold text-lg flex-1">
                  {route.name}
                </Text>
                <View className={`px-3 py-1 rounded-full border ${getStatusColor(route.status)}`}>
                  <Text className="text-xs font-bold">
                    {getStatusText(route.status)}
                  </Text>
                </View>
              </View>

              <Text className="text-orange-700 mb-4" numberOfLines={3}>
                {route.description}
              </Text>

              <View className="flex-row justify-between items-center">
                <Text className="text-orange-500 text-sm">
                  {new Date(route.createdAt).toLocaleDateString()}
                </Text>

                {/* Acciones */}
                {isAdmin ? (
                  // ====== TÉCNICO (rol 2) ======
                  <View className="flex-row space-x-2 gap-2">
                    {/* Ver sitios */}
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

                    {/* Editar */}
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

                    {/* Eliminar */}
                    <TouchableOpacity
                      onPress={() => handleDelete(route.id)}
                      className="bg-orange-300 p-2 rounded-lg"
                    >
                      <Ionicons name="trash" size={20} color="#f97316" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  // ====== USUARIO (rol 3) ======
                  <View className="flex-row gap-2">
                    {/* Ver Sitios (SIEMPRE visible) */}
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

                    {/* Ver Detalles (igual que ya tenías) */}
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
export default withAuth(RoutesScreen);
