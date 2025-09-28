import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Route {
  id: number;
  name: string;
  description: string;
  status: string;
  image_url: string;
}

export default function EditRouteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
  });

  useEffect(() => {
    if (id) {
      fetchRoute();
    }
  }, [id]);

  const fetchRoute = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const routeData = await response.json();
        setRoute(routeData);
        setFormData({
          name: routeData.name,
          description: routeData.description,
          image_url: routeData.image_url || '',
        });
      } else {
        throw new Error('Error al cargar la ruta');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la ruta');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image_url: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Ruta actualizada correctamente');
        // router.back();
         router.replace('/Route');
      } else {
        throw new Error('Error al actualizar la ruta');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la ruta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">Cargando ruta...</Text>
      </View>
    );
  }

  if (!route) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <Text className="text-orange-700">Ruta no encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-orange-50">
      {/* Header */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">
          Editar Ruta
        </Text>
        <Text className="text-orange-100 text-center mt-1">
          Actualiza tu experiencia gastronómica
        </Text>
      </View>

      {/* Formulario */}
      <View className="px-6 mt-6">
        {/* Estado */}
        <View className="mb-6 bg-white rounded-2xl p-4">
          <Text className="text-orange-900 font-bold mb-2">Estado actual</Text>
          <View className={`px-3 py-2 rounded-full border self-start ${
            route.status === 'aprobada' ? 'bg-green-100 border-green-500 text-green-700' :
            route.status === 'rechazada' ? 'bg-red-100 border-red-500 text-red-700' :
            'bg-orange-100 border-orange-500 text-orange-700'
          }`}>
            <Text className="text-sm font-bold capitalize">
              {route.status}
            </Text>
          </View>
        </View>

        {/* Nombre */}
        <View className="mb-6">
          <Text className="text-orange-900 font-bold mb-2">Nombre de la Ruta *</Text>
          <TextInput
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            className="bg-white border border-orange-200 rounded-2xl px-4 py-3 text-orange-900"
          />
        </View>

        {/* Descripción */}
        <View className="mb-6">
          <Text className="text-orange-900 font-bold mb-2">Descripción *</Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            className="bg-white border border-orange-200 rounded-2xl px-4 py-3 text-orange-900 h-32"
          />
        </View>

        {/* Imagen */}
        <View className="mb-6">
          <Text className="text-orange-900 font-bold mb-2">Imagen</Text>
          <TouchableOpacity
            onPress={pickImage}
            className="bg-white border border-orange-200 rounded-2xl p-4 items-center justify-center h-40"
          >
            {formData.image_url ? (
              <Image
                source={{ uri: formData.image_url }}
                className="w-full h-full rounded-xl"
                resizeMode="cover"
              />
            ) : (
              <View className="items-center">
                <Ionicons name="image-outline" size={48} color="#f97316" />
                <Text className="text-orange-500 mt-2">Seleccionar imagen</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Botones */}
        <View className="flex-row space-x-4 mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-1 bg-orange-100 border border-orange-300 py-4 rounded-2xl"
          >
            <Text className="text-orange-700 font-bold text-center">Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            className="flex-1 bg-orange-500 py-4 rounded-2xl shadow-lg"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-center">Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}