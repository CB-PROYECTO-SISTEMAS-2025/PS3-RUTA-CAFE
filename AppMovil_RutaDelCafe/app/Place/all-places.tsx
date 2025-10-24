// app/Place/all-places.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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
  TextInput,
  Dimensions,
  Linking,
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

interface Route {
  id: number;
  name: string;
  status: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

export default function AllPlacesScreen() {
  const router = useRouter();

  const [places, setPlaces] = useState<Place[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [showRouteFilter, setShowRouteFilter] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const webViewRef = useRef<any>(null);

  useEffect(() => {
    fetchPlaces();
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (places.length > 0) {
      setMapKey(prev => prev + 1);
    }
  }, [places]);

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

      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/places`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Filtrar solo lugares aprobados y con coordenadas válidas
      const normalized = data
        .map((p: any) => ({
          ...p,
          latitude: typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude,
          longitude: typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude,
        }))
        .filter(
          (p: any) =>
            p.status === 'aprobada' &&
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

  const fetchRoutes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes?status=aprobada`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const routesData = await response.json();
        setRoutes(routesData);
      }
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const filteredPlaces = useMemo(() => {
    let filtered = places;

    // Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.route_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por ruta
    if (selectedRoute !== 'all') {
      filtered = filtered.filter(place => place.route_id.toString() === selectedRoute);
    }

    return filtered;
  }, [places, searchQuery, selectedRoute]);

  const onRefresh = () => {
    setRefreshing(true);
    setMapLoaded(false);
    setMapError(false);
    fetchPlaces();
  };

  const getMapHtml = () => {
    const placesData = filteredPlaces.map(p => ({
      id: p.id,
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
      desc: (p.description || '').slice(0, 80),
      route_name: p.route_name || 'Sin ruta'
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
          .custom-pin {
            background: white;
            border-radius: 50%;
            border: 3px solid #ea580c;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(234,88,12,0.4);
            font-size: 20px;
            font-weight: bold;
            transition: all 0.3s ease;
          }
          .custom-pin:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(234,88,12,0.6);
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
          .map-title {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255,255,255,0.95);
            padding: 8px 12px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: bold;
            color: #ea580c;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="loading" class="loading">Cargando mapa interactivo...</div>
        <div class="map-title">🗺️ Mapa de Lugares Aprobados</div>
        
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
              
              const customIcon = L.divIcon({
                className: 'custom-pin',
                html: '📍',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              });
              
              ${placesData.length > 0 ? `
                const places = ${JSON.stringify(placesData)};
                
                places.forEach(place => {
                  const marker = L.marker([place.lat, place.lng], { 
                    icon: customIcon 
                  }).addTo(map);
                  
                  marker.bindPopup(
                    '<div style="padding: 12px; min-width: 250px; max-width: 300px;">' +
                    '<strong style="color: #ea580c; font-size: 16px;">' + place.name + '</strong><br/>' +
                    '<span style="color: #666; font-size: 12px; margin: 4px 0; display: block;">' + (place.desc || '') + '</span>' +
                    '<hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">' +
                    '<span style="color: #16a34a; font-size: 11px; font-weight: bold;">📌 ' + place.route_name + '</span>' +
                    '</div>'
                  );
                  
                  marker.on('click', function() {
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(place.id.toString());
                    }
                  });
                  
                  marker.on('mouseover', function() {
                    this.openPopup();
                  });
                  
                  markers.push(marker);
                });
                
                if (places.length > 1) {
                  const group = new L.featureGroup(markers);
                  map.fitBounds(group.getBounds().pad(0.15));
                }
              ` : ''}
              
              // Agregar controles de zoom personalizados
              L.control.zoom({
                position: 'topright'
              }).addTo(map);
              
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
      const found = places.find(p => p.id === id);
      if (found) {
        setSelectedPlace(found);
        setInfoOpen(true);
      }
    }
  };

  const onWebViewLoad = () => {
    setTimeout(() => {
      if (webViewRef.current && typeof webViewRef.current.injectJavaScript === 'function') {
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

  const openInOSMaps = async (latitude: number | string, longitude: number | string, placeName: string) => {
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    
    // Usar OpenStreetMap para direcciones
    const url = `https://www.openstreetmap.org/directions?from=&to=${lat},${lng}#map=15/${lat}/${lng}`;
    
    Alert.alert(
      '🗺️ Abrir en OpenStreetMap',
      `¿Quieres obtener indicaciones hacia "${placeName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Obtener Ruta', 
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(url);
              if (supported) {
                await Linking.openURL(url);
              } else {
                Alert.alert('Error', 'No se puede abrir OpenStreetMap en este dispositivo');
              }
            } catch (error) {
              console.error('Error opening OSM:', error);
              Alert.alert('Error', 'No se pudo abrir OpenStreetMap');
            }
          }
        }
      ]
    );
  };

  const navigateToPlaceDetails = (placeId: number) => {
    // Usar Expo Router para navegar a detalles
    router.push(`/Place/details?id=${placeId}`);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-orange-50 to-white">
        <View className="items-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-orange-700 text-lg font-bold mt-4">Cargando mapa interactivo...</Text>
          <Text className="text-orange-500 text-sm mt-2">Buscando todos los lugares aprobados</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-b from-orange-50 to-white">
      {/* Header Mejorado */}
      <View className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 rounded-b-3xl shadow-2xl">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">🗺️ Cómo Llegar</Text>
            <Text className="text-orange-100 text-sm mt-1">
              Mapa interactivo de lugares aprobados
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/20 p-3 rounded-xl"
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Estadísticas rápidas */}
        <View className="flex-row justify-between mt-3">
          <View className="items-center">
            <Text className="text-white text-lg font-bold">{filteredPlaces.length}</Text>
            <Text className="text-orange-100 text-xs">Lugares</Text>
          </View>
          <View className="items-center">
            <Text className="text-white text-lg font-bold">{routes.length}</Text>
            <Text className="text-orange-100 text-xs">Rutas</Text>
          </View>
          <View className="items-center">
            <Text className="text-white text-lg font-bold">{new Set(filteredPlaces.map(p => p.route_id)).size}</Text>
            <Text className="text-orange-100 text-xs">Rutas Activas</Text>
          </View>
        </View>
      </View>

      {/* Barra de Búsqueda y Filtros */}
      <View className="px-6 mt-4">
        <View className="flex-row gap-3 mb-3">
          {/* Barra de búsqueda */}
          <View className="flex-1 bg-white rounded-2xl shadow-lg border border-orange-200">
            <View className="flex-row items-center px-4 py-3">
              <Ionicons name="search" size={20} color="#ea580c" />
              <TextInput
                placeholder="Buscar lugares por nombre..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-orange-900"
                placeholderTextColor="#9ca3af"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Filtro de rutas */}
          <TouchableOpacity
            onPress={() => setShowRouteFilter(true)}
            className="bg-white px-4 py-3 rounded-2xl shadow-lg border border-orange-200 flex-row items-center"
          >
            <Ionicons name="filter" size={20} color="#ea580c" />
            <Text className="text-orange-700 font-medium ml-2">
              {selectedRoute === 'all' ? 'Todas' : routes.find(r => r.id.toString() === selectedRoute)?.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Información de filtros activos */}
        {(searchQuery || selectedRoute !== 'all') && (
          <View className="bg-orange-100 rounded-xl p-3 mb-3 border border-orange-300">
            <Text className="text-orange-800 text-sm font-medium">
              📊 Mostrando {filteredPlaces.length} de {places.length} lugares
              {searchQuery && ` • Búsqueda: "${searchQuery}"`}
              {selectedRoute !== 'all' && ` • Ruta: ${routes.find(r => r.id.toString() === selectedRoute)?.name}`}
            </Text>
          </View>
        )}
      </View>

      {/* Mapa Mejorado */}
      <View className="flex-1 mt-2 mx-6 rounded-3xl overflow-hidden border-2 border-orange-300 shadow-2xl relative">
        {!mapLoaded && !mapError && (
          <View className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white justify-center items-center z-10">
            <View className="items-center">
              <ActivityIndicator size="large" color="#ea580c" />
              <Text className="text-orange-700 font-bold text-lg mt-4">Cargando Mapa Interactivo</Text>
              <Text className="text-orange-500 text-sm mt-2">Buscando {filteredPlaces.length} lugares en el mapa...</Text>
            </View>
          </View>
        )}
        
        {mapError && (
          <View className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white justify-center items-center z-10">
            <View className="items-center p-6">
              <Ionicons name="alert-circle" size={64} color="#ef4444" />
              <Text className="text-red-600 font-bold text-xl mt-4 text-center">
                Error al cargar el mapa
              </Text>
              <Text className="text-red-500 text-center mt-2">
                No se pudo cargar el mapa interactivo
              </Text>
              <TouchableOpacity
                onPress={reloadMap}
                className="bg-red-500 px-8 py-4 rounded-2xl mt-6 shadow-lg"
              >
                <Text className="text-white font-bold text-lg">🔄 Reintentar</Text>
              </TouchableOpacity>
            </View>
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

        {/* Indicador de carga del mapa */}
        {mapLoaded && (
          <View className="absolute top-4 right-4 bg-white/95 px-3 py-2 rounded-xl shadow-lg">
            <Text className="text-orange-600 text-xs font-bold">
              🗺️ {filteredPlaces.length} lugares
            </Text>
          </View>
        )}
      </View>

      {/* Lista de Lugares Mejorada */}
      <View className="flex-1 mt-4">
        <View className="px-6 mb-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-orange-900 text-xl font-bold">
              📋 Lugares Disponibles ({filteredPlaces.length})
            </Text>
            <TouchableOpacity onPress={onRefresh} className="bg-orange-500 px-4 py-2 rounded-xl">
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          className="flex-1 px-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredPlaces.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center justify-center border-2 border-orange-200 shadow-lg">
              <Ionicons name="map-outline" size={64} color="#ea580c" />
              <Text className="text-orange-800 text-xl font-bold mt-4 text-center">
                No se encontraron lugares
              </Text>
              <Text className="text-orange-600 text-center mt-2">
                {searchQuery || selectedRoute !== 'all' 
                  ? 'Intenta con otros términos de búsqueda o selecciona otra ruta'
                  : 'No hay lugares aprobados para mostrar en este momento'
                }
              </Text>
              {(searchQuery || selectedRoute !== 'all') && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedRoute('all');
                  }}
                  className="bg-orange-500 px-6 py-3 rounded-xl mt-4"
                >
                  <Text className="text-white font-bold">Mostrar Todos los Lugares</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredPlaces.map((place) => (
              <View
                key={place.id}
                className="bg-white rounded-3xl p-5 mb-4 border-2 border-orange-200 shadow-lg"
              >
                <View className="flex-row">
                  {/* Imagen del lugar */}
                  <View className="relative">
                    {place.image_url ? (
                      <Image
                        source={{ uri: place.image_url }}
                        className="w-24 h-24 rounded-2xl mr-4"
                      />
                    ) : (
                      <View className="w-24 h-24 rounded-2xl mr-4 bg-gradient-to-br from-orange-100 to-orange-200 items-center justify-center">
                        <Ionicons name="image-outline" size={32} color="#ea580c" />
                      </View>
                    )}
                    <View className="absolute -top-2 -right-2 bg-green-500 px-2 py-1 rounded-full">
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </View>
                  </View>

                  {/* Información del lugar */}
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Text className="text-orange-900 font-bold text-lg flex-1 pr-2" numberOfLines={1}>
                        {place.name}
                      </Text>
                      <View className="bg-green-100 px-3 py-1 rounded-full border border-green-300">
                        <Text className="text-green-800 text-xs font-bold">
                          Aprobado
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mt-1">
                      <Ionicons name="location" size={12} color="#ea580c" />
                      <Text className="text-orange-600 text-xs ml-1">
                        {place.route_name || 'Sin ruta asignada'}
                      </Text>
                    </View>

                    <Text className="text-orange-800 text-sm mt-2" numberOfLines={2}>
                      {place.description}
                    </Text>

                    {/* Información adicional */}
                    <View className="flex-row mt-3 items-center justify-between">
                      <View className="flex-row items-center space-x-4">
                        <View className="flex-row items-center">
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
                      <Text className="text-orange-500 text-xs">
                        {new Date(place.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Botones de acción mejorados */}
                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    onPress={() => navigateToPlaceDetails(place.id)}
                    className="flex-1 bg-orange-100 py-3 rounded-xl border border-orange-300 flex-row items-center justify-center"
                  >
                    <Ionicons name="eye-outline" size={18} color="#ea580c" />
                    <Text className="text-orange-700 font-semibold ml-2">Detalles</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openInOSMaps(place.latitude, place.longitude, place.name)}
                    className="flex-1 bg-blue-500 py-3 rounded-xl border border-blue-600 flex-row items-center justify-center shadow-lg"
                  >
                    <Ionicons name="navigate" size={18} color="white" />
                    <Text className="text-white font-bold ml-2">Cómo Llegar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Modal de Filtro de Rutas */}
      <Modal
        visible={showRouteFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRouteFilter(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-3/4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-orange-900 text-xl font-bold">Filtrar por Ruta</Text>
              <TouchableOpacity onPress={() => setShowRouteFilter(false)}>
                <Ionicons name="close" size={24} color="#ea580c" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <TouchableOpacity
                onPress={() => {
                  setSelectedRoute('all');
                  setShowRouteFilter(false);
                }}
                className={`p-4 rounded-xl mb-2 ${
                  selectedRoute === 'all' ? 'bg-orange-100 border-2 border-orange-300' : 'bg-orange-50'
                }`}
              >
                <Text className={`font-semibold ${
                  selectedRoute === 'all' ? 'text-orange-700' : 'text-orange-600'
                }`}>
                  📍 Todas las Rutas ({places.length} lugares)
                </Text>
              </TouchableOpacity>

              {routes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  onPress={() => {
                    setSelectedRoute(route.id.toString());
                    setShowRouteFilter(false);
                  }}
                  className={`p-4 rounded-xl mb-2 ${
                    selectedRoute === route.id.toString() ? 'bg-orange-100 border-2 border-orange-300' : 'bg-orange-50'
                  }`}
                >
                  <Text className={`font-semibold ${
                    selectedRoute === route.id.toString() ? 'text-orange-700' : 'text-orange-600'
                  }`}>
                    🛣️ {route.name} ({places.filter(p => p.route_id === route.id).length} lugares)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de información del lugar */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 border-t-4 border-orange-400 max-h-4/5">
            <View className="items-center mb-4">
              <View className="w-16 h-1.5 bg-orange-300 rounded-full" />
            </View>

            {selectedPlace && (
              <>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-2xl font-bold text-orange-900 flex-1 pr-2">
                    {selectedPlace.name}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setInfoOpen(false)} 
                    className="bg-orange-100 p-2 rounded-full"
                  >
                    <Ionicons name="close" size={22} color="#ea580c" />
                  </TouchableOpacity>
                </View>

                <View className="bg-orange-50 rounded-2xl p-4 mb-4 border border-orange-200">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-orange-700 font-semibold">
                        📍 {selectedPlace.route_name || 'Sin ruta'}
                      </Text>
                      <Text className="text-orange-500 text-sm mt-1">
                        {new Date(selectedPlace.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className="bg-green-100 px-3 py-1 rounded-full">
                      <Text className="text-green-800 text-xs font-bold">✓ Aprobado</Text>
                    </View>
                  </View>
                </View>

                {/* Horario completo */}
                {selectedPlace.schedules && selectedPlace.schedules.length > 0 && (
                  <View className="mb-4 bg-blue-50 rounded-2xl p-4 border border-blue-200">
                    <Text className="text-blue-800 font-bold text-lg mb-3 flex-row items-center">
                      <Ionicons name="time" size={18} color="#1d4ed8" />
                      <Text className="ml-2">🕒 Horario de Atención</Text>
                    </Text>
                    {getFullSchedule(selectedPlace.schedules)}
                  </View>
                )}

                <View className="flex-row items-start mb-4">
                  {selectedPlace.image_url ? (
                    <Image
                      source={{ uri: selectedPlace.image_url }}
                      className="w-24 h-24 rounded-2xl mr-4"
                    />
                  ) : (
                    <View className="w-24 h-24 rounded-2xl mr-4 bg-orange-100 items-center justify-center">
                      <Ionicons name="image-outline" size={32} color="#ea580c" />
                    </View>
                  )}
                  <Text className="text-orange-800 flex-1 text-base leading-6">
                    {selectedPlace.description}
                  </Text>
                </View>

                <View className="flex-row gap-3 mb-4">
                  <TouchableOpacity
                    onPress={() => {
                      setInfoOpen(false);
                      navigateToPlaceDetails(selectedPlace.id);
                    }}
                    className="flex-1 bg-orange-100 py-4 rounded-2xl border-2 border-orange-300 items-center"
                  >
                    <Ionicons name="eye" size={22} color="#ea580c" />
                    <Text className="text-orange-700 font-bold mt-2">Ver Detalles</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setInfoOpen(false);
                      openInOSMaps(selectedPlace.latitude, selectedPlace.longitude, selectedPlace.name);
                    }}
                    className="flex-1 bg-blue-500 py-4 rounded-2xl border-2 border-blue-600 items-center shadow-lg"
                  >
                    <Ionicons name="navigate" size={22} color="white" />
                    <Text className="text-white font-bold mt-2">Cómo Llegar</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setInfoOpen(false);
                    openInOSMaps(selectedPlace.latitude, selectedPlace.longitude, selectedPlace.name);
                  }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 py-5 rounded-2xl shadow-2xl flex-row items-center justify-center"
                >
                  <Ionicons name="navigate" size={24} color="white" />
                  <Text className="text-white font-bold text-lg ml-3">🗺️ Obtener Ruta en OSM</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}