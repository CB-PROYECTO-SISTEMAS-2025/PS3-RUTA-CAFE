// app/Route/details.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Share,
  Linking,
} from 'react-native';

interface Route {
  id: number;
  name: string;
  description: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  image_url: string;
  createdBy: number;
  createdAt: string;
  modifiedAt?: string;
  modifiedBy?: number;
}

export default function RouteDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<number>(0);

  useEffect(() => {
    if (id) {
      loadUserData();
      fetchRouteDetails();
    }
  }, [id]);

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

  const fetchRouteDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

     const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const routeData = await response.json();
        setRoute(routeData);
      } else if (response.status === 404) {
        Alert.alert('Error', 'Ruta no encontrada');
      } else {
        throw new Error('Error al cargar los detalles de la ruta');
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles de la ruta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!route) return;

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
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${route.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Ruta eliminada correctamente');
                router.back();
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

  const handleShare = async () => {
    if (!route) return;

    try {
      const shareMessage = `¡Descubre esta increíble ruta gastronómica! 🍽️\n\n**${route.name}**\n\n${route.description}\n\n¡Ven y disfruta de esta experiencia única! ☕`;

      const result = await Share.share({
        message: shareMessage,
        title: `Compartir: ${route.name}`,
        url: route.image_url && route.image_url !== '19' ? route.image_url : undefined,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Compartido con una app específica
          console.log('Compartido con:', result.activityType);
        } else {
          // Compartido exitosamente
          console.log('Compartido exitosamente');
        }
      } else if (result.action === Share.dismissedAction) {
        // El usuario canceló el compartir
        console.log('Compartir cancelado');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir la ruta');
      console.error('Error sharing:', error);
    }
  };

  const handleStartRoute = () => {
    if (!route) return;

    Alert.alert(
      'Comenzar Ruta',
      `¿Estás listo para comenzar la ruta "${route.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '¡Vamos!',
          onPress: () => {
            // Aquí podrías navegar a un mapa o vista de navegación
            Alert.alert(
              '¡Excelente!',
              'La ruta ha comenzado. ¡Disfruta tu experiencia gastronómica!',
              [
                {
                  text: 'Abrir en Maps',
                  onPress: () => {
                    // Abrir Google Maps con una ubicación genérica o específica
                    const mapsUrl = 'https://www.google.com/maps';
                    Linking.openURL(mapsUrl).catch(() => {
                      Alert.alert('Error', 'No se pudo abrir la aplicación de mapas');
                    });
                  }
                },
                { text: 'Continuar', style: 'default' }
              ]
            );
          },
        },
      ]
    );
  };

  const handleSaveToFavorites = async () => {
    if (!route) return;

    try {
      // Guardar en AsyncStorage
      const favoritesKey = 'userFavorites';
      const existingFavorites = await AsyncStorage.getItem(favoritesKey);
      let favorites = existingFavorites ? JSON.parse(existingFavorites) : [];

      // Verificar si ya está en favoritos
      const isAlreadyFavorite = favorites.some((fav: any) => fav.id === route.id);
      
      if (isAlreadyFavorite) {
        Alert.alert('Información', 'Esta ruta ya está en tus favoritos');
        return;
      }

      // Agregar a favoritos
      favorites.push({
        id: route.id,
        name: route.name,
        description: route.description,
        image_url: route.image_url,
        addedAt: new Date().toISOString()
      });

      await AsyncStorage.setItem(favoritesKey, JSON.stringify(favorites));
      
      Alert.alert('¡Éxito!', 'Ruta guardada en tus favoritos ❤️');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar en favoritos');
      console.error('Error saving favorite:', error);
    }
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
      default: return 'Pendiente de Aprobación';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprobada': return 'checkmark-circle';
      case 'rechazada': return 'close-circle';
      default: return 'time';
    }
  };

  const isAdmin = userRole === 2;

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">Cargando detalles...</Text>
      </View>
    );
  }

  if (!route) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <Ionicons name="alert-circle" size={64} color="#f97316" />
        <Text className="text-orange-700 text-lg font-bold mt-4">Ruta no encontrada</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-orange-500 px-6 py-3 rounded-xl mt-6"
        >
          <Text className="text-white font-semibold">Volver atrás</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      {/* Header con botón volver */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-bold text-center flex-1 mx-4">
            Detalles de la Ruta
          </Text>
          <View className="w-8" />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 mt-6">
        {/* Imagen de la ruta */}
        {route.image_url && route.image_url !== '19' ? (
          <Image
            source={{ uri: route.image_url }}
            className="w-full h-48 rounded-2xl mb-6"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-48 bg-orange-200 rounded-2xl mb-6 justify-center items-center">
            <Ionicons name="cafe-outline" size={64} color="#f97316" />
            <Text className="text-orange-700 mt-2">Imagen no disponible</Text>
          </View>
        )}

        {/* Tarjeta de información */}
        <View className="bg-white rounded-2xl p-6 shadow-md border border-orange-200">
          {/* Nombre y estado */}
          <View className="flex-row justify-between items-start mb-4">
            <Text className="text-orange-900 font-bold text-2xl flex-1 mr-4">
              {route.name}
            </Text>
            <View className={`px-4 py-2 rounded-full border flex-row items-center ${getStatusColor(route.status)}`}>
              <Ionicons 
                name={getStatusIcon(route.status)} 
                size={16} 
                color={route.status === 'aprobada' ? '#16a34a' : route.status === 'rechazada' ? '#dc2626' : '#ea580c'} 
              />
              <Text className="text-sm font-bold ml-2">
                {getStatusText(route.status)}
              </Text>
            </View>
          </View>

          {/* Descripción - Información fundamental para todos */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold text-lg mb-3">Sobre esta ruta</Text>
            <Text className="text-orange-700 text-base leading-6">
              {route.description}
            </Text>
          </View>

          {/* Información adicional - SOLO para administradores */}
          {isAdmin && (
            <View className="border-t border-orange-200 pt-4">
              <Text className="text-orange-800 font-semibold text-lg mb-3">Información Administrativa</Text>
              
              <View className="flex-row items-center mb-3">
                <Ionicons name="calendar" size={20} color="#f97316" />
                <Text className="text-orange-700 ml-3 flex-1">
                  <Text className="font-semibold">Fecha de creación:</Text>{' '}
                  {new Date(route.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>

              <View className="flex-row items-center mb-3">
                <Ionicons name="time" size={20} color="#f97316" />
                <Text className="text-orange-700 ml-3 flex-1">
                  <Text className="font-semibold">Hora de creación:</Text>{' '}
                  {new Date(route.createdAt).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>

              {route.modifiedAt && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="create" size={20} color="#f97316" />
                  <Text className="text-orange-700 ml-3 flex-1">
                    <Text className="font-semibold">Última modificación:</Text>{' '}
                    {new Date(route.modifiedAt).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center">
                <Ionicons name="id-card" size={20} color="#f97316" />
                <Text className="text-orange-700 ml-3">
                  <Text className="font-semibold">ID de la ruta:</Text> {route.id}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Botones de acción */}
        <View className="mt-6 mb-8">
          {isAdmin ? (
            // Botones para administrador
            <>
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: '/Route/edit',
                  params: { id: route.id.toString() }
                })}
                className="bg-orange-500 py-4 rounded-2xl shadow-lg flex-row items-center justify-center mb-3"
              >
                <Ionicons name="pencil" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Editar Ruta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                className="bg-red-500 py-4 rounded-2xl shadow-lg flex-row items-center justify-center mb-3"
              >
                <Ionicons name="trash" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Eliminar Ruta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-orange-100 border border-orange-400 py-4 rounded-2xl flex-row items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="#f97316" />
                <Text className="text-orange-700 font-semibold text-lg ml-2">Volver a Rutas</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Botones para usuario regular - CON FUNCIONALIDAD REAL
            <>
              <TouchableOpacity
                onPress={handleStartRoute}
                className="bg-orange-500 py-5 rounded-2xl shadow-lg flex-row items-center justify-center mb-4"
              >
                <Ionicons name="cafe" size={28} color="white" />
                <Text className="text-white font-bold text-xl ml-3">Comenzar Ruta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveToFavorites}
                className="bg-white border border-orange-400 py-4 rounded-2xl flex-row items-center justify-center mb-3"
              >
                <Ionicons name="bookmark" size={24} color="#f97316" />
                <Text className="text-orange-700 font-semibold text-lg ml-2">Guardar en Favoritos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                className="bg-orange-100 border border-orange-300 py-4 rounded-2xl flex-row items-center justify-center mb-3"
              >
                <Ionicons name="share-social" size={24} color="#f97316" />
                <Text className="text-orange-700 font-semibold text-lg ml-2">Compartir Ruta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-gray-100 border border-gray-300 py-3 rounded-xl flex-row items-center justify-center"
              >
                <Ionicons name="arrow-back" size={20} color="#6b7280" />
                <Text className="text-gray-600 font-medium text-base ml-2">Volver a Rutas</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}