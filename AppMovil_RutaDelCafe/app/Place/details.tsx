// app/Place/details.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import WebView from 'react-native-webview';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface Schedule {
  id?: number;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
}

interface Place {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  route_id: number;
  website?: string;
  phoneNumber?: string;

  // Campos de imágenes actualizados
  image_url?: string | null;
  additional_images?: Array<{
    id: number;
    place_id: number;
    image_url: string;
    created_at: string;
  }>;

  status: string;
  schedules?: Schedule[];
  is_favorite?: boolean;
  favorite_count?: number;
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

// Normaliza cualquier forma de imágenes que venga del backend a string[]
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

  // Backward compatibility con sistemas anteriores
  if (!imgs.length && Array.isArray((p as any).images)) {
    imgs = (p as any).images
      .map((it: any) =>
        typeof it === 'string' ? it : (it?.url || it?.image_url || it?.path || '')
      )
      .filter(Boolean);
  }
  if (!imgs.length && Array.isArray((p as any).images_urls)) {
    imgs = (p as any).images_urls.filter(Boolean);
  }
  if (!imgs.length && Array.isArray((p as any).photos)) {
    imgs = (p as any).photos
      .map((it: any) => (typeof it === 'string' ? it : (it?.url || '')))
      .filter(Boolean);
  }

  return imgs.slice(0, 9); // Máximo 9 imágenes (1 principal + 8 adicionales)
};

export default function PlaceDetailsScreen() {
  const themed = useThemedStyles();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<Place | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // carrusel
  const screenWidth = Dimensions.get('window').width;
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const placeId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;

  useEffect(() => {
    if (placeId) fetchPlace();
    else {
      Alert.alert('Error', 'ID del lugar no válido');
      safeGoBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  const fetchPlace = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places/${placeId}`, { headers });
      if (!response.ok) throw new Error('Error al cargar el lugar');

      const placeData = await response.json();
      console.log('📱 Datos del lugar recibidos:', {
        image_url: placeData.image_url,
        additional_images_count: placeData.additional_images?.length || 0,
        additional_images: placeData.additional_images
      });

      // Normaliza imágenes a array
      const imgs = normalizeImages(placeData);
      setImages(imgs);

      if (token) {
        const favRes = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/favorites/check/${placeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (favRes.ok) {
          const fav = await favRes.json();
          setPlace({
            ...placeData,
            is_favorite: !!fav.data.is_favorite,
            favorite_count: typeof fav.data.favorite_count === 'number' ? fav.data.favorite_count : 0,
          });
          return;
        }
      }
      setPlace(placeData);
    } catch (e) {
      console.error('Error fetching place:', e);
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
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/favorites/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: place.id }),
      });
      if (!res.ok) throw new Error('Error al actualizar favoritos');
      const result = await res.json();
      setPlace(prev =>
        prev
          ? {
              ...prev,
              is_favorite: !!result.data.is_favorite,
              favorite_count: result.data.is_favorite
                ? (prev.favorite_count || 0) + 1
                : Math.max((prev.favorite_count || 1) - 1, 0),
            }
          : null
      );
      Alert.alert('Éxito', result.data.is_favorite ? 'Lugar agregado a favoritos' : 'Lugar eliminado de favoritos');
    } catch (e) {
      console.error('Error toggling favorite:', e);
      Alert.alert('Error', 'No se pudo actualizar favoritos');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const safeGoBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/advertisement');
  };

  const handleWebsitePress = () => {
    if (!place?.website) return;
    let url = place.website.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el sitio web'));
  };

  const handlePhonePress = () => {
    if (!place?.phoneNumber) return;
    const clean = place.phoneNumber.replace(/[^\d+]/g, '');
    if (!clean) return;
    Linking.openURL(`tel:${clean}`).catch(() => Alert.alert('Error', 'No se pudo realizar la llamada'));
  };

  const handleDirectionsPress = () => {
    if (!place?.latitude || !place?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir la aplicación de mapas'));
  };

  const getScheduleSummary = () => {
    if (!place?.schedules || place.schedules.length === 0) return 'Horario no disponible';
    const openDays = place.schedules;
    const first = openDays[0];
    const allSame = openDays.every(
      d => d.openTime.slice(0, 5) === first.openTime.slice(0, 5) && d.closeTime.slice(0, 5) === first.closeTime.slice(0, 5)
    );
    if (openDays.length === 7 && allSame) return `Lun-Dom: ${first.openTime.slice(0, 5)} - ${first.closeTime.slice(0, 5)}`;
    return `${openDays.length} días con horario configurado`;
  };

  const getDaySchedule = (dayKey: string) => place?.schedules?.find(s => s.dayOfWeek === dayKey) || null;

  const getLeafletMapHTML = () => {
    if (!place?.latitude || !place?.longitude) {
      return `
        <!DOCTYPE html><html><head><meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fed7aa}
        .e{color:#ea580c;font-family:Arial;text-align:center;padding:20px}</style></head>
        <body><div class="e"><h3>Ubicación no disponible</h3><p>No hay coordenadas para mostrar el mapa</p></div></body></html>`;
    }

    const escape = (s: string) =>
      s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    const escapedName = escape(place.name || '');
    const escapedDescription = escape((place.description || '').substring(0, 50));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <style>
          body{margin:0} #map{height:100vh;width:100%}
          .custom-marker{background:#ea580c;border:3px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 8px rgba(234,88,12,.4)}
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          try{
            const map=L.map('map').setView([${place.latitude},${place.longitude}],15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
            const icon=L.divIcon({className:'custom-marker',iconSize:[20,20],iconAnchor:[10,10]});
            L.marker([${place.latitude},${place.longitude}],{icon}).addTo(map).bindPopup('<b>${escapedName}</b><br>${escapedDescription}...').openPopup();
            L.circle([${place.latitude},${place.longitude}],{color:'#ea580c',fillColor:'#fed7aa',fillOpacity:.2,radius:100}).addTo(map);
          }catch(e){document.body.innerHTML='<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#fed7aa;color:#ea580c;font-family:Arial;text-align:center;padding:20px;"><h3>Error al cargar el mapa</h3></div>'}
        </script>
      </body>
      </html>
    `;
  };

  const formatCoordinate = (coord: any): string => {
    if (coord === undefined || coord === null || coord === '') return 'N/A';
    const num = typeof coord === 'string' ? parseFloat(coord) : coord;
    if (isNaN(num)) return 'N/A';
    return num.toFixed(6);
  };

  const onScrollImages = (e: any) => {
    const x = e.nativeEvent.contentOffset.x || 0;
    const index = Math.round(x / screenWidth);
    setCurrentIndex(index);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const scrollTo = (index: number) => {
    setCurrentIndex(index);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    });
  };

  // Función para obtener información de imágenes
  const getImageInfo = () => {
    const hasMainImage = place?.image_url ? 1 : 0;
    const additionalCount = place?.additional_images?.length || 0;
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
        <Text style={{ color: themed.muted as string, marginTop: 16, fontWeight: '700' }}>Cargando información...</Text>
      </View>
    );
  }

  if (!place) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}>
        <Ionicons name="alert-circle" size={64} color={themed.accent as string} />
        <Text style={{ color: themed.muted as string, fontSize: 18, fontWeight: '800', marginTop: 12 }}>Lugar no encontrado</Text>
        <TouchableOpacity
          onPress={safeGoBack}
          style={{ backgroundColor: themed.accent as string, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageInfo = getImageInfo();

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: themed.accent,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 12,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>Detalles del Lugar</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Carrusel de imágenes + favoritos */}
        <View style={{ paddingHorizontal: 24, marginTop: 16, position: 'relative' }}>
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: themed.border,
              backgroundColor: themed.card,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            {images.length > 0 ? (
              <>
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={onScrollImages}
                  scrollEventThrottle={16}
                >
                  {images.map((uri, idx) => (
                    <TouchableOpacity key={`${uri}-${idx}`} activeOpacity={0.9} onPress={() => openLightbox(idx)}>
                      <Image source={{ uri }} style={{ width: screenWidth - 48, height: 260 }} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Indicadores */}
                <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 }}>
                    {images.map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          marginHorizontal: 4,
                          backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}
                      />
                    ))}
                  </View>
                </View>

                {/* Contador de imágenes */}
                <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {currentIndex + 1} / {images.length}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ width: '100%', height: 240, backgroundColor: themed.softBg, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="image-outline" size={72} color={themed.accent as string} />
                <Text style={{ color: themed.muted as string, marginTop: 8, fontWeight: '600' }}>Sin imágenes disponibles</Text>
              </View>
            )}

            {/* Botón favoritos */}
            <TouchableOpacity
              onPress={toggleFavorite}
              disabled={favoriteLoading}
              style={{ position: 'absolute', top: 12, right: 12, backgroundColor: themed.card, padding: 10, borderRadius: 999, borderWidth: 1, borderColor: themed.border }}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color={themed.accent as string} />
              ) : (
                <Ionicons name={place.is_favorite ? 'heart' : 'heart-outline'} size={22} color={place.is_favorite ? '#ef4444' : (themed.accent as string)} />
              )}
            </TouchableOpacity>
          </View>

          {/* Información de imágenes */}
          {imageInfo.totalImages > 0 && (
            <View style={{ marginTop: 8, padding: 12, backgroundColor: themed.softBg, borderRadius: 12 }}>
              <Text style={{ color: themed.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                📷 {imageInfo.totalImages} imagen(es) - 
                {imageInfo.hasMainImage ? ' 1 principal' : ''}
                {imageInfo.additionalCount > 0 ? ` + ${imageInfo.additionalCount} adicional(es)` : ''}
              </Text>
            </View>
          )}

          {/* Miniaturas */}
          {images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {images.map((uri, idx) => (
                <TouchableOpacity
                  key={`thumb-${uri}-${idx}`}
                  onPress={() => scrollTo(idx)}
                  style={{
                    marginRight: 8,
                    borderWidth: 2,
                    borderColor: idx === currentIndex ? (themed.accent as string) : 'transparent',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <Image source={{ uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                  {idx === 0 && place.image_url && (
                    <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>PRIN</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Info */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          {/* Título + estado + contador */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ color: themed.text, fontSize: 26, fontWeight: '900', flex: 1, paddingRight: 8 }}>{place.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themed.softBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Ionicons name="heart" size={16} color="#ef4444" />
                <Text style={{ color: themed.text, fontWeight: '700', marginLeft: 6, fontSize: 12 }}>{place.favorite_count || 0}</Text>
              </View>
            </View>

            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                backgroundColor:
                  place.status === 'aprobada' ? (themed.isDark ? '#052e16' : '#ecfdf5') : place.status === 'pendiente' ? (themed.isDark ? '#422006' : '#fef3c7') : (themed.isDark ? '#3f0a0a' : '#fee2e2'),
                borderColor:
                  place.status === 'aprobada' ? (themed.isDark ? '#166534' : '#86efac') : place.status === 'pendiente' ? (themed.isDark ? '#854d0e' : '#facc15') : (themed.isDark ? '#991b1b' : '#fca5a5'),
              }}
            >
              <Text
                style={{
                  color:
                    place.status === 'aprobada' ? (themed.isDark ? '#86efac' : '#166534') : place.status === 'pendiente' ? (themed.isDark ? '#facc15' : '#854d0e') : (themed.isDark ? '#fca5a5' : '#991b1b'),
                  fontWeight: '800',
                  fontSize: 12,
                }}
              >
                {place.status?.toUpperCase() || 'SIN ESTADO'}
              </Text>
            </View>
          </View>

          {/* Descripción */}
          <View style={{ backgroundColor: themed.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: themed.border, marginBottom: 16 }}>
            <Text style={{ color: themed.text, fontSize: 16, fontWeight: '800', marginBottom: 8 }}>Descripción</Text>
            <Text style={{ color: themed.text }}>{place.description}</Text>
          </View>

          {/* Horario */}
          <View style={{ backgroundColor: themed.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: themed.border, marginBottom: 16 }}>
            <Text style={{ color: themed.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>Horario de Atención</Text>
            <Text style={{ color: themed.muted as string, marginBottom: 8 }}>{getScheduleSummary()}</Text>

            {place.schedules && place.schedules.length > 0 && (
              <View>
                {DAYS_OF_WEEK.map(day => {
                  const ds = getDaySchedule(day.key);
                  return (
                    <View key={day.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: themed.border }}>
                      <Text style={{ color: themed.text, fontWeight: '700', flex: 1 }}>{day.label}</Text>
                      {ds ? (
                        <Text style={{ color: themed.successText as string, fontWeight: '800' }}>
                          {ds.openTime.slice(0, 5)} - {ds.closeTime.slice(0, 5)}
                        </Text>
                      ) : (
                        <Text style={{ color: themed.danger, fontWeight: '800' }}>Cerrado</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Mapa */}
          <View style={{ backgroundColor: themed.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: themed.border, marginBottom: 16 }}>
            <View style={{ height: 256 }}>
              <WebView
                source={{ html: getLeafletMapHTML() }}
                style={{ flex: 1 }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}>
                    <ActivityIndicator size="large" color={themed.accent as string} />
                    <Text style={{ color: themed.muted as string, marginTop: 8 }}>Cargando mapa...</Text>
                  </View>
                )}
              />
            </View>
            <View style={{ padding: 12, backgroundColor: themed.softBg, borderTopWidth: 1, borderTopColor: themed.border }}>
              <Text style={{ color: themed.muted as string, fontSize: 12, textAlign: 'center' }}>
                Vista Estándar — Marcador naranja muestra la ubicación exacta
              </Text>
            </View>
          </View>

          {/* Acciones rápidas */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity
              disabled={!place.website}
              onPress={handleWebsitePress}
              style={{
                flex: 1,
                opacity: place.website ? 1 : 0.5,
                backgroundColor: themed.softBg,
                marginHorizontal: 4,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Ionicons name="globe-outline" size={22} color={themed.accent as string} />
              <Text style={{ color: themed.text, fontWeight: '700', marginTop: 6 }}>Sitio Web</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!place.phoneNumber}
              onPress={handlePhonePress}
              style={{
                flex: 1,
                opacity: place.phoneNumber ? 1 : 0.5,
                backgroundColor: themed.softBg,
                marginHorizontal: 4,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Ionicons name="call-outline" size={22} color={themed.accent as string} />
              <Text style={{ color: themed.text, fontWeight: '700', marginTop: 6 }}>Llamar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDirectionsPress}
              style={{
                flex: 1,
                backgroundColor: themed.softBg,
                marginHorizontal: 4,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Ionicons name="navigate-outline" size={22} color={themed.accent as string} />
              <Text style={{ color: themed.text, fontWeight: '700', marginTop: 6 }}>Cómo llegar</Text>
            </TouchableOpacity>
          </View>

          {/* Coordenadas */}
          <View style={{ backgroundColor: themed.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: themed.border }}>
            <Text style={{ color: themed.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>Coordenadas GPS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themed.softBg, borderRadius: 12, padding: 12 }}>
              <Ionicons name="location-outline" size={22} color={themed.accent as string} />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ color: themed.text, fontWeight: '700' }}>Latitud: {formatCoordinate(place.latitude)}</Text>
                <Text style={{ color: themed.text, fontWeight: '700' }}>Longitud: {formatCoordinate(place.longitude)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={safeGoBack}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: themed.accent as string, paddingVertical: 12, borderRadius: 12, marginTop: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Lightbox de imágenes */}
      <Modal visible={lightboxOpen} transparent animationType="fade" onRequestClose={() => setLightboxOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <View style={{ position: 'absolute', top: 40, right: 16, zIndex: 10 }}>
            <TouchableOpacity onPress={() => setLightboxOpen(false)} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999 }}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: lightboxIndex * screenWidth, y: 0 }}
          >
            {images.map((uri, idx) => (
              <View key={`lb-${uri}-${idx}`} style={{ width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri }} style={{ width: screenWidth, height: screenWidth, resizeMode: 'contain' }} />
                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 10 }}>
                  {idx + 1} / {images.length} 
                  {idx === 0 && place.image_url ? ' (Imagen Principal)' : ''}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}