import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

export default function CreateRouteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
  });

  const pickImage = async () => {
    // ✅ SOLUCIÓN: Usar la sintaxis correcta para tu versión
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', // ← Opción más segura
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image_url: result.assets[0].uri }); // ← También corregí "url" por "uri"
    }
  };

const handleSubmit = async () => {
  if (!formData.name || !formData.description) {
    Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
    return;
  }

  setLoading(true);
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    console.log('🌐 Enviando petición a:', `${process.env.EXPO_PUBLIC_API_URL}/api/routes`);
    console.log('📦 Datos enviados:', {
      name: formData.name,
      description: formData.description,
      image_url: formData.image_url,
    });


    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        image_url: formData.image_url,
      }),
    });


    // Debug: Ver la respuesta completa
    const responseText = await response.text();
    console.log('📊 Status de respuesta:', response.status);
    console.log('📨 Respuesta del servidor:', responseText);

    // Intentar parsear como JSON solo si parece ser JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('❌ Error parseando JSON:', jsonError);
      throw new Error(`El servidor devolvió: ${responseText.substring(0, 100)}...`);
    }

    if (response.ok) {
      Alert.alert('Éxito', 'Ruta creada correctamente');
    //   router.back();
     router.replace('/Route');
    } else {
      throw new Error(responseData.message || `Error (${response.status})`);
    }
  } catch (error: any) {
    console.error('🔥 Error completo:', error);
    Alert.alert('Error', error.message || 'Error al crear la ruta');
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView className="flex-1 bg-orange-50">
      {/* Header */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">
          Crear Nueva Ruta
        </Text>
        <Text className="text-orange-100 text-center mt-1">
          Comparte tu experiencia gastronómica
        </Text>
      </View>

      {/* Formulario */}
      <View className="px-6 mt-6">
        {/* Nombre */}
        <View className="mb-6">
          <Text className="text-orange-900 font-bold mb-2">Nombre de la Ruta *</Text>
          <TextInput
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Ej: Ruta de Antojos Paceños"
            placeholderTextColor="#9ca3af"
            className="bg-white border border-orange-200 rounded-2xl px-4 py-3 text-orange-900"
          />
        </View>

        {/* Descripción */}
        <View className="mb-6">
          <Text className="text-orange-900 font-bold mb-2">Descripción *</Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe tu ruta gastronómica..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            className="bg-white border border-orange-200 rounded-2xl px-4 py-3 text-orange-900 h-32"
          />
        </View>

        {/* Imagen */}
        <View className="mb-6">
          <Text className="text-orange-900 font-bold mb-2">Imagen (Opcional)</Text>
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
            disabled={loading}
            className="flex-1 bg-orange-500 py-4 rounded-2xl shadow-lg"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-center">Crear Ruta</Text>
            )} 
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}