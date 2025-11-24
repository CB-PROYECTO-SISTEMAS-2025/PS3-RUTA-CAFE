// app/Place/favorites.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface FavoritePlace {
  id: number;
  place_id: number;
  place_name: string;
  place_description: string;
  latitude: number;
  longitude: number;
  route_id: number;
  website?: string;
  phoneNumber?: string;
  image_url?: string;
  status: string;
  route_name?: string;
  createdat: string;
}

export default function FavoritesScreen() {
  const themed = useThemedStyles();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/favorites/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.data || []);
      } else {
        throw new Error('Error al cargar favoritos');
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'No se pudieron cargar los lugares favoritos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const removeFavorite = async (placeId: number) => {
    Alert.alert(
      'Eliminar de favoritos',
      '¿Estás seguro de que quieres eliminar este lugar de tus favoritos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/favorites`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ place_id: placeId }),
              });
              if (response.ok) {
                Alert.alert('Éxito', 'Lugar eliminado de favoritos');
                loadFavorites();
              } else {
                throw new Error('Error al eliminar favorito');
              }
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo eliminar el lugar de favoritos');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}>
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ color: themed.muted as string, marginTop: 12 }}>Cargando favoritos...</Text>
      </View>
    );
    }

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header - SIN la barra naranja con texto negro */}
      <View style={{
        backgroundColor: themed.accent,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>Mis Favoritos</Text>
        <Text style={{ color: '#fff', opacity: 0.9, textAlign: 'center', marginTop: 4 }}>
          {favorites.length} lugar{favorites.length !== 1 ? 'es' : ''} guardado{favorites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Botón volver */}
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
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
          }}
        >
          <Ionicons name="arrow-back" size={22} color={themed.accent as string} />
          <Text style={{ color: themed.accent as string, fontWeight: '700' }}>Volver</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: themed.card,
            borderRadius: 16,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: themed.border,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            flexDirection: 'row',
            gap: 12
          }}>
            {/* Imagen */}
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={{ width: 80, height: 80, borderRadius: 12 }} />
            ) : (
              <View style={{
                width: 80, height: 80, borderRadius: 12, backgroundColor: themed.softBg,
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Ionicons name="image-outline" size={28} color={themed.accent as string} />
              </View>
            )}

            {/* Info */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text
                  style={{ color: themed.text, fontWeight: '800', fontSize: 16, flex: 1, paddingRight: 8 }}
                  numberOfLines={1}
                >
                  {item.place_name}
                </Text>
                <TouchableOpacity onPress={() => removeFavorite(item.place_id)} style={{ padding: 4 }}>
                  <Ionicons name="heart" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: themed.muted as string, fontSize: 12, marginTop: 2 }}>
                Agregado el {formatDate(item.createdat)} · {item.route_name || 'Sin ruta'}
              </Text>

              <Text style={{ color: themed.text, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                {item.place_description}
              </Text>

              {/* Acciones */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/Place/details?id=${item.place_id}`)}
                  style={{
                    flex: 1, backgroundColor: themed.softBg, paddingVertical: 8, borderRadius: 10,
                    borderWidth: 1, borderColor: themed.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
                  }}
                >
                  <Ionicons name="eye-outline" size={16} color={themed.accent as string} />
                  <Text style={{ color: themed.text, fontWeight: '700', fontSize: 12 }}>Ver detalles</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push(`/Place/comments?id=${item.place_id}&name=${encodeURIComponent(item.place_name)}`)}
                  style={{
                    flex: 1, backgroundColor: themed.successBg, paddingVertical: 8, borderRadius: 10,
                    borderWidth: 1, borderColor: themed.successBorder, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={themed.successText as string} />
                  <Text style={{ color: themed.successText as string, fontWeight: '700', fontSize: 12 }}>Comentarios</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{
            backgroundColor: themed.card,
            borderRadius: 16,
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: themed.border,
            marginTop: 24
          }}>
            <Ionicons name="heart-outline" size={64} color={themed.accent as string} />
            <Text style={{ color: themed.text, fontSize: 18, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
              No tienes favoritos aún
            </Text>
            <Text style={{ color: themed.muted as string, textAlign: 'center', marginTop: 8 }}>
              Explora los lugares y agrega tus favoritos para tenerlos siempre a mano
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/advertisement')}
              style={{ backgroundColor: themed.accent as string, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 16 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Explorar Lugares</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}