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
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface Route {
  id: number;
  name: string;
  description: string;
  status: string;
  image_url: string;
}

export default function EditRouteScreen() {
  const router = useRouter();
  const themed = useThemedStyles(); // 🎨 tema
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
        headers: { Authorization: `Bearer ${token}` },
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
    } catch {
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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Ruta actualizada correctamente');
        router.replace('/Route');
      } else {
        throw new Error('Error al actualizar la ruta');
      }
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la ruta');
    } finally {
      setSaving(false);
    }
  };

  // 🎨 pill de estado según tema
  const statusStyles = (status: string) => {
    if (status === 'aprobada') {
      return {
        bg: themed.isDark ? '#052e1a' : '#d1fae5',
        border: '#10b981',
        text: themed.isDark ? '#6ee7b7' : '#065f46',
      };
    }
    if (status === 'rechazada') {
      return {
        bg: themed.isDark ? '#2f0b0b' : '#fee2e2',
        border: '#ef4444',
        text: themed.isDark ? '#fecaca' : '#7f1d1d',
      };
    }
    return {
      bg: themed.isDark ? '#341a05' : '#ffedd5',
      border: '#f59e0b',
      text: themed.isDark ? '#fde68a' : '#7c2d12',
    };
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: themed.background,
        }}
      >
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ color: themed.accent, marginTop: 16 }}>Cargando ruta...</Text>
      </View>
    );
  }

  if (!route) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: themed.background,
        }}
      >
        <Text style={{ color: themed.text }}>Ruta no encontrada</Text>
      </View>
    );
  }

  const pill = statusStyles(route.status);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themed.background }}
      contentContainerStyle={{ paddingHorizontal: 24 }}
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
          marginHorizontal: -24,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>
          Editar Ruta
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4 }}>
          Actualiza tu experiencia gastronómica
        </Text>
      </View>

      {/* Estado */}
      <View
        style={{
          marginBottom: 16,
          backgroundColor: themed.card,
          borderColor: themed.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text style={{ color: themed.text, fontWeight: 'bold', marginBottom: 8 }}>Estado actual</Text>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            backgroundColor: pill.bg,
            borderColor: pill.border,
          }}
        >
          <Text style={{ color: pill.text, fontWeight: '700', textTransform: 'capitalize' }}>
            {route.status}
          </Text>
        </View>
      </View>

      {/* Nombre */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: themed.text, fontWeight: 'bold', marginBottom: 8 }}>
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
            placeholder="Ej. Sabores del Centro"
            placeholderTextColor={themed.muted as string}
            style={{ color: themed.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
          />
        </View>
      </View>

      {/* Descripción */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: themed.text, fontWeight: 'bold', marginBottom: 8 }}>Descripción *</Text>
        <View
          style={{
            backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
            borderColor: themed.border,
            borderWidth: 1,
            borderRadius: 16,
          }}
        >
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            placeholder="Cuenta de qué va tu ruta…"
            placeholderTextColor={themed.muted as string}
            style={{
              color: themed.text,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </View>

      {/* Imagen */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: themed.text, fontWeight: 'bold', marginBottom: 8 }}>Imagen</Text>
        <TouchableOpacity
          onPress={pickImage}
          style={{
            height: 160,
            backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
            borderColor: themed.border,
            borderWidth: 1,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {formData.image_url ? (
            <Image
              source={{ uri: formData.image_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="image-outline" size={48} color={themed.accent as string} />
              <Text style={{ color: themed.muted, marginTop: 6 }}>Seleccionar imagen</Text>
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
            borderColor: themed.accent as string,
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
          disabled={saving}
          style={{
            flex: 1,
            backgroundColor: themed.accent as string,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving ? 0.9 : 1,
            elevation: 3,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
