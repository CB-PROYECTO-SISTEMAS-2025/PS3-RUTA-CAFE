// app/Place/favorites.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';

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

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/favorites/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/favorites`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    place_id: placeId,
                  }),
                }
              );

              if (response.ok) {
                Alert.alert('Éxito', 'Lugar eliminado de favoritos');
                loadFavorites(); // Recargar la lista
              } else {
                throw new Error('Error al eliminar favorito');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el lugar de favoritos');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">Cargando favoritos...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      {/* Header */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center justify-center">
          <View className="flex-1">
            <Text className="text-white text-xl font-bold text-center">
              Mis Favoritos
            </Text>
            <Text className="text-orange-100 text-sm mt-1 text-center">
              {favorites.length} lugar{favorites.length !== 1 ? 'es' : ''} guardado{favorites.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Botón de volver */}
      <View className="px-6 mt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-orange-100 border border-orange-400 py-3 rounded-xl shadow flex-row items-center justify-center"
        >
          <Ionicons name="arrow-back" size={22} color="#f97316" />
          <Text className="text-orange-700 font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de favoritos */}
      <FlatList
        data={favorites}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="p-4"
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-orange-200 shadow-sm">
            <View className="flex-row">
              {/* Imagen */}
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
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
                    {item.place_name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeFavorite(item.place_id)}
                    className="p-1"
                  >
                    <Ionicons name="heart" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <Text className="text-orange-600 text-xs mb-1">
                  Agregado el {formatDate(item.createdat)} · {item.route_name || 'Sin ruta'}
                </Text>

                <Text className="text-orange-800 text-sm" numberOfLines={2}>
                  {item.place_description}
                </Text>

                {/* Botones de acción */}
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => router.push(`/Place/details?id=${item.place_id}`)}
                    className="flex-1 bg-orange-100 py-2 rounded-xl border border-orange-300 flex-row items-center justify-center"
                  >
                    <Ionicons name="eye-outline" size={16} color="#ea580c" />
                    <Text className="text-orange-700 font-semibold text-xs ml-1">Ver detalles</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push(`/Place/comments?id=${item.place_id}&name=${item.place_name}`)}
                    className="flex-1 bg-green-100 py-2 rounded-xl border border-green-300 flex-row items-center justify-center"
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#16a34a" />
                    <Text className="text-green-700 font-semibold text-xs ml-1">Comentarios</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="bg-white rounded-2xl p-8 items-center justify-center border border-orange-200 mt-8">
            <Ionicons name="heart-outline" size={64} color="#ea580c" />
            <Text className="text-orange-800 text-xl font-semibold mt-4 text-center">
              No tienes favoritos aún
            </Text>
            <Text className="text-orange-600 text-center mt-2 px-4">
              Explora los lugares y agrega tus favoritos para tenerlos siempre a mano
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/advertisement')}
              className="bg-orange-500 px-6 py-3 rounded-xl mt-6"
            >
              <Text className="text-white font-semibold">Explorar Lugares</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}