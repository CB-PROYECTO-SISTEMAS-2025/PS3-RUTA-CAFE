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
import { useThemedStyles } from '../../hooks/useThemedStyles';

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
  const themed = useThemedStyles(); // 🎨 tema
  const { id } = params;

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<number>(0); // 0 visitante
  const [userId, setUserId] = useState<number>(0);

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
        setUserId(user.id || 0);
      } else {
        setUserRole(0);
        setUserId(0);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserRole(0);
      setUserId(0);
    }
  };

  const fetchRouteDetails = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          Alert.alert('Error', 'Ruta no encontrada');
        } else {
          throw new Error('Error al cargar los detalles de la ruta');
        }
      } else {
        const routeData = await response.json();
        setRoute(routeData);
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

    Alert.alert('Eliminar Ruta', '¿Estás seguro de que quieres eliminar esta ruta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
              Alert.alert('Error', 'No tienes permisos para eliminar rutas');
              return;
            }

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${route.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
              Alert.alert('Éxito', 'Ruta eliminada correctamente');
              router.back();
            } else {
              throw new Error('Error al eliminar la ruta');
            }
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la ruta');
            console.error('Error deleting route:', error);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!route) return;

    try {
      const shareMessage = `¡Descubre esta increíble ruta gastronómica! 🍽️\n\n**${route.name}**\n\n${route.description}\n\n¡Ven y disfruta de esta experiencia única! ☕`;

      await Share.share({
        message: shareMessage,
        title: `Compartir: ${route.name}`,
        url: route.image_url && route.image_url !== '19' ? route.image_url : undefined,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir la ruta');
      console.error('Error sharing:', error);
    }
  };

  const handleStartRoute = () => {
    if (!route) return;

    Alert.alert('Comenzar Ruta', `¿Estás listo para comenzar la ruta "${route.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: '¡Vamos!',
        onPress: () => {
          const mapsUrl = 'https://www.google.com/maps';
          Linking.openURL(mapsUrl).catch(() => {
            Alert.alert('Error', 'No se pudo abrir la aplicación de mapas');
          });
        },
      },
    ]);
  };

  const handleSaveToFavorites = async () => {
    if (!route) return;

    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar rutas en favoritos.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ]);
        return;
      }

      const favoritesKey = 'userFavorites';
      const existingFavorites = await AsyncStorage.getItem(favoritesKey);
      let favorites = existingFavorites ? JSON.parse(existingFavorites) : [];

      const isAlreadyFavorite = favorites.some((fav: any) => fav.id === route.id);
      if (isAlreadyFavorite) {
        Alert.alert('Información', 'Esta ruta ya está en tus favoritos');
        return;
      }

      favorites.push({
        id: route.id,
        name: route.name,
        description: route.description,
        image_url: route.image_url,
        addedAt: new Date().toISOString(),
      });

      await AsyncStorage.setItem(favoritesKey, JSON.stringify(favorites));
      Alert.alert('¡Éxito!', 'Ruta guardada en tus favoritos ❤️');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar en favoritos');
      console.error('Error saving favorite:', error);
    }
  };

  // 🎨 helpers de estilo según estado
  const pillStyles = (status: string) => {
    if (status === 'aprobada') {
      return {
        bg: themed.isDark ? '#052e1a' : '#d1fae5',
        border: '#10b981',
        text: themed.isDark ? '#6ee7b7' : '#065f46',
        icon: '#16a34a',
      };
    }
    if (status === 'rechazada') {
      return {
        bg: themed.isDark ? '#2f0b0b' : '#fee2e2',
        border: '#ef4444',
        text: themed.isDark ? '#fecaca' : '#7f1d1d',
        icon: '#dc2626',
      };
    }
    return {
      bg: themed.isDark ? '#341a05' : '#ffedd5',
      border: '#f59e0b',
      text: themed.isDark ? '#fde68a' : '#7c2d12',
      icon: '#ea580c',
    };
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return 'Pendiente de Aprobación';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprobada':
        return 'checkmark-circle';
      case 'rechazada':
        return 'close-circle';
      default:
        return 'time';
    }
  };

  const isAdmin = userRole === 2; // conservado

  // 👇 AGREGAR ESTAS LÍNEAS para definir los roles adicionales
const isSuperAdmin = userRole === 1; // administrador
const isUser = userRole === 3;
const isVisitor = userRole === 0;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}>
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ color: themed.accent, marginTop: 16 }}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}>
        <Ionicons name="alert-circle" size={64} color={themed.accent as string} />
        <Text style={{ color: themed.text, fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>
          Ruta no encontrada
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: themed.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Volver atrás</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pill = pillStyles(route.status);

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: themed.accent,
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Detalles de la Ruta</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {route.image_url && route.image_url !== '19' ? (
          <Image
            source={{ uri: route.image_url }}
            style={{ width: '100%', height: 192, borderRadius: 16, marginBottom: 16 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 192,
              borderRadius: 16,
              marginBottom: 16,
              backgroundColor: themed.isDark ? '#1f2937' : '#fde68a',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="cafe-outline" size={64} color={themed.accent as string} />
            <Text style={{ color: themed.text, marginTop: 8 }}>Imagen no disponible</Text>
          </View>
        )}

        {/* Card info */}
        <View
          style={{
            backgroundColor: themed.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: themed.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: 'bold', fontSize: 22, flex: 1, marginRight: 12 }}>
              {route.name}
            </Text>
{/* 👇 SOLO mostrar el badge si NO es usuario normal o invitado */}
{(isAdmin || isSuperAdmin) && (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: pill.bg,
      borderColor: pill.border,
    }}
  >
    <Ionicons name={getStatusIcon(route.status)} size={16} color={pill.icon} />
    <Text style={{ color: pill.text, fontWeight: '700', marginLeft: 6, fontSize: 12 }}>
      {getStatusText(route.status)}
    </Text>
  </View>
)}
          </View>

          <Text style={{ color: themed.muted, lineHeight: 22, marginBottom: 12 }}>{route.description}</Text>

          {isAdmin && (
            <View style={{ borderTopWidth: 1, borderTopColor: themed.border, paddingTop: 12 }}>
              <Text style={{ color: themed.text, fontWeight: '600', fontSize: 16, marginBottom: 8 }}>
                Información Administrativa
              </Text>
              <Text style={{ color: themed.muted, marginBottom: 6 }}>
                <Text style={{ color: themed.text, fontWeight: '600' }}>Fecha de creación: </Text>
                {new Date(route.createdAt).toLocaleDateString('es-ES')}
              </Text>
              {route.modifiedAt && (
                <Text style={{ color: themed.muted }}>
                  <Text style={{ color: themed.text, fontWeight: '600' }}>Última modificación: </Text>
                  {new Date(route.modifiedAt).toLocaleDateString('es-ES')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Botones */}
        <View style={{ marginTop: 16, marginBottom: 24 }}>
          {!isAdmin && (
            <>
              <TouchableOpacity
                onPress={handleStartRoute}
                style={{
                  backgroundColor: themed.accent,
                  paddingVertical: 16,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  marginBottom: 12,
                  elevation: 3,
                }}
              >
                <Ionicons name="cafe" size={24} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginLeft: 8 }}>
                  Comenzar Ruta
                </Text>
              </TouchableOpacity>

              {/* Favoritos (mantengo la lógica por si la reactivas) */}
              {false && (
                <TouchableOpacity
                  onPress={handleSaveToFavorites}
                  style={{
                    backgroundColor: themed.isDark ? '#0b1220' : '#fff7ed',
                    borderColor: themed.accent,
                    borderWidth: 1,
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    marginBottom: 10,
                  }}
                >
                  <Ionicons name="heart" size={22} color={themed.accent as string} />
                  <Text style={{ color: themed.accent, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                    Agregar a Favoritos
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleShare}
                style={{
                  backgroundColor: themed.isDark ? '#0b1220' : '#fff7ed',
                  borderColor: themed.accent,
                  borderWidth: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  marginBottom: 10,
                }}
              >
                <Ionicons name="share-social" size={22} color={themed.accent as string} />
                <Text style={{ color: themed.accent, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                  Compartir Ruta
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: themed.isDark ? '#111827' : '#f3f4f6',
              borderColor: themed.isDark ? '#1f2937' : '#d1d5db',
              borderWidth: 1,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
          >
            <Ionicons name="arrow-back" size={18} color={themed.muted as string} />
            <Text style={{ color: themed.muted, fontWeight: '600', fontSize: 15, marginLeft: 8 }}>
              Volver a Rutas
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
