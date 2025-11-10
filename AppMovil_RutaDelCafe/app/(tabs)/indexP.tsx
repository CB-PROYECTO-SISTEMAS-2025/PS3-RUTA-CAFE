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
  Dimensions,
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
  rejectionComment?: string; // 🔥 NUEVO: Campo de comentario de rechazo
  website?: string;
  phoneNumber?: string;
  image_url?: string | null;
  additional_images?: Array<{
    id: number;
    place_id: number;
    image_url: string;
    created_at: string;
  }>;
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
    <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: '#ea580c', fontSize: 14, fontWeight: '600' }}>{formatDayName(s.dayOfWeek)}</Text>
      <Text style={{ color: '#ea580c', fontSize: 14 }}>
        {formatTime(s.openTime)} - {formatTime(s.closeTime)}
      </Text>
    </View>
  ));
};

// Normaliza imágenes para mostrar en la lista
const normalizeImages = (p: Place): string[] => {
  let imgs: string[] = [];
  
  // Imagen principal (puede ser null)
  if (p.image_url) {
    imgs.push(p.image_url);
  }

  // Imágenes adicionales del nuevo sistema
  if (Array.isArray(p.additional_images)) {
    const additionalUrls = p.additional_images
      .map((img: any) => {
        if (typeof img === 'string') return img;
        return img?.image_url || img?.url || '';
      })
      .filter(Boolean);
    imgs = [...imgs, ...additionalUrls];
  }

  return imgs.slice(0, 3); // Mostrar máximo 3 imágenes en la lista
};

export default function PlacesMapScreen() {
  const themed = useThemedStyles();
  const router = useRouter();
  const { routeId, routeName, refresh, forceRefresh } = useLocalSearchParams<{ 
    routeId?: string; 
    routeName?: string; 
    refresh?: string;
    forceRefresh?: string;
  }>();
  
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
  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const [currentPlaceImages, setCurrentPlaceImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

const [deleteModalVisible, setDeleteModalVisible] = useState(false);
const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null);
const [modalConfig, setModalConfig] = useState({
  title: '',
  message: '',
  type: 'success' as 'success' | 'error',
});

  const webViewRef = useRef<WebView>(null);
  const isAdmin = userRole === 2;
  const isUser = userRole === 3;

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadUser();
  }, []);

   useEffect(() => {
    fetchPlaces();
  }, [numericRouteId, refresh, forceRefresh]);

  useEffect(() => {
    if (places.length > 0) setMapKey((p) => p + 1);
  }, [places]);

  // 🔥 NUEVO: Verificar si el usuario tiene lugares pendientes
  const userHasPendingPlaces = useMemo(() => {
    if (!isAdmin) return false;
    return places.some(place => place.createdBy === userId && place.status === 'pendiente');
  }, [places, userId, isAdmin]);

  // 🔥 NUEVO: Función para manejar acciones bloqueadas
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

      console.log('📱 Datos de lugares recibidos:', data.map((p: any) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        additional_images_count: p.additional_images?.length || 0,
        status: p.status,
        rejectionComment: p.rejectionComment // 🔥 NUEVO: Incluir comentario de rechazo
      })));

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

  // 🔥 NUEVO: Manejo de creación de lugares con bloqueo
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
      params: numericRouteId ? { routeId: String(numericRouteId), routeName: resolvedRouteName } : undefined,
    });
  };

 const deletePlace = async (place: Place) => {
  setPlaceToDelete(place);
  setModalConfig({
    title: 'Confirmar Eliminación',
    message: `¿Estás seguro de que quieres eliminar el lugar "${place.name}"? Esta acción no se puede deshacer.`,
    type: 'error',
  });
  setDeleteModalVisible(true);
};

const confirmDeletePlace = async () => {
  if (!placeToDelete) return;
  
  try {
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places/${placeToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      setModalConfig({
        title: '¡Éxito!',
        message: 'Lugar eliminado correctamente',
        type: 'success',
      });
      setDeleteModalVisible(true);
      fetchPlaces(); // Recargar la lista
    } else {
      throw new Error('Error al eliminar el lugar');
    }
  } catch (error) {
    setModalConfig({
      title: 'Error',
      message: 'No se pudo eliminar el lugar',
      type: 'error',
    });
    setDeleteModalVisible(true);
    console.error(error);
  } finally {
    setPlaceToDelete(null);
  }
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

  // Función para abrir el modal de imágenes
  const openImagesModal = (place: Place) => {
    const images = normalizeImages(place);
    if (images.length === 0) {
      Alert.alert('Sin imágenes', 'Este lugar no tiene imágenes disponibles');
      return;
    }
    setCurrentPlaceImages(images);
    setCurrentImageIndex(0);
    setImagesModalOpen(true);
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
  // Si es usuario normal o invitado, no mostrar estado
  if (isUser || userRole === 0) {
    return { bg: 'transparent', text: 'transparent', border: 'transparent' };
  }
  
  switch (status) {
    case 'aprobada':
      return { bg: '#ecfdf5', text: '#166534', border: '#86efac' };
    case 'pendiente':
      return { bg: '#fef3c7', text: '#854d0e', border: '#facc15' };
    case 'rechazada':
      return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
    default:
      return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  }
};

const getStatusText = (status: string) => {
  // Si es usuario normal o invitado, no mostrar texto de estado
  if (isUser || userRole === 0) {
    return '';
  }
  
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
  // Función para obtener información de imágenes de un lugar
  const getPlaceImageInfo = (place: Place) => {
    const hasMainImage = place.image_url ? 1 : 0;
    const additionalCount = place.additional_images?.length || 0;
    const totalImages = hasMainImage + additionalCount;
    
    return {
      hasMainImage,
      additionalCount,
      totalImages
    };
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
        style={{ 
          backgroundColor: themed.accent as string,
          paddingHorizontal: 24, 
          paddingVertical: 16,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 }
        }}
      >
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
          {numericRouteId ? 'Sitios de la Ruta' : 'Mapa de Sitios'}
        </Text>
        {resolvedRouteName ? (
          <Text style={{ color: '#fff', opacity: 0.9, textAlign: 'center', marginTop: 4 }}>{resolvedRouteName}</Text>
        ) : null}
        {/* <Text style={{ color: '#fff', opacity: 0.8, textAlign: 'center', marginTop: 4, fontSize: 12 }}>
          {isAdmin ? 'Mostrando tus sitios (aprobados y pendientes)' : 'Mostrando sitios aprobados en el mapa'}
        </Text> */}
      </View>

      {/* 🔥 NUEVO: Alerta de lugares pendientes para técnicos */}
      {isAdmin && userHasPendingPlaces && (
        <View style={{ 
          marginHorizontal: 24, 
          marginTop: 16,
          backgroundColor: '#fed7aa', 
          borderWidth: 1, 
          borderColor: '#fdba74',
          borderRadius: 12, 
          padding: 12 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="information-circle" size={24} color="#ea580c" />
            <Text style={{ color: '#9a3412', fontWeight: '700', marginLeft: 8, flex: 1 }}>
              Tienes lugares pendientes de aprobación
            </Text>
          </View>
          <Text style={{ color: '#7c2d12', marginTop: 4, fontSize: 14 }}>
            No puedes crear nuevos lugares hasta que el administrador apruebe tus lugares pendientes.
          </Text>
        </View>
      )}

      {/* Acciones superiores */}
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        {/* <TouchableOpacity
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
        </TouchableOpacity> */}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* 🔥 MODIFICADO: Botón de crear con bloqueo */}
          {isAdmin && !userHasPendingPlaces && (
            <TouchableOpacity
              onPress={handleCreatePlace}
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

          {/* 🔥 NUEVO: Botón bloqueado cuando hay lugares pendientes */}
          {isAdmin && userHasPendingPlaces && (
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#fdba74',
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
              disabled={true}
            >
              <Ionicons name="add-circle" size={24} color="#9a3412" />
              <Text style={{ color: '#9a3412', fontWeight: '800', fontSize: 16 }}>Creación Bloqueada</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mapa */}
      <View
        style={{
          flex: 1,
          marginTop: 16,
          marginHorizontal: 24,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
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
          style={{ flex: 1, paddingHorizontal: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {visiblePlaces.length === 0 ? (
            <View
              style={{ 
                backgroundColor: themed.card, 
                borderWidth: 1, 
                borderColor: themed.border,
                borderRadius: 16,
                padding: 32,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="map-outline" size={48} color={themed.accent as string} />
              <Text style={{ color: themed.text, fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
                No hay lugares disponibles
              </Text>
              <Text style={{ color: themed.muted as string, textAlign: 'center', marginTop: 6 }}>
                {isAdmin 
                  ? userHasPendingPlaces
                    ? 'Tienes lugares pendientes de aprobación'
                    : 'Crea tu primer lugar para comenzar'
                  : 'No hay lugares aprobados para mostrar'
                }
              </Text>
            </View>
          ) : (
            visiblePlaces.map((place) => {
              const images = normalizeImages(place);
              const imageInfo = getPlaceImageInfo(place);
              const statusColors = getStatusColor(place.status);
              
              return (
                <View
                  key={place.id}
                  style={{ 
                    backgroundColor: themed.card, 
                    borderColor: themed.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 }
                  }}
                >
                  <View style={{ flexDirection: 'row' }}>
                    {/* Imágenes del lugar */}
                    {images.length > 0 ? (
                      <TouchableOpacity 
                        onPress={() => openImagesModal(place)}
                        style={{ width: 80, height: 80, marginRight: 12 }}
                      >
                        <Image 
                          source={{ uri: images[0] }} 
                          style={{ width: 80, height: 80, borderRadius: 12 }} 
                          resizeMode="cover"
                        />
                        {imageInfo.totalImages > 1 && (
                          <View style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8
                          }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                              +{imageInfo.totalImages - 1}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: 12, 
                        marginRight: 12,
                        backgroundColor: themed.softBg, 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Ionicons name="image-outline" size={28} color={themed.accent as string} />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ color: themed.text, fontWeight: '800', fontSize: 16, paddingRight: 8 }} numberOfLines={1}>
                          {place.name}
                        </Text>
                        <View style={{ 
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 999,
                          borderWidth: 1,
                          backgroundColor: statusColors.bg,
                          borderColor: statusColors.border
                        }}>
                          <Text style={{ 
                            color: statusColors.text,
                            fontSize: 12,
                            fontWeight: '700'
                          }}>
                            {getStatusText(place.status)}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: themed.muted as string, fontSize: 12, marginTop: 2 }}>
                        {new Date(place.createdAt).toLocaleDateString()} · {place.route_name || 'Sin ruta'}
                      </Text>

                      <Text style={{ color: themed.text, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                        {place.description}
                      </Text>

                      {/* 🔥 NUEVO: Mostrar comentario de rechazo si existe */}
                      {place.status === 'rechazada' && place.rejectionComment && (
                        <View style={{ 
                          backgroundColor: '#fef2f2', 
                          borderWidth: 1, 
                          borderColor: '#fecaca',
                          borderRadius: 8, 
                          padding: 8,
                          marginTop: 4
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                            <Text style={{ color: '#991b1b', fontWeight: '700', marginLeft: 4, flex: 1, fontSize: 12 }}>
                              Motivo del rechazo:
                            </Text>
                          </View>
                          <Text style={{ color: '#7f1d1d', marginTop: 2, fontSize: 11 }}>
                            {place.rejectionComment}
                          </Text>
                        </View>
                      )}

                      {/* Información de imágenes */}
                      {imageInfo.totalImages > 0 && (
                        <Text style={{ color: themed.muted as string, fontSize: 11, marginTop: 4 }}>
                          📷 {imageInfo.totalImages} imagen(es)
                          {imageInfo.hasMainImage && imageInfo.additionalCount > 0 ? 
                            ` (1 principal + ${imageInfo.additionalCount} adicionales)` : ''}
                        </Text>
                      )}

                      <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                          <Ionicons
                            name={place.user_liked ? 'heart' : 'heart-outline'}
                            size={14}
                            color={place.user_liked ? '#ef4444' : (themed.accent as string)}
                          />
                          <Text style={{ color: themed.muted as string, fontSize: 12, marginLeft: 4 }}>
                            {place.likes_count || 0}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="chatbubble-outline" size={14} color={themed.accent as string} />
                          <Text style={{ color: themed.muted as string, fontSize: 12, marginLeft: 4 }}>
                            {place.comments_count || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 🔥 MODIFICADO: Acciones con bloqueo para lugares rechazados */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {/* Ver detalles - SIEMPRE disponible */}
                    <TouchableOpacity
                      onPress={() => router.push(`/Place/details?id=${place.id}`)}
                      style={{
                        flex: 1,
                        backgroundColor: themed.softBg,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: themed.border,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Text style={{ color: themed.text, fontWeight: '700' }}>Ver detalles</Text>
                    </TouchableOpacity>

                    {isAdmin && (
                      <>
                        {/* Editar - BLOQUEADO si está rechazado */}
                         <TouchableOpacity
      onPress={() => router.push(`/Place/edit?id=${place.id}`)}
      style={{
        flex: 1,
        backgroundColor: themed.softBg,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: themed.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Ionicons name="create-outline" size={18} color="#3b82f6" />
      <Text style={{ color: themed.text, fontWeight: '700', marginLeft: 8 }}>
        Editar
      </Text>
    </TouchableOpacity>

                        {/* Eliminar - SIEMPRE disponible para técnicos */}
                       {/* En la sección de acciones del lugar, cambiar el onPress del botón eliminar: */}
{/* Eliminar - OCULTO cuando el lugar está aprobado para técnicos */}
{place.status !== 'aprobada' && (
  <TouchableOpacity
    onPress={() => deletePlace(place)}
    style={{
      flex: 1,
      backgroundColor: themed.softBg,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: themed.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <Ionicons name="trash-outline" size={18} color="#ef4444" />
    <Text style={{ color: themed.text, fontWeight: '700', marginLeft: 8 }}>Eliminar</Text>
  </TouchableOpacity>
)}
                      </>
                    )}

{isUser ? (
  <>
    {/* Like - PERMITIDO incluso cuando está rechazado */}
    <TouchableOpacity
      onPress={() => toggleLike(place.id)}
      style={{
        flex: 1,
        backgroundColor: themed.softBg,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: themed.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Ionicons 
        name={place.user_liked ? 'heart' : 'heart-outline'} 
        size={18} 
        color="#ec4899" 
      />
      <Text style={{ color: themed.text, fontWeight: '700', marginLeft: 8 }}>
        {place.user_liked ? 'Quitar' : 'Like'}
      </Text>
    </TouchableOpacity>

    {/* Comentarios - PERMITIDO incluso cuando está rechazado */}
    <TouchableOpacity
      onPress={() => router.push(`/Place/comments?id=${place.id}&name=${place.name}`)}
      style={{
        flex: 1,
        backgroundColor: themed.successBg,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: themed.successBorder,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Text style={{ color: themed.successText as string, fontWeight: '700' }}>
        Comentarios
      </Text>
    </TouchableOpacity>
  </>
) : (
  // Visitante: solo ver comentarios (PERMITIDO incluso cuando está rechazado)
  <TouchableOpacity
    onPress={() => router.push(`/Place/comments?id=${place.id}&name=${place.name}`)}
    style={{
      flex: 1,
      backgroundColor: themed.successBg,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: themed.successBorder,
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <Text style={{ color: themed.successText as string, fontWeight: '700' }}>
      Comentarios
    </Text>
  </TouchableOpacity>
)}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Modal de imágenes */}
      <Modal visible={imagesModalOpen} transparent animationType="fade" onRequestClose={() => setImagesModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 40, right: 16, zIndex: 10 }}
            onPress={() => setImagesModalOpen(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {currentPlaceImages.length > 0 && (
            <>
              <Image 
                source={{ uri: currentPlaceImages[currentImageIndex] }} 
                style={{ width: screenWidth - 32, height: screenWidth - 32, borderRadius: 16 }}
                resizeMode="contain"
              />
              
              <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
                {currentImageIndex + 1} / {currentPlaceImages.length}
              </Text>

              {currentPlaceImages.length > 1 && (
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentImageIndex === 0}
                    style={{ padding: 12, opacity: currentImageIndex === 0 ? 0.5 : 1 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setCurrentImageIndex(prev => Math.min(currentPlaceImages.length - 1, prev + 1))}
                    disabled={currentImageIndex === currentPlaceImages.length - 1}
                    style={{ padding: 12, opacity: currentImageIndex === currentPlaceImages.length - 1 ? 0.5 : 1 }}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Bottom sheet - MODIFICADO para mostrar comentario de rechazo */}
      <Modal visible={infoOpen} transparent animationType="slide" onRequestClose={() => setInfoOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View
            style={{ 
              backgroundColor: themed.card, 
              borderTopColor: themed.border,
              borderTopWidth: 1,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 16,
              maxHeight: '75%'
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 48, height: 6, backgroundColor: themed.border, borderRadius: 999 }} />
            </View>

            {selectedPlace && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: themed.text, fontSize: 20, fontWeight: '800', paddingRight: 8, flex: 1 }}>
                    {selectedPlace.name}
                  </Text>
                  <TouchableOpacity onPress={() => setInfoOpen(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={themed.accent as string} />
                  </TouchableOpacity>
                </View>

                <Text style={{ color: themed.muted as string, fontSize: 12, marginBottom: 8 }}>
                  {new Date(selectedPlace.createdAt).toLocaleDateString()} · Ruta:{' '}
                  {selectedPlace.route_name || resolvedRouteName || (numericRouteId ? `Ruta #${numericRouteId}` : '—')}
                </Text>

                {/* 🔥 NUEVO: Mostrar comentario de rechazo en el modal */}
                {selectedPlace.status === 'rechazada' && selectedPlace.rejectionComment && (
                  <View style={{ 
                    backgroundColor: '#fef2f2', 
                    borderWidth: 1, 
                    borderColor: '#fecaca',
                    borderRadius: 12, 
                    padding: 12,
                    marginBottom: 12
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                      <Text style={{ color: '#991b1b', fontWeight: '700', marginLeft: 8, flex: 1 }}>
                        Motivo del rechazo:
                      </Text>
                    </View>
                    <Text style={{ color: '#7f1d1d', marginTop: 4, fontSize: 14 }}>
                      {selectedPlace.rejectionComment}
                    </Text>
                  </View>
                )}

                {isUser && selectedPlace.status !== 'rechazada' && (
                  <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                    <TouchableOpacity onPress={() => toggleLike(selectedPlace.id)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
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
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={themed.accent as string} />
                      <Text style={{ color: themed.text, fontWeight: '600', marginLeft: 6 }}>
                        {selectedPlace.comments_count || 0} comentarios
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedPlace.schedules && selectedPlace.schedules.length > 0 && (
                  <View style={{ 
                    marginBottom: 12, 
                    borderRadius: 12, 
                    padding: 12, 
                    borderWidth: 1, 
                    backgroundColor: themed.softBg, 
                    borderColor: themed.border 
                  }}>
                    <Text style={{ color: themed.text, fontWeight: '800', fontSize: 13, marginBottom: 6 }}>🕒 Horario de atención</Text>
                    {getFullSchedule(selectedPlace.schedules)}
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  {selectedPlace.image_url ? (
                    <TouchableOpacity onPress={() => openImagesModal(selectedPlace)}>
                      <Image source={{ uri: selectedPlace.image_url }} style={{ width: 80, height: 80, borderRadius: 12, marginRight: 12 }} />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: 12, 
                      marginRight: 12,
                      backgroundColor: themed.softBg, 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Ionicons name="image-outline" size={28} color={themed.accent as string} />
                    </View>
                  )}
                  <Text style={{ color: themed.text, flex: 1 }} numberOfLines={4}>
                    {selectedPlace.description}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setInfoOpen(false);
                      router.push(`/Place/details?id=${selectedPlace.id}`);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: themed.softBg,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: themed.border,
                      alignItems: 'center'
                    }}
                  >
                    <Ionicons name={selectedPlace.website ? 'globe-outline' : 'eye-outline'} size={20} color={themed.accent as string} />
                    <Text style={{ color: themed.text, fontWeight: '700', marginTop: 4 }}>
                      {selectedPlace.website ? 'Sitio / Más' : 'Ver detalles'}
                    </Text>
                  </TouchableOpacity>

                  {selectedPlace.phoneNumber && selectedPlace.status !== 'rechazada' ? (
                    <TouchableOpacity
                      onPress={() => {
                        setInfoOpen(false);
                        router.push(`/Place/details?id=${selectedPlace.id}`);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: themed.softBg,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: themed.border,
                        alignItems: 'center'
                      }}
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
                  style={{
                    paddingVertical: 16,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: themed.accent as string
                  }}
                >
                  <Ionicons name="information-circle-outline" size={22} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Abrir ficha completa</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
                setPlaceToDelete(null);
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
              onPress={confirmDeletePlace}
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
    </View>
  );
}