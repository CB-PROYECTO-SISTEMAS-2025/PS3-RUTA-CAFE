// app/Place/index.tsx
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
import { useThemedStyles } from '../../hooks/useThemedStyles';

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

// === helpers de horario (sin cambios de lógica)
const getScheduleSummary = (schedules: Schedule[]) => {
  if (!schedules || schedules.length === 0) return 'Horario no disponible';
  const openDays = schedules;
  const firstOpenDay = openDays[0];
  const allSameSchedule = openDays.every(
    (d) =>
      d.openTime.substring(0, 5) === firstOpenDay.openTime.substring(0, 5) &&
      d.closeTime.substring(0, 5) === firstOpenDay.closeTime.substring(0, 5)
  );
  if (openDays.length === 7 && allSameSchedule) {
    return `Lun-Dom: ${firstOpenDay.openTime.substring(0, 5)} - ${firstOpenDay.closeTime.substring(0, 5)}`;
  }
  return `${openDays.length} días con horario`;
};

const formatDayName = (dayOfWeek: string) => {
  const days: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };
  return days[dayOfWeek.toLowerCase()] || dayOfWeek;
};

const formatTime = (time: string) => time.substring(0, 5);

const getFullSchedule = (schedules: Schedule[]) => {
  if (!schedules || schedules.length === 0) return null;
  return schedules.map((s) => (
    <View key={s.id} className="flex-row justify-between py-1">
      <Text className="text-orange-700 text-sm font-medium">{formatDayName(s.dayOfWeek)}</Text>
      <Text className="text-orange-600 text-sm">
        {formatTime(s.openTime)} - {formatTime(s.closeTime)}
      </Text>
    </View>
  ));
};

export default function PlacesMapScreen() {
  const themed = useThemedStyles();
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
    if (places.length > 0) setMapKey((p) => p + 1);
  }, [places]);

  // user
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
    } catch (e) {
      console.error('Error loading user data:', e);
      setUserRole(0);
    }
  };

  // places
  const fetchPlaces = async () => {
    setLoading(true);
    setMapLoaded(false);
    setMapError(false);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = `${process.env.EXPO_PUBLIC_API_URL}/api/places`;
      if (numericRouteId) url = `${process.env.EXPO_PUBLIC_API_URL}/api/places/route/${numericRouteId}`;

      const response = await fetch(url, { method: 'GET', headers });
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

  const deletePlace = async (placeId: number) => {
    Alert.alert('Confirmar eliminación', '¿Estás seguro de que quieres eliminar este lugar? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places/${placeId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
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
    ]);
  };

  const toggleLike = async (placeId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/likes/${placeId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setPlaces((prev) =>
          prev.map((pl) => {
            if (pl.id === placeId) {
              const newLiked = !pl.user_liked;
              const newLikesCount = (pl.likes_count || 0) + (newLiked ? 1 : -1);
              return { ...pl, user_liked: newLiked, likes_count: newLikesCount };
            }
            return pl;
          })
        );
        if (selectedPlace && selectedPlace.id === placeId) {
          setSelectedPlace((prev) =>
            prev
              ? {
                  ...prev,
                  user_liked: !prev.user_liked,
                  likes_count: (prev.likes_count || 0) + (prev.user_liked ? -1 : 1),
                }
              : null
          );
        }
      } else {
        throw new Error('Error al actualizar el like');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el like');
      console.error(error);
    }
  };

  // visibilidad por rol (misma lógica)
  const visiblePlaces = useMemo(() => {
    if (isAdmin) return places.filter((p) => p.createdBy === userId);
    return places.filter((p) => p.status === 'aprobada');
  }, [isAdmin, places, userId]);

  const resolvedRouteName =
    routeName ||
    (visiblePlaces.length > 0 ? visiblePlaces[0].route_name : undefined) ||
    (numericRouteId ? `Ruta #${numericRouteId}` : undefined);

  // === HTML del mapa con color del tema ===
  const getMapHtml = () => {
    const placesData = visiblePlaces.map((p) => ({
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
      const avgLat = placesData.reduce((s, p) => s + (p.lat as number), 0) / placesData.length;
      const avgLng = placesData.reduce((s, p) => s + (p.lng as number), 0) / placesData.length;
      centerLat = avgLat;
      centerLng = avgLng;
      initialZoom = 14;
    }

    // Tomamos el color acento (ej. naranja) y fondo para popup del mapa según tema
    const accent = typeof themed.accent === 'string' ? themed.accent : '#ea580c';
    const card = typeof themed.card === 'string' ? themed.card : '#ffffff';
    const text = typeof themed.text === 'string' ? themed.text : '#0f172a';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { height: 100%; width: 100%; overflow: hidden; }
          .coffee-pin {
            background: ${card};
            border-radius: 50%;
            border: 2px solid ${accent};
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            font-size: 18px;
          }
          .popup-card { padding: 8px; min-width: 200px; color: ${text}; }
          .popup-title { font-weight: 700; }
          .popup-desc { color: #64748b; font-size: 12px; }
          .loading {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            text-align: center; z-index: 1000;
            background: ${card}; color: ${text};
            padding: 16px; border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="loading" class="loading">Cargando mapa...</div>
        <script>
          let map; let markers = [];
          function initMap() {
            try {
              document.getElementById('loading').style.display = 'none';
              map = L.map('map').setView([${centerLat}, ${centerLng}], ${initialZoom});
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors', maxZoom: 19
              }).addTo(map);
              const coffeeIcon = L.divIcon({
                className: 'coffee-pin',
                html: '☕', iconSize: [34, 34], iconAnchor: [17, 17]
              });
              ${placesData.length > 0 ? `
                const places = ${JSON.stringify(placesData)};
                places.forEach(place => {
                  const marker = L.marker([place.lat, place.lng], { icon: coffeeIcon }).addTo(map);
                  marker.bindPopup(
                    '<div class="popup-card">' +
                      '<div class="popup-title">' + place.name + '</div>' +
                      '<div class="popup-desc">' + (place.desc || '') + '</div>' +
                    '</div>'
                  );
                  marker.on('click', function() {
                    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(place.id.toString());
                  });
                  markers.push(marker);
                });
                if (places.length > 1) {
                  const group = new L.featureGroup(markers);
                  map.fitBounds(group.getBounds().pad(0.1));
                }
              ` : ''}

              setTimeout(() => { map.invalidateSize(); }, 100);
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('MAP_LOADED');
            } catch (error) {
              console.error('Error loading map:', error);
              document.getElementById('loading').innerHTML = 'Error al cargar el mapa';
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('MAP_ERROR:' + error.message);
            }
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
          } else { initMap(); }
          window.resizeMap = function() {
            if (map) setTimeout(() => map.invalidateSize(), 100);
          };
        </script>
      </body>
      </html>
    `;
  };

  const onMarkerMessage = (e: any) => {
    const data = e?.nativeEvent?.data;
    if (data === 'MAP_LOADED') { setMapLoaded(true); setMapError(false); return; }
    if (data && data.startsWith('MAP_ERROR:')) { setMapError(true); setMapLoaded(false); return; }
    const id = Number(data);
    if (!isNaN(id)) {
      const found = visiblePlaces.find((p) => p.id === id);
      if (found) { setSelectedPlace(found); setInfoOpen(true); }
    }
  };

  const onWebViewLoad = () => {
    setTimeout(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`if (typeof window.resizeMap==='function'){window.resizeMap();} true;`);
      }
    }, 500);
  };

  const reloadMap = () => {
    setMapKey((p) => p + 1);
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}>
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ color: themed.muted as string, marginTop: 12 }}>Cargando lugares...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header */}
      <View
        className="px-6 py-4 rounded-b-3xl shadow-lg"
        style={{ backgroundColor: themed.accent as string }}
      >
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
          {numericRouteId ? 'Sitios de la Ruta' : 'Mapa de Sitios'}
        </Text>
        {resolvedRouteName ? (
          <Text style={{ color: '#fff', opacity: 0.9, textAlign: 'center', marginTop: 4 }}>{resolvedRouteName}</Text>
        ) : null}
        <Text style={{ color: '#fff', opacity: 0.8, textAlign: 'center', marginTop: 4, fontSize: 12 }}>
          {isAdmin ? 'Mostrando tus sitios (aprobados y pendientes)' : 'Mostrando sitios aprobados en el mapa'}
        </Text>
      </View>

      {/* Acciones superiores */}
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/advertisement');
          }}
          style={{
            backgroundColor: themed.softBg,
            borderWidth: 1,
            borderColor: themed.accent,
            paddingVertical: 12,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={themed.accent as string} />
          <Text style={{ color: themed.accent as string, fontWeight: '700' }}>Volver</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isAdmin && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/Place/create',
                  params: numericRouteId ? { routeId: String(numericRouteId), routeName: resolvedRouteName } : undefined,
                })
              }
              style={{
                flex: 1,
                backgroundColor: themed.accent as string,
                paddingVertical: 16,
                borderRadius: 16,
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Crear Lugar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mapa */}
      <View
        className="rounded-2xl overflow-hidden border shadow relative"
        style={{
          flex: 1,
          marginTop: 16,
          marginHorizontal: 24,
          borderColor: themed.border,
          backgroundColor: themed.card,
        }}
      >
        {!mapLoaded && !mapError && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: themed.background, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <ActivityIndicator size="large" color={themed.accent as string} />
            <Text style={{ color: themed.muted as string, marginTop: 8 }}>Inicializando mapa...</Text>
          </View>
        )}

        {mapError && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: themed.background, justifyContent: 'center', alignItems: 'center', zIndex: 10, padding: 16 }}>
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text style={{ color: themed.text, fontWeight: '700', fontSize: 16, marginTop: 8, textAlign: 'center' }}>
              Error al cargar el mapa
            </Text>
            <TouchableOpacity
              onPress={reloadMap}
              style={{ backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Reintentar</Text>
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
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          overScrollMode="never"
          style={{ flex: 1, backgroundColor: themed.card as string }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            setMapError(true);
          }}
          onContentProcessDidTerminate={reloadMap}
        />
      </View>

      {/* Lista */}
      <View style={{ flex: 1, marginTop: 16 }}>
        <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
          <Text style={{ color: themed.text, fontSize: 18, fontWeight: '800' }}>Lugares ({visiblePlaces.length})</Text>
        </View>

        <ScrollView
          className="flex-1"
          style={{ paddingHorizontal: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {visiblePlaces.length === 0 ? (
            <View
              className="rounded-2xl p-8 items-center justify-center"
              style={{ backgroundColor: themed.card, borderWidth: 1, borderColor: themed.border }}
            >
              <Ionicons name="map-outline" size={48} color={themed.accent as string} />
              <Text style={{ color: themed.text, fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
                No hay lugares disponibles
              </Text>
              <Text style={{ color: themed.muted as string, textAlign: 'center', marginTop: 6 }}>
                {isAdmin ? 'Crea tu primer lugar para comenzar' : 'No hay lugares aprobados para mostrar'}
              </Text>
            </View>
          ) : (
            visiblePlaces.map((place) => (
              <View
                key={place.id}
                className="rounded-2xl p-4 mb-3 border shadow-sm"
                style={{ backgroundColor: themed.card, borderColor: themed.border }}
              >
                <View className="flex-row">
                  {place.image_url ? (
                    <Image source={{ uri: place.image_url }} className="w-20 h-20 rounded-xl mr-3" />
                  ) : (
                    <View className="w-20 h-20 rounded-xl mr-3" style={{ backgroundColor: themed.softBg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="image-outline" size={28} color={themed.accent as string} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View className="flex-row justify-between items-start">
                      <Text style={{ color: themed.text, fontWeight: '800', fontSize: 16, paddingRight: 8 }} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <View className={`px-2 py-1 rounded-full border ${getStatusColor(place.status)}`}>
                        <Text className="text-xs font-semibold">{getStatusText(place.status)}</Text>
                      </View>
                    </View>

                    <Text style={{ color: themed.muted as string, fontSize: 12, marginTop: 2 }}>
                      {new Date(place.createdAt).toLocaleDateString()} · {place.route_name || 'Sin ruta'}
                    </Text>

                    <Text style={{ color: themed.text, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                      {place.description}
                    </Text>

                    <View className="flex-row mt-2 items-center">
                      <View className="flex-row items-center mr-4">
                        <Ionicons
                          name={place.user_liked ? 'heart' : 'heart-outline'}
                          size={14}
                          color={place.user_liked ? '#ef4444' : (themed.accent as string)}
                        />
                        <Text style={{ color: themed.muted as string, fontSize: 12, marginLeft: 4 }}>
                          {place.likes_count || 0}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="chatbubble-outline" size={14} color={themed.accent as string} />
                        <Text style={{ color: themed.muted as string, fontSize: 12, marginLeft: 4 }}>
                          {place.comments_count || 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Acciones */}
                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    onPress={() => router.push(`/Place/details?id=${place.id}`)}
                    className="flex-1 bg-orange-100 py-2 rounded-xl border border-orange-300 flex-row items-center justify-center"
                    style={{ backgroundColor: themed.softBg, borderColor: themed.border }}
                  >
                    <Text style={{ color: themed.text, fontWeight: '700' }}>Ver detalles</Text>
                  </TouchableOpacity>

                  {isAdmin && (
                    <>
                      <TouchableOpacity
                        onPress={() => router.push(`/Place/edit?id=${place.id}`)}
                        className="flex-1 bg-blue-100 py-2 rounded-xl border border-blue-300 flex-row items-center justify-center"
                        style={{ backgroundColor: themed.softBg, borderColor: themed.border }}
                      >
                        <Ionicons name="create-outline" size={18} color="#3b82f6" />
                        <Text style={{ color: themed.text, fontWeight: '700', marginLeft: 8 }}>Editar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => deletePlace(place.id)}
                        className="flex-1 bg-red-100 py-2 rounded-xl border border-red-300 flex-row items-center justify-center"
                        style={{ backgroundColor: themed.softBg, borderColor: themed.border }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        <Text style={{ color: themed.text, fontWeight: '700', marginLeft: 8 }}>Eliminar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {isUser ? (
                    <>
                      <TouchableOpacity
                        onPress={() => toggleLike(place.id)}
                        className="flex-1 bg-pink-100 py-2 rounded-xl border border-pink-300 flex-row items-center justify-center"
                        style={{ backgroundColor: themed.softBg, borderColor: themed.border }}
                      >
                        <Ionicons name={place.user_liked ? 'heart' : 'heart-outline'} size={18} color="#ec4899" />
                        <Text style={{ color: themed.text, fontWeight: '700', marginLeft: 8 }}>
                          {place.user_liked ? 'Quitar' : 'Like'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => router.push(`/Place/comments?id=${place.id}&name=${place.name}`)}
                        className="flex-1 bg-green-100 py-2 rounded-xl border border-green-300 flex-row items-center justify-center"
                        style={{ backgroundColor: themed.successBg, borderColor: themed.successBorder }}
                      >
                        <Text style={{ color: themed.successText as string, fontWeight: '700', marginLeft: 8 }}>Comentarios</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => router.push(`/Place/comments?id=${place.id}&name=${place.name}`)}
                      className="flex-1 bg-green-100 py-2 rounded-xl border border-green-300 flex-row items-center justify-center"
                      style={{ backgroundColor: themed.successBg, borderColor: themed.successBorder }}
                    >
                      <Text style={{ color: themed.successText as string, fontWeight: '700', marginLeft: 8 }}>Comentarios</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Bottom sheet */}
      <Modal visible={infoOpen} transparent animationType="slide" onRequestClose={() => setInfoOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View
            className="rounded-t-3xl p-4 border-t max-h-3/4"
            style={{ backgroundColor: themed.card, borderColor: themed.border }}
          >
            <View className="items-center mb-2">
              <View style={{ width: 48, height: 6, backgroundColor: themed.border, borderRadius: 999 }} />
            </View>

            {selectedPlace && (
              <>
                <View className="flex-row items-center justify-between mb-2">
                  <Text style={{ color: themed.text, fontSize: 20, fontWeight: '800', paddingRight: 8, flex: 1 }}>
                    {selectedPlace.name}
                  </Text>
                  <TouchableOpacity onPress={() => setInfoOpen(false)} className="p-1">
                    <Ionicons name="close" size={22} color={themed.accent as string} />
                  </TouchableOpacity>
                </View>

                <Text style={{ color: themed.muted as string, fontSize: 12, marginBottom: 8 }}>
                  {new Date(selectedPlace.createdAt).toLocaleDateString()} · Ruta:{' '}
                  {selectedPlace.route_name || resolvedRouteName || (numericRouteId ? `Ruta #${numericRouteId}` : '—')}
                </Text>

                {isUser && (
                  <View className="flex-row mb-3">
                    <TouchableOpacity onPress={() => toggleLike(selectedPlace.id)} className="flex-row items-center mr-6">
                      <Ionicons
                        name={selectedPlace.user_liked ? 'heart' : 'heart-outline'}
                        size={20}
                        color={selectedPlace.user_liked ? '#ef4444' : (themed.accent as string)}
                      />
                      <Text style={{ color: themed.text, fontWeight: '600', marginLeft: 6 }}>
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
                      <Ionicons name="chatbubble-outline" size={20} color={themed.accent as string} />
                      <Text style={{ color: themed.text, fontWeight: '600', marginLeft: 6 }}>
                        {selectedPlace.comments_count || 0} comentarios
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedPlace.schedules && selectedPlace.schedules.length > 0 && (
                  <View className="mb-3 rounded-xl p-3 border" style={{ backgroundColor: themed.softBg, borderColor: themed.border }}>
                    <Text style={{ color: themed.text, fontWeight: '800', fontSize: 13, marginBottom: 6 }}>🕒 Horario de atención</Text>
                    {getFullSchedule(selectedPlace.schedules)}
                  </View>
                )}

                <View className="flex-row items-center mb-3">
                  {selectedPlace.image_url ? (
                    <Image source={{ uri: selectedPlace.image_url }} className="w-20 h-20 rounded-xl mr-3" />
                  ) : (
                    <View className="w-20 h-20 rounded-xl mr-3" style={{ backgroundColor: themed.softBg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="image-outline" size={28} color={themed.accent as string} />
                    </View>
                  )}
                  <Text style={{ color: themed.text, flex: 1 }} numberOfLines={4}>
                    {selectedPlace.description}
                  </Text>
                </View>

                <View className="flex-row gap-2 mb-3">
                  <TouchableOpacity
                    onPress={() => {
                      setInfoOpen(false);
                      router.push(`/Place/details?id=${selectedPlace.id}`);
                    }}
                    className="flex-1 py-3 rounded-xl border items-center"
                    style={{ backgroundColor: themed.softBg, borderColor: themed.border }}
                  >
                    <Ionicons name={selectedPlace.website ? 'globe-outline' : 'eye-outline'} size={20} color={themed.accent as string} />
                    <Text style={{ color: themed.text, fontWeight: '700', marginTop: 4 }}>
                      {selectedPlace.website ? 'Sitio / Más' : 'Ver detalles'}
                    </Text>
                  </TouchableOpacity>

                  {selectedPlace.phoneNumber ? (
                    <TouchableOpacity
                      onPress={() => {
                        setInfoOpen(false);
                        router.push(`/Place/details?id=${selectedPlace.id}`);
                      }}
                      className="flex-1 py-3 rounded-xl border items-center"
                      style={{ backgroundColor: themed.softBg, borderColor: themed.border }}
                    >
                      <Ionicons name="call-outline" size={20} color={themed.accent as string} />
                      <Text style={{ color: themed.text, fontWeight: '700', marginTop: 4 }}>Contactar</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setInfoOpen(false);
                    router.push(`/Place/details?id=${selectedPlace.id}`);
                  }}
                  className="py-4 rounded-2xl flex-row items-center justify-center"
                  style={{ backgroundColor: themed.accent as string }}
                >
                  <Ionicons name="information-circle-outline" size={22} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Abrir ficha completa</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
