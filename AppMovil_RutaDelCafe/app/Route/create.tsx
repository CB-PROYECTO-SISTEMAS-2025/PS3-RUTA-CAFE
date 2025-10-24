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
  const [errors, setErrors] = useState({
    name: '',
    description: '',
  });

  // Función para limpiar texto (elimina caracteres no permitidos)
  const cleanText = (text: string) => {
    // Permite letras, espacios, acentos, ñ, y algunos caracteres básicos como , . ! ? -
    const textRegex = /[a-zA-ZÀ-ÿ\u00f1\u00d1\s,.!?\-]/g;
    const matches = text.match(textRegex);
    return matches ? matches.join('') : '';
  };

  // Función para validar que no sea solo números
  const validateNotOnlyNumbers = (text: string, field: string) => {
    const onlyNumbersRegex = /^\d+$/;
    
    if (onlyNumbersRegex.test(text)) {
      setErrors(prev => ({
        ...prev,
        [field]: 'No puede contener solo números'
      }));
      return false;
    } else if (text.trim() === '') {
      setErrors(prev => ({
        ...prev,
        [field]: 'Este campo es obligatorio'
      }));
      return false;
    } else {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
      return true;
    }
  };

  // Función para manejar cambios en los campos con limpieza automática
  const handleTextChange = (text: string, field: string) => {
    // Limpiamos el texto eliminando caracteres no permitidos
    const cleanedText = cleanText(text);
    
    // Actualizamos el estado con el texto limpio
    setFormData(prev => ({
      ...prev,
      [field]: cleanedText
    }));

    // Validamos que no sea solo números
    validateNotOnlyNumbers(cleanedText, field);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image_url: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    // Limpiar espacios en blanco al inicio y final
    const cleanedData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      image_url: formData.image_url
    };

    // Validaciones antes de enviar
    if (!cleanedData.name) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la ruta');
      setErrors(prev => ({ ...prev, name: 'Este campo es obligatorio' }));
      return;
    }

    if (!cleanedData.description) {
      Alert.alert('Error', 'Por favor ingresa una descripción para la ruta');
      setErrors(prev => ({ ...prev, description: 'Este campo es obligatorio' }));
      return;
    }

    // Validar que no sea solo números
    if (!validateNotOnlyNumbers(cleanedData.name, 'name')) {
      Alert.alert('Error', 'Por favor corrige los errores en el nombre de la ruta');
      return;
    }

    if (!validateNotOnlyNumbers(cleanedData.description, 'description')) {
      Alert.alert('Error', 'Por favor corrige los errores en la descripción');
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
      console.log('📦 Datos enviados:', cleanedData);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      const responseText = await response.text();
      console.log('📊 Status de respuesta:', response.status);
      console.log('📨 Respuesta del servidor:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Error parseando JSON:', jsonError);
        throw new Error(`El servidor devolvió: ${responseText.substring(0, 100)}...`);
      }

      if (response.ok) {
        Alert.alert('Éxito', 'Ruta creada correctamente');
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

  // Verificar si el formulario es válido para habilitar/deshabilitar el botón
  const isFormValid = formData.name.trim() && 
                     formData.description.trim() && 
                     !errors.name && 
                     !errors.description;

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
        <View className="mb-4">
          <Text className="text-orange-900 font-bold mb-2">Nombre de la Ruta *</Text>
          <TextInput
            value={formData.name}
            onChangeText={(text) => handleTextChange(text, 'name')}
            placeholder="Ej: Ruta de Antojos Paceños"
            placeholderTextColor="#9ca3af"
            className={`bg-white border rounded-2xl px-4 py-3 text-orange-900 ${
              errors.name ? 'border-red-500' : 'border-orange-200'
            }`}
          />
          {errors.name ? (
            <Text className="text-red-500 text-sm mt-1 ml-2">{errors.name}</Text>
          ) : null}
        </View>

        {/* Descripción */}
        <View className="mb-4">
          <Text className="text-orange-900 font-bold mb-2">Descripción *</Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => handleTextChange(text, 'description')}
            placeholder="Describe tu ruta gastronómica..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            className={`bg-white border rounded-2xl px-4 py-3 text-orange-900 h-32 ${
              errors.description ? 'border-red-500' : 'border-orange-200'
            }`}
          />
          {errors.description ? (
            <Text className="text-red-500 text-sm mt-1 ml-2">{errors.description}</Text>
          ) : null}
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
            disabled={loading || !isFormValid}
            className={`flex-1 py-4 rounded-2xl shadow-lg ${
              loading || !isFormValid 
                ? 'bg-orange-300' 
                : 'bg-orange-500'
            }`}
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