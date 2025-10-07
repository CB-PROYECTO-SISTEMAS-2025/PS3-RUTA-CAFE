// app/Place/details.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface Place {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  route_id: number;
  website?: string;
  phoneNumber?: string;
  image_url?: string;
  status: string;
  schedules?: Schedule[];
  is_favorite?: boolean;
  favorite_count?: number;
}

interface Schedule {
  id: number;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
}

const DAYS_OF_WEEK = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miércoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sábado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

export default function PlaceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<Place | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const placeId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;

  useEffect(() => {
    if (placeId) {
      fetchPlace();
    } else {
      Alert.alert('Error', 'ID del lugar no válido');
      router.back();
    }
  }, [placeId]);

 const fetchPlace = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const headers: any = { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // 👇 Token opcional para visitantes
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places/${placeId}`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const placeData = await response.json();
      
      // Solo verificar favoritos si hay token
      if (token) {
        const favoriteResponse = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/favorites/check/${placeId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (favoriteResponse.ok) {
          const favoriteData = await favoriteResponse.json();
          setPlace({
            ...placeData,
            is_favorite: favoriteData.data.is_favorite,
            favorite_count: favoriteData.data.favorite_count || 0
          });
          return;
        }
      }
      
      // Si no hay token o falla la verificación de favoritos
      setPlace(placeData);
    } else {
      throw new Error('Error al cargar el lugar');
    }
  } catch (error) {
    console.error('Error fetching place:', error);
    Alert.alert('Error', 'No se pudo cargar la información del lugar');
    safeGoBack();
  } finally {
    setLoading(false);
  }
};

  const toggleFavorite = async () => {
    if (!place) return;
    
    setFavoriteLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/favorites/toggle`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            place_id: place.id,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        // Actualizar estado local
        setPlace(prev => prev ? {
          ...prev,
          is_favorite: result.data.is_favorite,
          favorite_count: result.data.is_favorite 
            ? (prev.favorite_count || 0) + 1 
            : Math.max((prev.favorite_count || 1) - 1, 0)
        } : null);

        // Mostrar mensaje de éxito
        Alert.alert(
          'Éxito', 
          result.data.is_favorite 
            ? 'Lugar agregado a favoritos' 
            : 'Lugar eliminado de favoritos'
        );
      } else {
        throw new Error('Error al actualizar favoritos');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'No se pudo actualizar favoritos');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const safeGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/advertisement');
    }
  };

  const handleWebsitePress = () => {
    if (place?.website) {
      let url = place.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'No se pudo abrir el sitio web');
      });
    }
  };

  const handlePhonePress = () => {
    if (place?.phoneNumber) {
      const cleanNumber = place.phoneNumber.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${cleanNumber}`).catch(() => {
        Alert.alert('Error', 'No se pudo realizar la llamada');
      });
    }
  };

  const handleDirectionsPress = () => {
    if (place?.latitude && place?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'No se pudo abrir la aplicación de mapas');
      });
    }
  };

  // Función para formatear el horario para mostrar
  const getScheduleSummary = () => {
    if (!place?.schedules || place.schedules.length === 0) {
      return 'Horario no disponible';
    }

    const openDays = place.schedules;
    
    // Verificar si todos los días tienen el mismo horario
    const firstOpenDay = openDays[0];
    const allSameSchedule = openDays.every(day => 
      day.openTime.substring(0, 5) === firstOpenDay.openTime.substring(0, 5) && 
      day.closeTime.substring(0, 5) === firstOpenDay.closeTime.substring(0, 5)
    );
    
    if (openDays.length === 7 && allSameSchedule) {
      return `Lun-Dom: ${firstOpenDay.openTime.substring(0, 5)} - ${firstOpenDay.closeTime.substring(0, 5)}`;
    }
    
    return `${openDays.length} días con horario configurado`;
  };

  // Función para obtener el horario de un día específico
  const getDaySchedule = (dayKey: string) => {
    if (!place?.schedules) return null;
    return place.schedules.find(schedule => schedule.dayOfWeek === dayKey);
  };

  const getLeafletMapHTML = () => {
    if (!place?.latitude || !place?.longitude) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Map</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fed7aa; }
            .error { color: #ea580c; font-family: Arial; text-align: center; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h3>Ubicación no disponible</h3>
            <p>No hay coordenadas para mostrar el mapa</p>
          </div>
        </body>
        </html>
      `;
    }

    const escapedName = place.name
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/</g, '<')
      .replace(/>/g, '>');

    const escapedDescription = place.description
      .substring(0, 50)
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/</g, '<')
      .replace(/>/g, '>');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Map</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100%; }
          .custom-marker { 
            background: #ea580c; 
            border: 3px solid white; 
            border-radius: 50%; 
            width: 20px; 
            height: 20px; 
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.4);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          try {
            const map = L.map('map').setView([${place.latitude}, ${place.longitude}], 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            const orangeIcon = L.divIcon({
              className: 'custom-marker',
              html: '',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });

            L.marker([${place.latitude}, ${place.longitude}], {icon: orangeIcon})
              .addTo(map)
              .bindPopup('<b>${escapedName}</b><br>${escapedDescription}...')
              .openPopup();

            L.circle([${place.latitude}, ${place.longitude}], {
              color: '#ea580c',
              fillColor: '#fed7aa',
              fillOpacity: 0.2,
              radius: 100
            }).addTo(map);
          } catch (error) {
            document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #fed7aa; color: #ea580c; font-family: Arial; text-align: center; padding: 20px;"><h3>Error al cargar el mapa</h3></div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  const formatCoordinate = (coord: any): string => {
    if (coord === undefined || coord === null || coord === '') {
      return 'N/A';
    }

    const num = typeof coord === 'string' ? parseFloat(coord) : coord;

    if (isNaN(num)) {
      return 'N/A';
    }

    return num.toFixed(6);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#ea580c" />
        <Text className="text-orange-600 mt-4 font-semibold">Cargando información...</Text>
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <Ionicons name="alert-circle" size={64} color="#ea580c" />
        <Text className="text-orange-600 text-lg font-bold mt-4">Lugar no encontrado</Text>
        <TouchableOpacity 
          onPress={safeGoBack} 
          className="bg-orange-500 px-6 py-3 rounded-xl mt-6 shadow-lg"
        >
          <Text className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      {/* Header */}
      <View className="bg-orange-500 px-6 pt-8 pb-4 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-bold text-center flex-1">
            Detalles del Lugar
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Imagen principal con botón de favoritos */}
        <View className="px-6 mt-6 relative">
          <View className="rounded-3xl overflow-hidden shadow-xl border border-orange-200 bg-white">
            {place.image_url ? (
              <Image
                source={{ uri: place.image_url }}
                className="w-full h-60"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-60 bg-orange-100 justify-center items-center">
                <Ionicons name="image-outline" size={72} color="#ea580c" />
                <Text className="text-orange-600 mt-2 font-medium">Sin imagen disponible</Text>
              </View>
            )}
            
            {/* Botón de favoritos superpuesto */}
            <TouchableOpacity
              onPress={toggleFavorite}
              disabled={favoriteLoading}
              className="absolute top-4 right-4 bg-white/90 p-3 rounded-full shadow-lg"
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <Ionicons 
                  name={place.is_favorite ? "heart" : "heart-outline"} 
                  size={24} 
                  color={place.is_favorite ? "#ef4444" : "#ea580c"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Información esencial */}
        <View className="px-6 py-6">
          {/* Nombre, estado y contador de favoritos */}
          <View className="mb-6">
            <View className="flex-row justify-between items-start mb-3">
              <Text className="text-3xl font-bold text-orange-900 flex-1 pr-2">{place.name}</Text>
              
              {/* Contador de favoritos */}
              <View className="flex-row items-center bg-orange-100 px-3 py-1 rounded-full">
                <Ionicons name="heart" size={16} color="#ef4444" />
                <Text className="text-orange-700 font-semibold ml-1 text-sm">
                  {place.favorite_count || 0}
                </Text>
              </View>
            </View>
            
            <View className={`px-4 py-2 rounded-full self-start shadow-sm ${
              place.status === 'aprobada' ? 'bg-green-100 border border-green-300' : 
              place.status === 'pendiente' ? 'bg-yellow-100 border border-yellow-300' : 
              'bg-red-100 border border-red-300'
            }`}>
              <Text className={`text-sm font-bold ${
                place.status === 'aprobada' ? 'text-green-800' : 
                place.status === 'pendiente' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {place.status?.toUpperCase() || 'SIN ESTADO'}
              </Text>
            </View>
          </View>

          {/* Descripción */}
          <View className="mb-6 bg-white rounded-2xl p-4 shadow-sm border border-orange-200">
            <Text className="text-lg font-semibold text-orange-800 mb-2">Descripción</Text>
            <Text className="text-orange-700 leading-6">{place.description}</Text>
          </View>

          {/* Horario de atención */}
          <View className="mb-6 bg-white rounded-2xl p-4 shadow-sm border border-orange-200">
            <Text className="text-lg font-semibold text-orange-800 mb-3">Horario de Atención</Text>
            
            <View className="mb-3">
              <Text className="text-orange-700 font-medium">{getScheduleSummary()}</Text>
            </View>

            {place.schedules && place.schedules.length > 0 && (
              <View className="space-y-2">
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedule = getDaySchedule(day.key);
                  return (
                    <View key={day.key} className="flex-row justify-between items-center py-2 border-b border-orange-100">
                      <Text className="text-orange-700 font-medium flex-1">{day.label}</Text>
                      {daySchedule ? (
                        <Text className="text-green-600 font-semibold">
                          {daySchedule.openTime.substring(0, 5)} - {daySchedule.closeTime.substring(0, 5)}
                        </Text>
                      ) : (
                        <Text className="text-red-500 font-semibold">Cerrado</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Mapa Leaflet */}
          <View className="mb-6 bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-200">
            <View className="h-64">
              <WebView
                source={{ html: getLeafletMapHTML() }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View className="flex-1 justify-center items-center bg-orange-50">
                    <ActivityIndicator size="large" color="#ea580c" />
                    <Text className="text-orange-600 mt-2">Cargando mapa...</Text>
                  </View>
                )}
              />
            </View>
            <View className="p-3 bg-orange-50 border-t border-orange-200">
              <Text className="text-orange-700 text-sm text-center">
                Vista Estándar - Marcador en naranja muestra la ubicación exacta
              </Text>
            </View>
          </View>

          {/* Acciones rápidas */}
          <View className="flex-row justify-between mb-6">
            {place.website ? (
              <TouchableOpacity 
                onPress={handleWebsitePress}
                className="flex-1 bg-orange-100 mx-1 p-4 rounded-xl items-center border border-orange-300 shadow-sm"
              >
                <Ionicons name="globe-outline" size={24} color="#ea580c" />
                <Text className="text-orange-700 font-semibold mt-2 text-center">Sitio Web</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-1 mx-1 opacity-0">
                <TouchableOpacity disabled className="p-4">
                  <Ionicons name="globe-outline" size={24} color="transparent" />
                </TouchableOpacity>
              </View>
            )}

            {place.phoneNumber ? (
              <TouchableOpacity 
                onPress={handlePhonePress}
                className="flex-1 bg-orange-100 mx-1 p-4 rounded-xl items-center border border-orange-300 shadow-sm"
              >
                <Ionicons name="call-outline" size={24} color="#ea580c" />
                <Text className="text-orange-700 font-semibold mt-2 text-center">Llamar</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-1 mx-1 opacity-0">
                <TouchableOpacity disabled className="p-4">
                  <Ionicons name="call-outline" size={24} color="transparent" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              onPress={handleDirectionsPress}
              className="flex-1 bg-orange-100 mx-1 p-4 rounded-xl items-center border border-orange-300 shadow-sm"
            >
              <Ionicons name="navigate-outline" size={24} color="#ea580c" />
              <Text className="text-orange-700 font-semibold mt-2 text-center">Cómo llegar</Text>
            </TouchableOpacity>
          </View>

          {/* Información de ubicación */}
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-orange-200">
            <Text className="text-lg font-semibold text-orange-800 mb-3">Coordenadas GPS</Text>
            <View className="flex-row items-center bg-orange-50 rounded-xl p-3">
              <Ionicons name="location-outline" size={24} color="#ea580c" />
              <View className="ml-3">
                <Text className="text-orange-700 font-medium">Latitud: {formatCoordinate(place.latitude)}</Text>
                <Text className="text-orange-700 font-medium">Longitud: {formatCoordinate(place.longitude)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={safeGoBack}
            className="flex-row items-center justify-center bg-orange-500 px-6 py-3 rounded-xl mt-3 shadow-lg"
          >
            <Ionicons name="arrow-back" size={20} color="white" className="mr-2" />
            <Text className="text-white text-center font-bold text-lg">Volver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}