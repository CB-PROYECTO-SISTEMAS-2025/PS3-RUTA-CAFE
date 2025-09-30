// app/Place/index.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
  createdBy?: number; // <-- usado para filtrar por técnico
}

interface UserData {
  role: number;
  id: number;
}

export default function PlacesMapScreen() {
  const router = useRouter();
  const { routeId, routeName } = useLocalSearchParams<{ routeId?: string; routeName?: string }>();
  const numericRouteId = useMemo(() => (routeId ? Number(routeId) : undefined), [routeId]);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<number>(3);
  const [userId, setUserId] = useState<number>(0);

  // Modal/bottom sheet
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const isAdmin = userRole === 2;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [numericRouteId]);

  const loadUser = async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const user: UserData = JSON.parse(raw);
        setUserRole(user.role || 3);
        setUserId(user.id || 0);
      }
    } catch {
      setUserRole(3);
      setUserId(0);
    }
  };

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const base = process.env.EXPO_PUBLIC_API_URL;
      const url = numericRouteId
        ? `${base}/api/places/route/${numericRouteId}`
        : `${base}/api/places`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Error al cargar los lugares');

      const data: Place[] = await res.json();

      // Normaliza coords y descarta inválidas
      const normalized = data
        .map(p => ({
          ...p,
          latitude: typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude,
          longitude: typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude,
        }))
        .filter(
          p =>
            typeof p.latitude === 'number' &&
            typeof p.longitude === 'number' &&
            !isNaN(p.latitude) &&
            !isNaN(p.longitude)
        );

      setPlaces(normalized);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los lugares');
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaces();
  };

  // === FILTRO SEGÚN ROL ===
  // Técnico (rol 2): SOLO lugares creados por él (cualquier estado).
  // Usuario (rol 3): SOLO aprobados (de cualquiera).
  const visiblePlaces = useMemo(() => {
    if (isAdmin) {
      return places.filter(p => p.createdBy === userId);
    }
    return places.filter(p => p.status === 'aprobada');
  }, [isAdmin, places, userId]);

  const resolvedRouteName =
    routeName ||
    (visiblePlaces.length > 0 ? visiblePlaces[0].route_name : undefined) ||
    (numericRouteId ? `Ruta #${numericRouteId}` : undefined);

  // HTML Leaflet (los markers envían el id por postMessage)
  const getMapHtml = () => {
    const fallbackLat = -17.3939;
    const fallbackLng = -66.1568;

    const centerLat = (visiblePlaces[0]?.latitude as number) ?? fallbackLat;
    const centerLng = (visiblePlaces[0]?.longitude as number) ?? fallbackLng;

    // Solo campos necesarios para el mapa
    const payload = visiblePlaces.map(p => ({
      id: p.id,
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
      desc: (p.description || '').slice(0, 80),
      img: p.image_url || '',
    }));

    const safeJson = JSON.stringify(payload)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html,body,#map { height: 100%; margin: 0; }
          .coffee-pin {
            background: white;
            border-radius: 999px;
            border: 2px solid #ea580c;
            width: 34px; height: 34px;
            display:flex; align-items:center; justify-content:center;
            box-shadow: 0 2px 8px rgba(234,88,12,0.35);
            font-size: 18px;
          }
          .popup-title{font-weight:700;color:#1f2937;margin-bottom:4px}
          .popup-desc{color:#6b7280}
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const places = ${safeJson};
          const map = L.map('map').setView([${centerLat}, ${centerLng}], ${visiblePlaces.length ? 13 : 12});

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          const icon = L.divIcon({
            className: 'coffee-pin',
            html: '☕',
            iconSize: [34,34],
            iconAnchor: [17,17]
          });

          places.forEach(p => {
            const m = L.marker([p.lat, p.lng], {icon}).addTo(map);
            m.bindPopup(
              '<div class="popup"><div class="popup-title">' + (p.name || 'Sitio') + '</div>' +
              '<div class="popup-desc">' + (p.desc || '') + '</div></div>'
            );
            m.on('click', () => {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(String(p.id));
            });
          });

          if (places.length > 1) {
            const group = L.featureGroup(places.map(p => L.marker([p.lat, p.lng])));
            map.fitBounds(group.getBounds().pad(0.2));
          }
        </script>
      </body>
      </html>
    `;
  };

  const onMarkerMessage = (e: any) => {
    const idStr = e?.nativeEvent?.data;
    const id = idStr ? Number(idStr) : NaN;
    if (!isNaN(id)) {
      const found = visiblePlaces.find(p => p.id === id);
      if (found) {
        setSelectedPlace(found);
        setInfoOpen(true);
      }
    }
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

        {isAdmin && (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/Place/create',
                params: numericRouteId
                  ? { routeId: String(numericRouteId), routeName: resolvedRouteName }
                  : undefined,
              })
            }
            className="bg-orange-500 py-4 rounded-2xl shadow-lg flex-row items-center justify-center"
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">Crear Nuevo Lugar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mapa */}
      <View className="flex-1 mt-4 mx-6 mb-6 rounded-2xl overflow-hidden border border-orange-200 shadow">
        <WebView
          source={{ html: getMapHtml() }}
          onMessage={onMarkerMessage}
          startInLoadingState
          renderLoading={() => (
            <View className="flex-1 justify-center items-center bg-orange-50">
              <ActivityIndicator size="large" color="#ea580c" />
              <Text className="text-orange-600 mt-2">Cargando mapa...</Text>
            </View>
          )}
        />
      </View>

      {/* Pull-to-refresh “ligero” */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={{ display: 'none' }}
      />

      {/* Bottom sheet / panel de info */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="bg-white rounded-t-3xl p-4 border-t border-orange-200">
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
                    onPress={() => router.push(`/Place/details?id=${selectedPlace.id}`)}
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

                  {selectedPlace.phoneNumber ? (
                    <TouchableOpacity
                      onPress={() => router.push(`/Place/details?id=${selectedPlace.id}`)}
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
