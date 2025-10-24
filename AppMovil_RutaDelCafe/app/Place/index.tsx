// app/Place/index.tsx
import { requireAuth } from '../utils/requireAuth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

interface Schedule {
  id: number;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
}

interface Place {
  id: number;
  name: string;
  description: string;
  latitude: number | string;
  longitude: number | string;
  route_id: number;
  route_name?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  rejectionComment?: string;
  website?: string;
  phoneNumber?: string;
  image_url?: string;
  createdAt: string;
  createdBy?: number;
  schedules?: Schedule[];
  likes_count?: number;
  user_liked?: boolean;
  comments_count?: number;
}

interface UserData {
  role: number;
  id: number;
}

const getScheduleSummary = (schedules: Schedule[]) => {
  if (!schedules || schedules.length === 0) {
    return 'Horario no disponible';
  }

  const openDays = schedules;
  const firstOpenDay = openDays[0];
  const allSameSchedule = openDays.every(day => 
    day.openTime.substring(0, 5) === firstOpenDay.openTime.substring(0, 5) && 
    day.closeTime.substring(0, 5) === firstOpenDay.closeTime.substring(0, 5)
  );
  
  if (openDays.length === 7 && allSameSchedule) {
    return `Lun-Dom: ${firstOpenDay.openTime.substring(0, 5)} - ${firstOpenDay.closeTime.substring(0, 5)}`;
  }
  
  return `${openDays.length} días con horario`;
};

const formatDayName = (dayOfWeek: string) => {
  const days: { [key: string]: string } = {
    'monday': 'Lunes',
    'tuesday': 'Martes',
    'wednesday': 'Miércoles',
    'thursday': 'Jueves',
    'friday': 'Viernes',
    'saturday': 'Sábado',
    'sunday': 'Domingo'
  };
  return days[dayOfWeek.toLowerCase()] || dayOfWeek;
};

const formatTime = (time: string) => {
  return time.substring(0, 5);
};

const getFullSchedule = (schedules: Schedule[]) => {
  if (!schedules || schedules.length === 0) {
    return null;
  }

  return schedules.map(schedule => (
    <View key={schedule.id} className="flex-row justify-between py-1">
      <Text className="text-orange-700 text-sm font-medium">
        {formatDayName(schedule.dayOfWeek)}
      </Text>
      <Text className="text-orange-600 text-sm">
        {formatTime(schedule.openTime)} - {formatTime(schedule.closeTime)}
      </Text>
    </View>
  ));
};

export default function PlacesMapScreen() {
  const router = useRouter();
  const { routeId, routeName } = useLocalSearchParams<{ routeId?: string; routeName?: string }>();
  const numericRouteId = useMemo(() => (routeId ? Number(routeId) : undefined), [routeId]);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<number>(0);
  const [userId, setUserId] = useState<number>(0);
  const [mapKey, setMapKey] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const isAdmin = userRole === 2;
  const isUser = userRole === 3;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [numericRouteId]);

  useEffect(() => {
    if (places.length > 0) {
      setMapKey(prev => prev + 1);
    }
  }, [places]);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user: UserData = JSON.parse(userData);
        setUserRole(user.role || 3);
        setUserId(user.id || 0);
      } else {
        setUserRole(0);
        setUserId(0);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserRole(0);
    }
  };

  const fetchPlaces = async () => {
    setLoading(true);
    setMapLoaded(false);
    setMapError(false);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let url = `${process.env.EXPO_PUBLIC_API_URL}/api/places`;
      if (numericRouteId) {
        url = `${process.env.EXPO_PUBLIC_API_URL}/api/places/route/${numericRouteId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const normalized = data
        .map((p: any) => ({
          ...p,
          latitude: typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude,
          longitude: typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude,
        }))
        .filter(
          (p: any) =>
            typeof p.latitude === 'number' &&
            typeof p.longitude === 'number' &&
            !isNaN(p.latitude) &&
            !isNaN(p.longitude)
        );

      setPlaces(normalized);
    } catch (error) {
      console.error('❌ Error cargando lugares:', error);
      Alert.alert('Error', 'No se pudieron cargar los lugares: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setMapLoaded(false);
    setMapError(false);
    fetchPlaces();
  };

  // 🔹 FUNCIÓN PARA VERIFICAR SI EL USUARIO TIENE LUGARES PENDIENTES
  const userHasPendingPlaces = useMemo(() => {
    if (!isAdmin) return false;
    return places.some(place => place.createdBy === userId && place.status === 'pendiente');
  }, [places, userId, isAdmin]);

  const handleCreatePlace = () => {
    if (userHasPendingPlaces) {
      Alert.alert(
        'Lugares Pendientes', 
        'No puedes crear un nuevo lugar hasta que el administrador apruebe tus lugares pendientes.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }
    router.push({
      pathname: '/Place/create',
      params: numericRouteId
        ? { routeId: String(numericRouteId), routeName: routeName }
        : undefined,
    });
  };

  const deletePlace = async (placeId: number) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este lugar? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/places/${placeId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Éxito', 'Lugar eliminado correctamente');
                fetchPlaces();
              } else {
                throw new Error('Error al eliminar el lugar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el lugar');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const toggleLike = async (placeId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/likes/${placeId}/toggle`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setPlaces(prevPlaces =>
          prevPlaces.map(place => {
            if (place.id === placeId) {
              const newLiked = !place.user_liked;
              const newLikesCount = (place.likes_count || 0) + (newLiked ? 1 : -1);
              return {
                ...place,
                user_liked: newLiked,
                likes_count: newLikesCount,
              };
            }
            return place;
          })
        );

        if (selectedPlace && selectedPlace.id === placeId) {
          setSelectedPlace(prev => prev ? {
            ...prev,
            user_liked: !prev.user_liked,
            likes_count: (prev.likes_count || 0) + (prev.user_liked ? -1 : 1),
          } : null);
        }
      } else {
        throw new Error('Error al actualizar el like');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el like');
      console.error(error);
    }
  };

  const visiblePlaces = useMemo(() => {
    if (isAdmin) {
      return places.filter(p => p.createdBy === userId);
    } else {
      return places.filter(p => p.status === 'aprobada');
    }
  }, [isAdmin, places, userId]);

  const resolvedRouteName =
    routeName ||
    (visiblePlaces.length > 0 ? visiblePlaces[0].route_name : undefined) ||
    (numericRouteId ? `Ruta #${numericRouteId}` : undefined);

  const getMapHtml = () => {
    const placesData = visiblePlaces.map(p => ({
      id: p.id,
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
      desc: (p.description || '').slice(0, 80),
    }));

    let centerLat = -17.3939;
    let centerLng = -66.1568;
    let initialZoom = 12;

    if (placesData.length === 1) {
      centerLat = placesData[0].lat as number;
      centerLng = placesData[0].lng as number;
      initialZoom = 16;
    } else if (placesData.length > 1) {
      const avgLat = placesData.reduce((sum, p) => sum + (p.lat as number), 0) / placesData.length;
      const avgLng = placesData.reduce((sum, p) => sum + (p.lng as number), 0) / placesData.length;
      centerLat = avgLat;
      centerLng = avgLng;
      initialZoom = 14;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body, #map {
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          .coffee-pin {
            background: white;
            border-radius: 50%;
            border: 2px solid #ea580c;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(234,88,12,0.35);
            font-size: 18px;
          }
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 1000;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="loading" class="loading">Cargando mapa...</div>
        
        <script>
          let map;
          let markers = [];
          
          function initMap() {
            try {
              document.getElementById('loading').style.display = 'none';
              
              map = L.map('map').setView([${centerLat}, ${centerLng}], ${initialZoom});
              
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
              }).addTo(map);
              
              const coffeeIcon = L.divIcon({
                className: 'coffee-pin',
                html: '☕',
                iconSize: [34, 34],
                iconAnchor: [17, 17]
              });
              
              ${placesData.length > 0 ? `
                const places = ${JSON.stringify(placesData)};
                
                places.forEach(place => {
                  const marker = L.marker([place.lat, place.lng], { 
                    icon: coffeeIcon 
                  }).addTo(map);
                  
                  marker.bindPopup(
                    '<div style="padding: 8px; min-width: 200px;">' +
                    '<strong>' + place.name + '</strong><br/>' +
                    '<span style="color: #666; font-size: 12px;">' + (place.desc || '') + '</span>' +
                    '</div>'
                  );
                  
                  marker.on('click', function() {
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(place.id.toString());
                    }
                  });
                  
                  markers.push(marker);
                });
                
                if (places.length > 1) {
                  const group = new L.featureGroup(markers);
                  map.fitBounds(group.getBounds().pad(0.1));
                }
              ` : ''}
              
              setTimeout(() => {
                map.invalidateSize();
              }, 100);
              
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('MAP_LOADED');
              }
              
            } catch (error) {
              console.error('Error loading map:', error);
              document.getElementById('loading').innerHTML = 'Error al cargar el mapa';
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('MAP_ERROR:' + error.message);
              }
            }
          }
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
          } else {
            initMap();
          }
          
          window.resizeMap = function() {
            if (map) {
              setTimeout(() => {
                map.invalidateSize();
              }, 100);
            }
          };
        </script>
      </body>
      </html>
    `;
  };

  const onMarkerMessage = (e: any) => {
    const data = e?.nativeEvent?.data;
    
    if (data === 'MAP_LOADED') {
      setMapLoaded(true);
      setMapError(false);
      return;
    }
    
    if (data && data.startsWith('MAP_ERROR:')) {
      const errorMessage = data.replace('MAP_ERROR:', '');
      console.error('Map loading error:', errorMessage);
      setMapError(true);
      setMapLoaded(false);
      return;
    }
    
    const idStr = data;
    const id = idStr ? Number(idStr) : NaN;
    if (!isNaN(id)) {
      const found = visiblePlaces.find(p => p.id === id);
      if (found) {
        setSelectedPlace(found);
        setInfoOpen(true);
      }
    }
  };

  const onWebViewLoad = () => {
    setTimeout(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof window.resizeMap === 'function') {
            window.resizeMap();
          }
          true;
        `);
      }
    }, 500);
  };

  const reloadMap = () => {
    setMapKey(prev => prev + 1);
    setMapLoaded(false);
    setMapError(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobada':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rechazada':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprobada':
        return 'Aprobado';
      case 'pendiente':
        return 'Pendiente';
      case 'rechazada':
        return 'Rechazado';
      default:
        return status;
    }
  };

  // 🔹 FUNCIÓN PARA MANEJAR BOTONES BLOQUEADOS
  const handleBlockedAction = (place: Place, actionName: string) => {
    if (place.status === 'rechazada') {
      Alert.alert(
        'Acción Bloqueada',
        `No puedes ${actionName} un lugar que ha sido rechazado. Revisa el motivo del rechazo y contacta al administrador si necesitas más información.`,
        [{ text: 'Entendido', style: 'default' }]
      );
      return true;
    }
    return false;
  };

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
          {numericRouteId ? 'Sitios de la Ruta' : 'Mapa de Sitios'}
        </Text>
        {resolvedRouteName && (
          <Text className="text-orange-100 text-center mt-1">{resolvedRouteName}</Text>
        )}
        <Text className="text-orange-200 text-center mt-1 text-xs">
          {isAdmin
            ? 'Mostrando tus sitios (aprobados y pendientes)'
            : 'Mostrando sitios aprobados en el mapa'}
        </Text>
      </View>

      {/* Alerta de lugares pendientes para técnicos */}
      {isAdmin && userHasPendingPlaces && (
        <View className="mx-6 mt-4 bg-orange-200 border border-orange-400 rounded-xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={24} color="#ea580c" />
            <Text className="text-orange-800 font-bold ml-2 flex-1">
              Tienes lugares pendientes de aprobación
            </Text>
          </View>
          <Text className="text-orange-700 mt-2 text-sm">
            No puedes crear nuevos lugares hasta que el administrador apruebe tus lugares pendientes.
          </Text>
        </View>
      )}

      {/* Acciones superiores */}
      <View className="px-6 mt-4">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/advertisement');
          }}
          className="bg-orange-100 border border-orange-400 py-3 rounded-xl shadow flex-row items-center justify-center mb-3"
        >
          <Ionicons name="arrow-back" size={22} color="#f97316" />
          <Text className="text-orange-700 font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>

        <View className="flex-row gap-2">
          {/* 🔹 BOTÓN DE CREAR - SOLO SE MUESTRA SI NO HAY LUGARES PENDIENTES */}
          {isAdmin && !userHasPendingPlaces && (
            <TouchableOpacity
              onPress={handleCreatePlace}
              className="flex-1 bg-orange-500 py-4 rounded-2xl shadow-lg flex-row items-center justify-center"
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-2">Crear Lugar</Text>
            </TouchableOpacity>
          )}

          {/* 🔹 BOTÓN BLOQUEADO - SE MUESTRA CUANDO HAY LUGARES PENDIENTES */}
          {isAdmin && userHasPendingPlaces && (
            <TouchableOpacity
              className="flex-1 bg-orange-300 py-4 rounded-2xl shadow-lg flex-row items-center justify-center"
              disabled={true}
            >
              <Ionicons name="add-circle" size={24} color="#9a3412" />
              <Text className="text-orange-800 font-bold text-lg ml-2">Creación Bloqueada</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mapa */}
      <View className="flex-1 mt-4 mx-6 rounded-2xl overflow-hidden border border-orange-200 shadow relative">
        {!mapLoaded && !mapError && (
          <View className="absolute inset-0 bg-orange-50 justify-center items-center z-10">
            <ActivityIndicator size="large" color="#ea580c" />
            <Text className="text-orange-600 mt-2">Inicializando mapa...</Text>
          </View>
        )}
        
        {mapError && (
          <View className="absolute inset-0 bg-orange-50 justify-center items-center z-10">
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text className="text-red-600 font-semibold text-lg mt-2 text-center">
              Error al cargar el mapa
            </Text>
            <TouchableOpacity
              onPress={reloadMap}
              className="bg-red-500 px-6 py-3 rounded-xl mt-4"
            >
              <Text className="text-white font-semibold">Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <WebView
          key={mapKey}
          ref={webViewRef}
          source={{ html: getMapHtml() }}
          onMessage={onMarkerMessage}
          onLoadEnd={onWebViewLoad}
          onLoadStart={() => {
            setMapLoaded(false);
            setMapError(false);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          overScrollMode="never"
          style={{ 
            flex: 1,
            backgroundColor: '#f8fafc'
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            setMapError(true);
          }}
          onContentProcessDidTerminate={() => {
            console.log('WebView process terminated, reloading...');
            reloadMap();
          }}
        />
      </View>

      {/* Lista de lugares */}
      <View className="flex-1 mt-4">
        <View className="px-6 mb-3">
          <Text className="text-orange-800 text-lg font-bold">
            Lugares ({visiblePlaces.length})
          </Text>
        </View>

        <ScrollView 
          className="flex-1 px-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {visiblePlaces.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-orange-200">
              <Ionicons name="map-outline" size={48} color="#ea580c" />
              <Text className="text-orange-800 text-lg font-semibold mt-4 text-center">
                No hay lugares disponibles
              </Text>
              <Text className="text-orange-600 text-center mt-2">
                {isAdmin 
                  ? userHasPendingPlaces
                    ? 'Tienes lugares pendientes de aprobación'
                    : 'Crea tu primer lugar para comenzar'
                  : 'No hay lugares aprobados para mostrar'
                }
              </Text>
            </View>
          ) : (
            visiblePlaces.map((place) => (
              <View
                key={place.id}
                className="bg-white rounded-2xl p-4 mb-3 border border-orange-200 shadow-sm"
              >
                <View className="flex-row">
                  {/* Imagen */}
                  {place.image_url ? (
                    <Image
                      source={{ uri: place.image_url }}
                      className="w-20 h-20 rounded-xl mr-3"
                    />
                  ) : (
                    <View className="w-20 h-20 rounded-xl mr-3 bg-orange-100 items-center justify-center">
                      <Ionicons name="image-outline" size={28} color="#ea580c" />
                    </View>
                  )}

                  {/* Información del lugar */}
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Text className="text-orange-900 font-bold text-lg flex-1 pr-2" numberOfLines={1}>
                        {place.name}
                      </Text>
                      <View className={`px-2 py-1 rounded-full border ${getStatusColor(place.status)}`}>
                        <Text className="text-xs font-semibold">
                          {getStatusText(place.status)}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-orange-600 text-xs mb-1">
                      {new Date(place.createdAt).toLocaleDateString()} · {place.route_name || 'Sin ruta'}
                    </Text>

                    <Text className="text-orange-800 text-sm" numberOfLines={2}>
                      {place.description}
                    </Text>

                    {/* 🔹 MOSTRAR COMENTARIO DE RECHAZO SI EXISTE */}
                    {place.status === 'rechazada' && place.rejectionComment && (
                      <View className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                        <View className="flex-row items-start">
                          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                          <Text className="text-red-800 font-bold ml-2 flex-1 text-sm">
                            Motivo del rechazo:
                          </Text>
                        </View>
                        <Text className="text-red-700 mt-1 text-xs">
                          {place.rejectionComment}
                        </Text>
                      </View>
                    )}

                    {/* Información adicional - Likes y Comentarios */}
                    <View className="flex-row mt-2 items-center">
                      <View className="flex-row items-center mr-4">
                        <Ionicons 
                          name={place.user_liked ? "heart" : "heart-outline"} 
                          size={14} 
                          color={place.user_liked ? "#ef4444" : "#ea580c"} 
                        />
                        <Text className="text-orange-600 text-xs ml-1">
                          {place.likes_count || 0}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="chatbubble-outline" size={14} color="#ea580c" />
                        <Text className="text-orange-600 text-xs ml-1">
                          {place.comments_count || 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Botones de acción */}
                <View className="flex-row gap-2 mt-3">
                  {/* 🔹 VER DETALLES - SIEMPRE DISPONIBLE */}
                  <TouchableOpacity
                    onPress={() => router.push(`/Place/details?id=${place.id}`)}
                    className="flex-1 bg-orange-100 py-2 rounded-xl border border-orange-300 flex-row items-center justify-center"
                  >
                    <Text className="text-orange-700 font-semibold ml-2">Ver detalles</Text>
                  </TouchableOpacity>

                  {isAdmin && (
                    <>
                      {/* 🔹 EDITAR - BLOQUEADO SI ESTÁ RECHAZADO */}
                      <TouchableOpacity
                        onPress={() => {
                          if (handleBlockedAction(place, 'editar')) return;
                          router.push(`/Place/edit?id=${place.id}`);
                        }}
                        className={`flex-1 py-2 rounded-xl border flex-row items-center justify-center ${
                          place.status === 'rechazada' 
                            ? 'bg-gray-200 border-gray-400' 
                            : 'bg-blue-100 border-blue-300'
                        }`}
                        disabled={place.status === 'rechazada'}
                      >
                        <Ionicons 
                          name="create-outline" 
                          size={18} 
                          color={place.status === 'rechazada' ? "#9ca3af" : "#3b82f6"} 
                        />
                        <Text className={`font-semibold ml-2 ${
                          place.status === 'rechazada' ? 'text-gray-500' : 'text-blue-700'
                        }`}>
                          Editar
                        </Text>
                      </TouchableOpacity>

                      {/* 🔹 ELIMINAR - SIEMPRE DISPONIBLE PARA TÉCNICOS */}
                      <TouchableOpacity
                        onPress={() => deletePlace(place.id)}
                        className="flex-1 bg-red-100 py-2 rounded-xl border border-red-300 flex-row items-center justify-center"
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        <Text className="text-red-700 font-semibold ml-2">Eliminar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {isUser ? (
                    <>
                      {/* 🔹 LIKE - BLOQUEADO SI ESTÁ RECHAZADO */}
                      <TouchableOpacity
                        onPress={() => {
                          if (handleBlockedAction(place, 'dar like a')) return;
                          toggleLike(place.id);
                        }}
                        className={`flex-1 py-2 rounded-xl border flex-row items-center justify-center ${
                          place.status === 'rechazada' 
                            ? 'bg-gray-200 border-gray-400' 
                            : 'bg-pink-100 border-pink-300'
                        }`}
                        disabled={place.status === 'rechazada'}
                      >
                        <Ionicons 
                          name={place.user_liked ? "heart" : "heart-outline"} 
                          size={18} 
                          color={place.status === 'rechazada' ? "#9ca3af" : "#ec4899"} 
                        />
                        <Text className={`font-semibold ml-2 ${
                          place.status === 'rechazada' ? 'text-gray-500' : 'text-pink-700'
                        }`}>
                          {place.user_liked ? 'Quitar' : 'Like'}
                        </Text>
                      </TouchableOpacity>

                      {/* 🔹 COMENTARIOS - BLOQUEADO SI ESTÁ RECHAZADO */}
                      <TouchableOpacity
                        onPress={() => {
                          if (handleBlockedAction(place, 'comentar')) return;
                          router.push(`/Place/comments?id=${place.id}&name=${place.name}`);
                        }}
                        className={`flex-1 py-2 rounded-xl border flex-row items-center justify-center ${
                          place.status === 'rechazada' 
                            ? 'bg-gray-200 border-gray-400' 
                            : 'bg-green-100 border-green-300'
                        }`}
                        disabled={place.status === 'rechazada'}
                      >
                        <Text className={`font-semibold ml-2 ${
                          place.status === 'rechazada' ? 'text-gray-500' : 'text-green-700'
                        }`}>
                          Comentarios
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // Visitante: solo ver comentarios (bloqueado si está rechazado)
                    <TouchableOpacity
                      onPress={() => {
                        if (handleBlockedAction(place, 'ver comentarios de')) return;
                        router.push(`/Place/comments?id=${place.id}&name=${place.name}`);
                      }}
                      className={`flex-1 py-2 rounded-xl border flex-row items-center justify-center ${
                        place.status === 'rechazada' 
                          ? 'bg-gray-200 border-gray-400' 
                          : 'bg-green-100 border-green-300'
                      }`}
                      disabled={place.status === 'rechazada'}
                    >
                      <Text className={`font-semibold ml-2 ${
                        place.status === 'rechazada' ? 'text-gray-500' : 'text-green-700'
                      }`}>
                        Comentarios
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Bottom sheet / panel de info */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="bg-white rounded-t-3xl p-4 border-t border-orange-200 max-h-3/4">
            <View className="items-center mb-2">
              <View className="w-12 h-1.5 bg-orange-200 rounded-full" />
            </View>

            {selectedPlace && (
              <>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xl font-bold text-orange-900 flex-1 pr-2">
                    {selectedPlace.name}
                  </Text>
                  <TouchableOpacity onPress={() => setInfoOpen(false)} className="p-1">
                    <Ionicons name="close" size={22} color="#ea580c" />
                  </TouchableOpacity>
                </View>

                <Text className="text-orange-600 text-xs mb-2">
                  {new Date(selectedPlace.createdAt).toLocaleDateString()} · Ruta:{' '}
                  {selectedPlace.route_name ||
                    resolvedRouteName ||
                    (numericRouteId ? `Ruta #${numericRouteId}` : '—')}
                </Text>

                {/* 🔹 MOSTRAR COMENTARIO DE RECHAZO EN EL MODAL */}
                {selectedPlace.status === 'rechazada' && selectedPlace.rejectionComment && (
                  <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                    <View className="flex-row items-start">
                      <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                      <Text className="text-red-800 font-bold ml-2 flex-1">
                        Motivo del rechazo:
                      </Text>
                    </View>
                    <Text className="text-red-700 mt-1 text-sm">
                      {selectedPlace.rejectionComment}
                    </Text>
                  </View>
                )}

                {/* Stats de likes y comentarios */}
                {isUser && selectedPlace.status !== 'rechazada' && (
                  <View className="flex-row mb-3">
                    <TouchableOpacity 
                      onPress={() => toggleLike(selectedPlace.id)}
                      className="flex-row items-center mr-6"
                    >
                      <Ionicons 
                        name={selectedPlace.user_liked ? "heart" : "heart-outline"} 
                        size={20} 
                        color={selectedPlace.user_liked ? "#ef4444" : "#ea580c"} 
                      />
                      <Text className="text-orange-700 font-medium ml-1">
                        {selectedPlace.likes_count || 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        setInfoOpen(false);
                        router.push(`/Place/comments?id=${selectedPlace.id}&name=${selectedPlace.name}`);
                      }}
                      className="flex-row items-center"
                    >
                      <Ionicons name="chatbubble-outline" size={20} color="#ea580c" />
                      <Text className="text-orange-700 font-medium ml-1">
                        {selectedPlace.comments_count || 0} comentarios
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Horario completo */}
                {selectedPlace.schedules && selectedPlace.schedules.length > 0 && (
                  <View className="mb-3 bg-orange-50 rounded-xl p-3 border border-orange-200">
                    <Text className="text-orange-700 font-bold text-sm mb-2">
                      🕒 Horario de atención
                    </Text>
                    {getFullSchedule(selectedPlace.schedules)}
                  </View>
                )}

                <View className="flex-row items-center mb-3">
                  {selectedPlace.image_url ? (
                    <Image
                      source={{ uri: selectedPlace.image_url }}
                      className="w-20 h-20 rounded-xl mr-3"
                    />
                  ) : (
                    <View className="w-20 h-20 rounded-xl mr-3 bg-orange-100 items-center justify-center">
                      <Ionicons name="image-outline" size={28} color="#ea580c" />
                    </View>
                  )}
                  <Text className="text-orange-800 flex-1" numberOfLines={4}>
                    {selectedPlace.description}
                  </Text>
                </View>

                <View className="flex-row gap-2 mb-3">
                  <TouchableOpacity
                    onPress={() => {
                      setInfoOpen(false);
                      router.push(`/Place/details?id=${selectedPlace.id}`);
                    }}
                    className="flex-1 bg-orange-100 py-3 rounded-xl border border-orange-300 items-center"
                  >
                    <Ionicons
                      name={selectedPlace.website ? 'globe-outline' : 'eye-outline'}
                      size={20}
                      color="#ea580c"
                    />
                    <Text className="text-orange-700 font-semibold mt-1">
                      {selectedPlace.website ? 'Sitio / Más' : 'Ver detalles'}
                    </Text>
                  </TouchableOpacity>

                  {selectedPlace.phoneNumber && selectedPlace.status !== 'rechazada' ? (
                    <TouchableOpacity
                      onPress={() => {
                        setInfoOpen(false);
                        router.push(`/Place/details?id=${selectedPlace.id}`);
                      }}
                      className="flex-1 bg-orange-100 py-3 rounded-xl border border-orange-300 items-center"
                    >
                      <Ionicons name="call-outline" size={20} color="#ea580c" />
                      <Text className="text-orange-700 font-semibold mt-1">Contactar</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setInfoOpen(false);
                    router.push(`/Place/details?id=${selectedPlace.id}`);
                  }}
                  className="bg-orange-500 py-4 rounded-2xl shadow-lg flex-row items-center justify-center"
                >
                  <Ionicons name="information-circle-outline" size={22} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Abrir ficha completa</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}