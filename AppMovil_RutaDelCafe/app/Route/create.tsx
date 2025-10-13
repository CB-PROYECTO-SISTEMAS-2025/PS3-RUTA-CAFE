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
  const themed = useThemedStyles(); // 🎨 Tema oscuro/claro
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
  });

  const pickImage = async () => {
    // ✅ Mantengo tu lógica
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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url,
        }),
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
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
            Nombre de la Ruta *
          </Text>
          <View
            style={{
              backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
              borderColor: themed.border,
              borderWidth: 1,
              borderRadius: 16,
            }}
          >
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Ej: Ruta de Antojos Paceños"
              placeholderTextColor={themed.muted as string}
              style={{ color: themed.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
            />
          </View>
        </View>

        {/* Descripción */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
            Descripción *
          </Text>
          <View
            style={{
              backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
              borderColor: themed.border,
              borderWidth: 1,
              borderRadius: 16,
              height: 128,
            }}
          >
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
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
        </View>

        {/* Imagen */}
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
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: themed.accent,
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 3,
              opacity: loading ? 0.9 : 1,
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
