// app/Route/create.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useThemedStyles } from '../../hooks/useThemedStyles';

export default function CreateRouteScreen() {
  const router = useRouter();
  const themed = useThemedStyles();

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

  // --- Utilidades de limpieza/validación ---
  // Permite letras, espacios, acentos, ñ y signos básicos , . ! ? -
  const cleanText = (text: string) => {
    const textRegex = /[a-zA-ZÀ-ÿ\u00f1\u00d1\s,.!?\-]/g;
    const matches = text.match(textRegex);
    return matches ? matches.join('') : '';
  };

  // Valida que no sea solo números y que no esté vacío
  const validateNotOnlyNumbers = (text: string, field: 'name' | 'description') => {
    const onlyNumbersRegex = /^\d+$/;
    if (onlyNumbersRegex.test(text)) {
      setErrors((prev) => ({ ...prev, [field]: 'No puede contener solo números' }));
      return false;
    } else if (text.trim() === '') {
      setErrors((prev) => ({ ...prev, [field]: 'Este campo es obligatorio' }));
      return false;
    } else {
      setErrors((prev) => ({ ...prev, [field]: '' }));
      return true;
    }
  };

  // Maneja cambios aplicando limpieza y validando
  const handleTextChange = (text: string, field: 'name' | 'description') => {
    const cleaned = cleanText(text);
    setFormData((prev) => ({ ...prev, [field]: cleaned }));
    validateNotOnlyNumbers(cleaned, field);
  };

  // --- Imagen principal opcional ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData((prev) => ({ ...prev, image_url: result.assets[0].uri }));
    }
  };

  // --- Envío ---
  const handleSubmit = async () => {
    // Trim de los campos obligatorios
    const cleanedData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      image_url: formData.image_url,
    };

    // Validaciones previas
    if (!cleanedData.name) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la ruta');
      setErrors((prev) => ({ ...prev, name: 'Este campo es obligatorio' }));
      return;
    }
    if (!cleanedData.description) {
      Alert.alert('Error', 'Por favor ingresa una descripción para la ruta');
      setErrors((prev) => ({ ...prev, description: 'Este campo es obligatorio' }));
      return;
    }
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

      // Logs útiles para depurar
      console.log('🌐 POST =>', `${process.env.EXPO_PUBLIC_API_URL}/api/routes`);
      console.log('📦 Payload =>', cleanedData);

      // Envío como JSON (si el backend soporta subir archivo como multipart, se puede adaptar)
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      const responseText = await response.text();
      console.log('📊 HTTP Status =>', response.status);
      console.log('📨 Respuesta =>', responseText);

      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Error parseando JSON:', jsonError);
        throw new Error(`El servidor devolvió: ${responseText.substring(0, 100)}...`);
        // Si tu backend devuelve texto plano, adapta esto.
      }

      if (response.ok) {
        Alert.alert('Éxito', 'Ruta creada correctamente', [
          { text: 'OK', onPress: () => router.replace('/Route') },
        ]);
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

  // Habilita el botón sólo si está todo válido
  const isFormValid =
    formData.name.trim() &&
    formData.description.trim() &&
    !errors.name &&
    !errors.description;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themed.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: themed.accent,
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>
          Crear Nueva Ruta
        </Text>
        <Text style={{ color: '#fff', opacity: 0.9, textAlign: 'center', marginTop: 4 }}>
          Comparte tu experiencia gastronómica
        </Text>
      </View>

      {/* Formulario */}
      <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
        {/* Nombre */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
            Nombre de la Ruta *
          </Text>
          <View
            style={{
              backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
              borderColor: errors.name ? (themed.danger as string) : (themed.border as string),
              borderWidth: 1.5,
              borderRadius: 16,
            }}
          >
            <TextInput
              value={formData.name}
              onChangeText={(t) => handleTextChange(t, 'name')}
              placeholder="Ej: Ruta de Antojos Paceños"
              placeholderTextColor={themed.muted as string}
              style={{ color: themed.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
            />
          </View>
          {errors.name ? (
            <Text style={{ color: themed.danger as string, marginTop: 6 }}>{errors.name}</Text>
          ) : null}
        </View>

        {/* Descripción */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
            Descripción *
          </Text>
          <View
            style={{
              backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
              borderColor: errors.description ? (themed.danger as string) : (themed.border as string),
              borderWidth: 1.5,
              borderRadius: 16,
              height: 128,
            }}
          >
            <TextInput
              value={formData.description}
              onChangeText={(t) => handleTextChange(t, 'description')}
              placeholder="Describe tu ruta gastronómica..."
              placeholderTextColor={themed.muted as string}
              multiline
              numberOfLines={4}
              style={{
                color: themed.text,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                textAlignVertical: 'top',
                height: '100%',
              }}
            />
          </View>
          {errors.description ? (
            <Text style={{ color: themed.danger as string, marginTop: 6 }}>{errors.description}</Text>
          ) : null}
        </View>

        {/* Imagen (opcional) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
            Imagen (Opcional)
          </Text>
          <TouchableOpacity
            onPress={pickImage}
            style={{
              backgroundColor: themed.card,
              borderColor: themed.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 12,
              height: 160,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {formData.image_url ? (
              <Image
                source={{ uri: formData.image_url }}
                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="image-outline" size={48} color={themed.accent as string} />
                <Text style={{ color: themed.muted as string, marginTop: 6 }}>
                  Seleccionar imagen
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Botones */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flex: 1,
              backgroundColor: themed.isDark ? '#0b1220' : '#fff7ed',
              borderColor: themed.accent,
              borderWidth: 1,
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: themed.accent, fontWeight: '700' }}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !isFormValid}
            style={{
              flex: 1,
              backgroundColor: themed.accent,
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 3,
              opacity: loading || !isFormValid ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Crear Ruta</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
