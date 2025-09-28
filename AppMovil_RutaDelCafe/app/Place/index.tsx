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

interface Place {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  route_id: number;
  route_name?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  website?: string;
  phoneNumber?: string;
  image_url?: string;
  createdBy: number;
  createdAt: string;
  modifiedAt?: string;
  modifiedBy?: number;
}

export default function PlacesScreen() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<number>(3);

  useEffect(() => {
    loadUserData();
    fetchPlaces();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role || 3);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchPlaces = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const placesData = await response.json();
        
        // Convertir latitude y longitude a números
        const processedPlaces = placesData.map((place: any) => ({
          ...place,
          latitude: typeof place.latitude === 'string' ? parseFloat(place.latitude) : place.latitude,
          longitude: typeof place.longitude === 'string' ? parseFloat(place.longitude) : place.longitude
        }));
        
        setPlaces(processedPlaces);
      } else {
        throw new Error('Error al cargar los lugares');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los lugares');
      console.error('Error fetching places:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaces();
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Eliminar Lugar',
      '¿Estás seguro de que quieres eliminar este lugar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
             const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Lugar eliminado correctamente');
                fetchPlaces();
              } else {
                throw new Error('Error al eliminar el lugar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el lugar');
            }
          },
        },
      ]
    );
  };

  // Función para formatear coordenadas de manera segura
  const formatCoordinate = (coord: any): string => {
    if (coord === null || coord === undefined) return 'N/A';
    
    const num = typeof coord === 'string' ? parseFloat(coord) : coord;
    return typeof num === 'number' && !isNaN(num) ? num.toFixed(4) : 'N/A';
  };

  // Función para obtener el color y texto del estado
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'aprobada':
        return { color: 'bg-green-100 border-green-500', text: 'text-green-700', label: 'Aprobado' };
      case 'pendiente':
        return { color: 'bg-yellow-100 border-yellow-500', text: 'text-yellow-700', label: 'Pendiente' };
      case 'rechazada':
        return { color: 'bg-red-100 border-red-500', text: 'text-red-700', label: 'Rechazado' };
      default:
        return { color: 'bg-gray-100 border-gray-500', text: 'text-gray-700', label: status };
    }
  };

  const isAdmin = userRole === 2;

  // Filtrar lugares según el rol del usuario
  const filteredPlaces = isAdmin 
    ? places // Admin ve todos los lugares
    : places.filter(place => place.status === 'aprobada'); // Usuarios normales solo ven aprobados

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">Cargando lugares...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      {/* Header */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">
          {isAdmin ? 'Gestión de Lugares' : 'Lugares Disponibles'}
        </Text>
        <Text className="text-orange-100 text-center mt-1">
          {isAdmin ? 'Gestiona todos los lugares' : 'Descubre los mejores lugares aprobados'}
        </Text>
      </View>

      {/* Botón crear (solo admin) */}
      {isAdmin && (
        <View className="px-6 mt-4">
          <TouchableOpacity
            onPress={() => router.push('/Place/create')}
            className="bg-orange-500 py-4 rounded-2xl shadow-lg flex-row items-center justify-center"
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">Crear Nuevo Lugar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botón volver */}
      <View className="px-6 mt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-orange-100 border border-orange-400 py-3 rounded-xl shadow flex-row items-center justify-center mb-2"
        >
          <Ionicons name="arrow-back" size={22} color="#f97316" />
          <Text className="text-orange-700 font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
      </View>

      {/* Contador de lugares */}
      <View className="px-6 mt-2">
        <Text className="text-orange-600 text-sm">
          {isAdmin 
            ? `Mostrando ${filteredPlaces.length} lugares (todos los estados)`
            : `Mostrando ${filteredPlaces.length} lugares aprobados`
          }
        </Text>
      </View>

      {/* Lista de lugares */}
      <ScrollView
        className="flex-1 px-6 mt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredPlaces.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center mt-8">
            <Ionicons name="location-outline" size={64} color="#f97316" />
            <Text className="text-orange-700 text-lg font-bold mt-4 text-center">
              {isAdmin ? 'No hay lugares registrados' : 'No hay lugares disponibles'}
            </Text>
            <Text className="text-orange-500 text-center mt-2">
              {isAdmin ? '¡Comienza creando tu primer lugar!' : 'Pronto habrá nuevos lugares aprobados'}
            </Text>
          </View>
        ) : (
          filteredPlaces.map((place) => {
            const statusInfo = getStatusInfo(place.status);
            
            return (
              <View key={place.id} className="bg-white rounded-2xl p-4 mb-4 shadow-md border border-orange-200">
                {place.image_url && (
                  <Image
                    source={{ uri: place.image_url }}
                    className="w-full h-40 rounded-xl mb-4"
                    resizeMode="cover"
                  />
                )}
                
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-orange-900 font-bold text-lg flex-1">
                    {place.name}
                  </Text>
                  <View className={`${statusInfo.color} px-3 py-1 rounded-full border ${statusInfo.text}`}>
                    <Text className={`${statusInfo.text} text-xs font-bold`}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                <Text className="text-orange-700 mb-2" numberOfLines={2}>
                  {place.description}
                </Text>

                <Text className="text-orange-500 text-sm mb-3">
                  Ruta: {place.route_name || 'Sin ruta'}
                </Text>

                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-orange-600 text-xs">
                      📍 {formatCoordinate(place.latitude)}, {formatCoordinate(place.longitude)}
                    </Text>
                    <Text className="text-orange-400 text-xs">
                      {new Date(place.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View className="flex-row space-x-2 gap-2">
                    <TouchableOpacity
                      onPress={() => router.push(`/Place/details?id=${place.id}`)}
                      className="bg-orange-100 p-2 rounded-lg"
                    >
                      <Ionicons name="eye" size={18} color="#f97316" />
                    </TouchableOpacity>
                    
                    {isAdmin && (
                      <>
                        <TouchableOpacity
                          onPress={() => router.push(`/Place/edit?id=${place.id}`)}
                          className="bg-orange-200 p-2 rounded-lg"
                        >
                          <Ionicons name="pencil" size={18} color="#ea580c" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          onPress={() => handleDelete(place.id)}
                          className="bg-red-100 p-2 rounded-lg"
                        >
                          <Ionicons name="trash" size={18} color="#dc2626" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}