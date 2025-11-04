// app/Route/edit.tsx
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
  Modal,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface Route {
  id: number;
  name: string;
  description: string;
  status: 'aprobada' | 'rechazada' | 'pendiente' | string;
  image_url: string | null;
}

// 🔧 Normaliza URLs que vengan con host local para que funcionen en producción
const normalizeImageUrl = (url?: string | null) => {
  if (!url) return '';
  // si ya es relativa, mantener
  if (url.startsWith('/uploads/')) return `${process.env.EXPO_PUBLIC_API_URL}${url}`;
  // si viene con host de dev, convertir a relativa si detectamos /uploads/
  if (url.includes('192.168.') || url.includes('localhost')) {
    const m = url.match(/\/uploads\/.+$/);
    return m ? `${process.env.EXPO_PUBLIC_API_URL}${m[0]}` : url;
  }
  return url;
};

export default function EditRouteScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routeData, setRouteData] = useState<Route | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '', // puede ser file:// o URL http(s)
  });

  const [errors, setErrors] = useState({
    name: '',
    description: '',
  });
  const [modalVisible, setModalVisible] = useState(false);
const [modalConfig, setModalConfig] = useState({
  title: '',
  message: '',
  type: 'success' as 'success' | 'error',
});

  // 🎯 Limpia texto: letras, espacios, acentos, ñ y signos básicos , . ! ? -
  const cleanText = (text: string) => {
    const re = /[a-zA-ZÀ-ÿ\u00f1\u00d1\s,.!?\-]/g;
    const matches = text.match(re);
    return matches ? matches.join('') : '';
  };

  // ✅ Valida que no sea solo números y que no esté vacío
  const validateNotOnlyNumbers = (text: string, field: 'name' | 'description') => {
    const onlyNumbers = /^\d+$/;
    if (onlyNumbers.test(text)) {
      setErrors((p) => ({ ...p, [field]: 'No puede contener solo números' }));
      return false;
    }
    if (text.trim() === '') {
      setErrors((p) => ({ ...p, [field]: 'Este campo es obligatorio' }));
      return false;
    }
    setErrors((p) => ({ ...p, [field]: '' }));
    return true;
  };

  // 🧼 Maneja cambios con limpieza + validación
  const handleTextChange = (text: string, field: 'name' | 'description') => {
    const cleaned = cleanText(text);
    setFormData((p) => ({ ...p, [field]: cleaned }));
    validateNotOnlyNumbers(cleaned, field);
  };

  // 📥 Carga inicial
  useEffect(() => {
    if (id) fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`;
      console.log('🔎 GET =>', url);

      const resp = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await resp.text();
      console.log('📊 HTTP Status =>', resp.status);
      console.log('📨 Respuesta =>', text);

      let data: Route;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Respuesta inválida del servidor');
      }

      if (!resp.ok) {
        throw new Error('Error al cargar la ruta');
      }

      setRouteData(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        image_url: normalizeImageUrl(data.image_url),
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar la ruta');
    } finally {
      setLoading(false);
    }
  };

  // 🖼️ Selector de imagen - mantiene tu flujo (opcional)
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        setFormData((p) => ({ ...p, image_url: result.assets[0].uri }));
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // ✅ Botón habilitado solo si todo está válido
  const isFormValid =
    formData.name.trim() &&
    formData.description.trim() &&
    !errors.name &&
    !errors.description;

  // 💾 Guardar
 const handleSubmit = async () => {
  // Trim de campos
  const cleanedData = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    image_url: formData.image_url,
  };

  // Validaciones previas
  if (!cleanedData.name) {
    setModalConfig({
      title: 'Error',
      message: 'Por favor ingresa un nombre para la ruta',
      type: 'error',
    });
    setModalVisible(true);
    setErrors((p) => ({ ...p, name: 'Este campo es obligatorio' }));
    return;
  }
  if (!cleanedData.description) {
    setModalConfig({
      title: 'Error', 
      message: 'Por favor ingresa una descripción para la ruta',
      type: 'error',
    });
    setModalVisible(true);
    setErrors((p) => ({ ...p, description: 'Este campo es obligatorio' }));
    return;
  }
  if (!validateNotOnlyNumbers(cleanedData.name, 'name')) {
    setModalConfig({
      title: 'Error',
      message: 'Por favor corrige los errores en el nombre de la ruta',
      type: 'error',
    });
    setModalVisible(true);
    return;
  }
  if (!validateNotOnlyNumbers(cleanedData.description, 'description')) {
    setModalConfig({
      title: 'Error',
      message: 'Por favor corrige los errores en la descripción',
      type: 'error',
    });
    setModalVisible(true);
    return;
  }

  setSaving(true);
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/routes/${id}`;
    const formDataToSend = new FormData();
    formDataToSend.append('name', cleanedData.name);
    formDataToSend.append('description', cleanedData.description);
    
    if (cleanedData.image_url && cleanedData.image_url.startsWith('file://')) {
      const filename = cleanedData.image_url.split('/').pop();
      const fileType = filename?.split('.').pop() || 'jpg';
      
      formDataToSend.append('image', {
        uri: cleanedData.image_url,
        name: `route-${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    }

    const resp = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formDataToSend,
    });

    const text = await resp.text();

    if (!resp.ok) {
      try {
        const data = JSON.parse(text);
        throw new Error(data.message || 'Error al actualizar la ruta');
      } catch {
        throw new Error('Error al actualizar la ruta');
      }
    }

    setModalConfig({
      title: '¡Éxito!',
      message: 'Ruta actualizada correctamente',
      type: 'success',
    });
    setModalVisible(true);
  } catch (e: any) {
    setModalConfig({
      title: 'Error',
      message: e?.message || 'No se pudo actualizar la ruta',
      type: 'error',
    });
    setModalVisible(true);
  } finally {
    setSaving(false);
  }
};

  // 🎨 Pildora de estado (tema-aware)
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
    // pendiente u otro
    return {
        bg: themed.isDark ? '#341a05' : '#ffedd5',
        border: '#f59e0b',
        text: themed.isDark ? '#fde68a' : '#7c2d12',
    };
  };

  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}
      >
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ color: themed.accent as string, marginTop: 12 }}>Cargando ruta...</Text>
      </View>
    );
  }

  if (!routeData) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}
      >
        <Text style={{ color: themed.text }}>Ruta no encontrada</Text>
      </View>
    );
  }

  const pill = statusStyles(routeData.status);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themed.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
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
            {routeData.status}
          </Text>
        </View>
      </View>

      {/* Nombre */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Nombre de la Ruta *</Text>
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
            placeholder="Ej. Sabores del Centro"
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
        <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Descripción *</Text>
        <View
          style={{
            backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
            borderColor: errors.description ? (themed.danger as string) : (themed.border as string),
            borderWidth: 1.5,
            borderRadius: 16,
          }}
        >
          <TextInput
            value={formData.description}
            onChangeText={(t) => handleTextChange(t, 'description')}
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
        {errors.description ? (
          <Text style={{ color: themed.danger as string, marginTop: 6 }}>{errors.description}</Text>
        ) : null}
      </View>

      {/* Imagen */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Imagen</Text>
        <TouchableOpacity
          onPress={pickImage}
          style={{
            height: 160,
            backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
            borderColor: themed.border,
            borderWidth: 1.5,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {formData.image_url ? (
            <Image
              source={{ uri: formData.image_url.startsWith('file://') ? formData.image_url : normalizeImageUrl(formData.image_url) }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="image-outline" size={48} color={themed.accent as string} />
              <Text style={{ color: themed.muted as string, marginTop: 6 }}>Seleccionar imagen</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Acciones */}
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
          <Text style={{ color: themed.accent as string, fontWeight: '700' }}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving || !isFormValid}
          style={{
            flex: 1,
            backgroundColor: themed.accent as string,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving || !isFormValid ? 0.6 : 1,
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


{/* Modal Personalizado */}
<Modal
  animationType="fade"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <View style={{ 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  }}>
    <View style={{
      backgroundColor: themed.card,
      borderRadius: 20,
      padding: 24,
      margin: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      minWidth: '80%'
    }}>
      {/* Icono */}
      <View style={{
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: modalConfig.type === 'success' 
          ? (themed.isDark ? '#059669' : '#10b981') 
          : (themed.isDark ? '#dc2626' : '#ef4444'),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <Ionicons 
          name={modalConfig.type === 'success' ? "checkmark" : "alert-circle"} 
          size={32} 
          color="#fff" 
        />
      </View>

      {/* Título */}
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: themed.text,
        textAlign: 'center',
        marginBottom: 8
      }}>
        {modalConfig.title}
      </Text>

      {/* Mensaje */}
      <Text style={{
        fontSize: 16,
        color: themed.muted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22
      }}>
        {modalConfig.message}
      </Text>

      {/* Botón */}
      <TouchableOpacity
        onPress={() => {
          setModalVisible(false);
          if (modalConfig.type === 'success') {
            router.replace('/indexR');
          }
        }}
        style={{
          backgroundColor: modalConfig.type === 'success' 
            ? (themed.accent as string)
            : (themed.isDark ? '#dc2626' : '#ef4444'),
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: 12,
          minWidth: 120
        }}
      >
        <Text style={{
          color: '#fff',
          fontSize: 16,
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {modalConfig.type === 'success' ? 'Continuar' : 'Entendido'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>



    </ScrollView>
  );
}
