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
  Modal,
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
  const [modalVisible, setModalVisible] = useState(false);
const [modalConfig, setModalConfig] = useState({
  title: '',
  message: '',
  type: 'success' as 'success' | 'error',
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
    setModalConfig({
      title: 'Error',
      message: 'Por favor ingresa un nombre para la ruta',
      type: 'error',
    });
    setModalVisible(true);
    setErrors((prev) => ({ ...prev, name: 'Este campo es obligatorio' }));
    return;
  }
  if (!cleanedData.description) {
    setModalConfig({
      title: 'Error',
      message: 'Por favor ingresa una descripción para la ruta',
      type: 'error',
    });
    setModalVisible(true);
    setErrors((prev) => ({ ...prev, description: 'Este campo es obligatorio' }));
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

  setLoading(true);
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      router.replace('/login');
      return;
    }

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

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formDataToSend,
    });

    const responseText = await response.text();

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (jsonError) {
      throw new Error(`El servidor devolvió una respuesta inválida`);
    }

    if (response.ok) {
      setModalConfig({
        title: '¡Éxito!',
        message: 'Ruta creada correctamente',
        type: 'success',
      });
      setModalVisible(true);
    } else {
      throw new Error(responseData.message || `Error (${response.status})`);
    }
  } catch (error: any) {
    setModalConfig({
      title: 'Error',
      message: error.message || 'Error al crear la ruta',
      type: 'error',
    });
    setModalVisible(true);
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


      {/* 🔥 AGREGAR EL MODAL AQUÍ - justo después de los botones */}
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
