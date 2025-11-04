// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { withAuth } from "../../components/ui/withAuth";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// Banderas locales
const LaPazFlag = require("../images/Banderas/LaPaz.jpg");
const CochabambaFlag = require("../images/Banderas/COCHABAMBA.jpg");
const SantaCruzFlag = require("../images/Banderas/Santa_Cruz.png");
const OruroFlag = require("../images/Banderas/Oruro.png");
const PotosiFlag = require("../images/Banderas/Potosi.jpg");
const TarijaFlag = require("../images/Banderas/Tarija.png");
const ChuquisacaFlag = require("../images/Banderas/Chuquisaca.png");
const BeniFlag = require("../images/Banderas/Beni.png");
const PandoFlag = require("../images/Banderas/Pando.png");

interface User {
  id: number;
  name: string;
  lastName: string;
  secondLastName: string;
  email: string;
  phone: string;
  City_id: number;
  cityName: string;
  photo: string;
}

interface EditedData {
  name: string;
  lastName: string;
  secondLastName: string;
  email: string;
  phoneCode: string;
  phone: string;
  City_id: number;
  cityName: string;
  photo: string;
  notifications: boolean;
}
interface ModalConfig {
  title: string;
  message: string;
  type: 'success' | 'error';
  action: 'logout' | 'delete' | 'save' | '';
}

const cityItems = [
  { label: "Selecciona una ciudad", value: 0, name: "" },
  { label: "La Paz", value: 1, name: "La Paz" },
  { label: "Cochabamba", value: 2, name: "Cochabamba" },
  { label: "Santa Cruz", value: 3, name: "Santa Cruz" },
  { label: "Oruro", value: 4, name: "Oruro" },
  { label: "Potosí", value: 5, name: "Potosí" },
  { label: "Tarija", value: 6, name: "Tarija" },
  { label: "Chuquisaca", value: 7, name: "Chuquisaca" },
  { label: "Beni", value: 8, name: "Beni" },
  { label: "Pando", value: 9, name: "Pando" },
];

const phoneCodes = [
  { code: "+591", country: "Bolivia", maxLength: 8 },
  { code: "+52", country: "México", maxLength: 10 },
  { code: "+54", country: "Argentina", maxLength: 10 },
  { code: "+55", country: "Brasil", maxLength: 11 },
  { code: "+56", country: "Chile", maxLength: 9 },
  { code: "+57", country: "Colombia", maxLength: 10 },
  { code: "+58", country: "Venezuela", maxLength: 10 },
  { code: "+598", country: "Uruguay", maxLength: 8 },
  { code: "+593", country: "Ecuador", maxLength: 9 },
  { code: "+505", country: "Nicaragua", maxLength: 8 },
  { code: "+507", country: "Panamá", maxLength: 7 },
  { code: "+509", country: "Haití", maxLength: 8 },
];

function ProfileScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const tabBarHeight = 96;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showPhoneCodePicker, setShowPhoneCodePicker] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
const [modalConfig, setModalConfig] = useState<ModalConfig>({
  title: '',
  message: '',
  type: 'success',
  action: '',
});

  const [editedData, setEditedData] = useState<EditedData>({
    name: "",
    lastName: "",
    secondLastName: "",
    email: "",
    phoneCode: "+591",
    phone: "",
    City_id: 0,
    cityName: "",
    photo: "",
    notifications: true,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  
 useFocusEffect(
  React.useCallback(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        router.replace("/login");
      }
    };
    
    checkAuth();
  }, [router])
);

  // CORREGIR esta función - líneas ~89-100
const showModal = (type: 'success' | 'error', message: string, action: 'logout' | 'delete' | 'save' | '' = '') => {
  const titles: { [key: string]: string } = {
    success: '¡Éxito!',
    error: 'Error',
    logout: 'Cerrar Sesión',
    delete: 'Eliminar Cuenta',
    save: 'Guardar Cambios' // Agregar esta línea
  };
  
  setModalConfig({
    title: action && titles[action] ? titles[action] : titles[type],
    message,
    type,
    action,
  });
  setModalVisible(true);
};

  const handleModalAction = async () => {
    setModalVisible(false);
    
    switch (modalConfig.action) {
      case 'logout':
        await handleLogoutConfirm();
        break;
      case 'delete':
        await handleDeleteConfirm();
        break;
      case 'save':
        if (modalConfig.type === 'success') {
          loadUserData();
          setEditMode(false);
        }
        break;
      default:
        break;
    }
  };

  const handleLogoutConfirm = async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
    router.replace("/login");
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Error al eliminar la cuenta");
      
      showModal("success", "Cuenta eliminada correctamente", "delete");
    } catch {
      showModal("error", "Error al eliminar la cuenta");
    }
  };

  const getCityFlag = (cityId: number) => {
    const imgStyle = { width: 40, height: 24 };
    switch (cityId) {
      case 1: return <Image source={LaPazFlag} style={imgStyle} resizeMode="contain" />;
      case 2: return <Image source={CochabambaFlag} style={imgStyle} resizeMode="contain" />;
      case 3: return <Image source={SantaCruzFlag} style={imgStyle} resizeMode="contain" />;
      case 4: return <Image source={OruroFlag} style={imgStyle} resizeMode="contain" />;
      case 5: return <Image source={PotosiFlag} style={imgStyle} resizeMode="contain" />;
      case 6: return <Image source={TarijaFlag} style={imgStyle} resizeMode="contain" />;
      case 7: return <Image source={ChuquisacaFlag} style={imgStyle} resizeMode="contain" />;
      case 8: return <Image source={BeniFlag} style={imgStyle} resizeMode="contain" />;
      case 9: return <Image source={PandoFlag} style={imgStyle} resizeMode="contain" />;
      default: return null;
    }
  };

  const validateTextInput = (text: string, currentValue: string): string => {
    const onlyLettersAndSpacesRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/;
    return onlyLettersAndSpacesRegex.test(text) ? text : currentValue;
  };

  const handleTextChange = (field: keyof EditedData, text: string) => {
    if (field === "name" || field === "lastName" || field === "secondLastName") {
      const cleanedText = validateTextInput(text, editedData[field] as string);
      setEditedData({ ...editedData, [field]: cleanedText });
    } else {
      setEditedData({ ...editedData, [field]: text });
    }
  };

  const extractPhoneData = (fullPhone: string) => {
    let phoneCode = "+591";
    let phoneNumber = "";
    const foundCode = phoneCodes.find((code) => fullPhone?.startsWith(code.code));
    if (foundCode) {
      phoneCode = foundCode.code;
      phoneNumber = fullPhone.substring(foundCode.code.length);
    } else {
      phoneNumber = fullPhone || "";
    }
    return { phoneCode, phoneNumber };
  };

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Error al cargar datos del usuario");

      const data = await response.json();
      setUser(data.user);

      const { phoneCode, phoneNumber } = extractPhoneData(data.user.phone || "");
      const userCity = cityItems.find((c) => c.value === data.user.City_id);
      const cityName = userCity ? userCity.name : "";

      setEditedData({
        name: data.user.name,
        lastName: data.user.lastName,
        secondLastName: data.user.secondLastName || "",
        email: data.user.email,
        phoneCode,
        phone: phoneNumber,
        City_id: data.user.City_id || 0,
        cityName,
        photo: data.user.photo || "",
        notifications: true,
      });
    } catch {
      showModal("error", "Error al cargar los datos del perfil");
      const token = await AsyncStorage.getItem("userToken");
      if (!token) router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const getMaxPhoneLength = () => {
    const phoneCodeObj = phoneCodes.find((i) => i.code === editedData.phoneCode);
    return phoneCodeObj ? phoneCodeObj.maxLength : 15;
  };

  const handleEdit = () => setEditMode(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("userToken");

      const onlyLettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      const onlyNumbersRegex = /^[0-9]+$/;

      if (!editedData.name || !editedData.lastName || !editedData.email || !editedData.phone) {
        showModal("error", "Por favor complete todos los campos obligatorios");
        return;
      }
      if (!onlyLettersRegex.test(editedData.name))
        return showModal("error", "El nombre solo puede contener letras");
      if (!onlyLettersRegex.test(editedData.lastName))
        return showModal("error", "El apellido paterno solo puede contener letras");
      if (editedData.secondLastName && !onlyLettersRegex.test(editedData.secondLastName))
        return showModal("error", "El apellido materno solo puede contener letras");

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedData.email))
        return showModal("error", "Formato de correo electrónico inválido");

      if (!onlyNumbersRegex.test(editedData.phone))
        return showModal("error", "El teléfono solo puede contener números");

      const maxLength = getMaxPhoneLength();
      if (maxLength && editedData.phone.length !== maxLength)
        return showModal("error", `El teléfono para ${editedData.phoneCode} debe tener exactamente ${maxLength} dígitos`);

      if (!editedData.City_id) return showModal("error", "Por favor selecciona una ciudad");

      const fullPhone = editedData.phoneCode + editedData.phone;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editedData.name,
            lastName: editedData.lastName,
            secondLastName: editedData.secondLastName,
            email: editedData.email,
            phone: fullPhone,
            City_id: editedData.City_id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al guardar los cambios");
      }

      showModal("success", "Perfil editado correctamente", "save");
    } catch (err: any) {
      showModal("error", err?.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setShowCityPicker(false);
    setShowPhoneCodePicker(false);
    if (user) {
      const { phoneCode, phoneNumber } = extractPhoneData(user.phone || "");
      const userCity = cityItems.find((c) => c.value === user.City_id);
      const cityName = userCity ? userCity.name : "";
      setEditedData({
        name: user.name,
        lastName: user.lastName,
        secondLastName: user.secondLastName || "",
        email: user.email,
        phoneCode,
        phone: phoneNumber,
        City_id: user.City_id || 0,
        cityName,
        photo: user.photo || "",
        notifications: true,
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showModal("error", "Se necesitan permisos de cámara para tomar fotos");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch {
      showModal("error", "Error al tomar la foto");
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showModal("error", "Se necesitan permisos para acceder a la galería");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch {
      showModal("error", "Error al seleccionar la foto");
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const token = await AsyncStorage.getItem("userToken");

      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;

            const uploadResponse = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL}/api/users/profile/photo`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ photoUrl: base64data }),
              }
            );

            if (!uploadResponse.ok) throw new Error("Error al subir la foto");

            const result = await uploadResponse.json();
            setEditedData({ ...editedData, photo: result.photoUrl });
            showModal("success", "Foto de perfil actualizada correctamente", "save");
            loadUserData();
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      showModal("error", "Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/profile/photo`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Error al eliminar la foto");

      setEditedData({ ...editedData, photo: "" });
      showModal("success", "Foto de perfil eliminada correctamente", "save");
      loadUserData();
    } catch {
      showModal("error", "Error al eliminar la foto");
    }
  };

  const handleDeleteAccount = () => {
    showModal("error", "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y se perderán todos tus datos.", "delete");
  };

  const handleLogout = () => {
    showModal("error", "¿Estás seguro de que quieres cerrar sesión?", "logout");
  };

  const selectCity = (cityId: number, cityName: string) => {
    setEditedData({ ...editedData, City_id: cityId, cityName });
    setShowCityPicker(false);
  };

  const handlePhoneChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    const maxLength = getMaxPhoneLength();
    if (numericText.length <= maxLength)
      setEditedData({ ...editedData, phone: numericText });
  };

  const dismissKeyboard = () => Keyboard.dismiss();
  const getSelectedCityLabel = () =>
    cityItems.find((i) => i.value === editedData.City_id)?.label ||
    "Selecciona una ciudad";
  const handleGoHome = () => router.replace("/(tabs)/advertisement");

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: themed.background }}>
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ marginTop: 16, color: themed.muted }}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themed.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: tabBarHeight + 32,
            paddingHorizontal: 20,
            paddingTop: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header con Foto */}
          <View
            style={{
              width: "100%",
              height: 240,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              backgroundColor: themed.accent,
              borderRadius: 32,
              paddingHorizontal: 20,
              paddingVertical: 20,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <View style={{ position: "relative", marginBottom: 12 }}>
                {editedData.photo ? (
                  <Image
                    source={{ uri: editedData.photo }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 999,
                      borderWidth: 4,
                      borderColor: "#FFFFFF",
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      borderWidth: 4,
                      borderColor: "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={40} color="#FFFFFF" />
                  </View>
                )}

                {editMode && (
                  <View style={{ position: "absolute", bottom: -8, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    <TouchableOpacity
                      onPress={handleTakePhoto}
                      disabled={uploadingPhoto}
                      style={{ backgroundColor: "#FFFFFF", padding: 8, borderRadius: 999, elevation: 3 }}
                    >
                      <Ionicons name="camera" size={16} color={themed.accent as string} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleChoosePhoto}
                      disabled={uploadingPhoto}
                      style={{ backgroundColor: "#FFFFFF", padding: 8, borderRadius: 999, elevation: 3 }}
                    >
                      <Ionicons name="image" size={16} color={themed.accent as string} />
                    </TouchableOpacity>
                    {editedData.photo ? (
                      <TouchableOpacity
                        onPress={handleRemovePhoto}
                        disabled={uploadingPhoto}
                        style={{ backgroundColor: "#FFFFFF", padding: 8, borderRadius: 999, elevation: 3 }}
                      >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {uploadingPhoto && (
                  <View
                    style={{
                      position: "absolute",
                      inset: 0 as any,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 22, fontWeight: "bold", color: "#FFFFFF", textAlign: "center" }}>
                {editedData.name} {editedData.lastName}
              </Text>
              <Text style={{ color: "#FFFFFF", opacity: 0.9, marginTop: 4, textAlign: "center" }}>
                {editedData.email}
              </Text>
            </View>
          </View>

          {/* Card info */}
          <View
            style={{
              backgroundColor: themed.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: themed.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16, color: themed.text, textAlign: "center" }}>
              Información personal
            </Text>

            {[
              { key: "name" as keyof EditedData, label: "Nombre *", placeholder: "Ingresa tu nombre" },
              { key: "lastName" as keyof EditedData, label: "Apellido Paterno *", placeholder: "Ingresa tu apellido paterno" },
              { key: "secondLastName" as keyof EditedData, label: "Apellido Materno", placeholder: "Opcional" },
            ].map((f) => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "600", marginBottom: 6, color: themed.muted }}>{f.label}</Text>
                {editMode ? (
                  <View style={{ borderRadius: 12, borderWidth: 1, borderColor: themed.border, backgroundColor: themed.isDark ? "#0B1220" : "#FFFFFF" }}>
                    <TextInput
                      value={editedData[f.key] as string}
                      onChangeText={(t) => handleTextChange(f.key, t)}
                      placeholder={f.placeholder}
                      placeholderTextColor={themed.muted as string}
                      autoCapitalize="words"
                      editable={!saving}
                      style={{ color: themed.text, height: 52, paddingHorizontal: 14, fontSize: 16 }}
                    />
                  </View>
                ) : (
                  <Text style={{ color: editedData[f.key] ? themed.text : themed.muted, fontSize: 16, paddingVertical: 10 }}>
                    {(editedData[f.key] as string) || "No especificado"}
                  </Text>
                )}
              </View>
            ))}

            {/* Correo */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6, color: themed.muted }}>Correo Electrónico *</Text>
              {editMode ? (
                <View style={{ borderRadius: 12, borderWidth: 1, borderColor: themed.border, backgroundColor: themed.isDark ? "#0B1220" : "#FFFFFF" }}>
                  <TextInput
                    value={editedData.email}
                    onChangeText={(t) => handleTextChange("email", t)}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor={themed.muted as string}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                    style={{ color: themed.text, height: 52, paddingHorizontal: 14, fontSize: 16 }}
                  />
                </View>
              ) : (
                <Text style={{ color: editedData.email ? themed.text : themed.muted, fontSize: 16, paddingVertical: 10 }}>
                  {editedData.email || "No especificado"}
                </Text>
              )}
            </View>

            {/* Teléfono */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6, color: themed.muted }}>Teléfono *</Text>
              {editMode ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowPhoneCodePicker(true);
                    }}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: themed.border,
                      backgroundColor: themed.isDark ? "#0B1220" : "#FFFFFF",
                      marginRight: 8,
                      paddingHorizontal: 12,
                      minWidth: 64,
                      height: 52,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: themed.text, textAlign: "center", fontSize: 16 }}>{editedData.phoneCode}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: themed.border, backgroundColor: themed.isDark ? "#0B1220" : "#FFFFFF" }}>
                    <TextInput
                      value={editedData.phone}
                      onChangeText={handlePhoneChange}
                      placeholder={`Ej: ${"0".repeat(Math.max(getMaxPhoneLength() - 1, 1))}`}
                      placeholderTextColor={themed.muted as string}
                      keyboardType="number-pad"
                      editable={!saving}
                      maxLength={getMaxPhoneLength()}
                      style={{ color: themed.text, height: 52, paddingHorizontal: 14, fontSize: 16 }}
                    />
                  </View>
                </View>
              ) : (
                <Text style={{ color: editedData.phone ? themed.text : themed.muted, fontSize: 16, paddingVertical: 10 }}>
                  {editedData.phoneCode} {editedData.phone || "No especificado"}
                </Text>
              )}
            </View>

            {/* Ciudad */}
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: "600", marginBottom: 8, color: themed.muted }}>Ciudad *</Text>
              {editMode ? (
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCityPicker(true);
                  }}
                  style={{ padding: 14, borderRadius: 12, backgroundColor: themed.isDark ? "#0B1220" : "#FFFFFF", borderWidth: 1, borderColor: themed.border }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {getCityFlag(editedData.City_id)}
                    <Text style={{ marginLeft: 8, color: editedData.City_id ? themed.text : themed.muted, fontSize: 16 }}>
                      {getSelectedCityLabel()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                  {getCityFlag(editedData.City_id)}
                  <Text style={{ marginLeft: 8, color: editedData.City_id ? themed.text : themed.muted, fontSize: 16 }}>
                    {getSelectedCityLabel()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Favoritos */}
          <TouchableOpacity
            onPress={() => router.push("/Place/favorites")}
            style={{
              marginBottom: 12,
              padding: 14,
              borderRadius: 12,
              backgroundColor: themed.isDark ? "#4c0519" : "#ffe4e6",
              borderWidth: 1,
              borderColor: themed.isDark ? "#9f1239" : "#f9a8d4",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="heart" size={22} color={themed.isDark ? "#f472b6" : "#ec4899"} />
              <Text style={{ color: themed.isDark ? "#f9a8d4" : "#9d174d", fontWeight: "600", fontSize: 16, marginLeft: 10 }}>
                Mis Lugares Favoritos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themed.isDark ? "#f9a8d4" : "#ec4899"} />
          </TouchableOpacity>

          {/* Ir a Home */}
          <TouchableOpacity
            onPress={handleGoHome}
            style={{
              marginBottom: 12,
              padding: 14,
              borderRadius: 12,
              backgroundColor: themed.isDark ? "#0b1220" : "#fff7ed",
              borderWidth: 1,
              borderColor: themed.isDark ? "#1f2a44" : "#fdba74",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back-outline" size={20} color={themed.accent as string} />
            <Text style={{ color: themed.accent, fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
              Volver a la página principal
            </Text>
          </TouchableOpacity>

          {/* Acciones */}
          <View style={{ marginTop: 8 }}>
            {editMode ? (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    marginRight: 6,
                    backgroundColor: themed.isDark ? "#0b1220" : "#fff7ed",
                    borderWidth: 1,
                    borderColor: themed.accent,
                  }}
                >
                  <Text style={{ color: themed.accent, fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    marginLeft: 6,
                    backgroundColor: themed.accent,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleEdit}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    marginBottom: 10,
                    backgroundColor: themed.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="pencil-outline" size={20} color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 8 }}>Editar perfil</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLogout}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    marginBottom: 10,
                    backgroundColor: themed.isDark ? "#0b1220" : "#fff7ed",
                    borderWidth: 1,
                    borderColor: themed.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="log-out-outline" size={20} color={themed.accent as string} />
                    <Text style={{ color: themed.accent, fontWeight: "600", marginLeft: 8 }}>
                      Cerrar sesión
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: themed.isDark ? "#2f0b0b" : "#fef2f2",
                    borderWidth: 1,
                    borderColor: themed.isDark ? "#7f1d1d" : "#ef4444",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                    <Text style={{ color: "#dc2626", fontWeight: "600", marginLeft: 8 }}>
                      Eliminar cuenta
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Spacer final (altura de tabbar) */}
          <View style={{ height: tabBarHeight }} />
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Picker Ciudad */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: themed.card, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: themed.border }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 12, color: themed.text }}>
              Selecciona una ciudad
            </Text>
            <Picker
              selectedValue={editedData.City_id}
              onValueChange={(value) => {
                const selectedCity = cityItems.find((i) => i.value === value);
                if (selectedCity) selectCity(selectedCity.value, selectedCity.name);
              }}
              dropdownIconColor={themed.text as string}
              style={{ color: themed.text }}
            >
              {cityItems.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} color={themed.text as string} />
              ))}
            </Picker>
            <TouchableOpacity
              onPress={() => setShowCityPicker(false)}
              style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: themed.isDark ? "#0b1220" : "#f3f4f6" }}
            >
              <Text style={{ textAlign: "center", fontWeight: "600", color: themed.text }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Picker Código Teléfono */}
      <Modal
        visible={showPhoneCodePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhoneCodePicker(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: themed.card, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: themed.border }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 12, color: themed.text }}>
              Selecciona código de país
            </Text>
            <Picker
              selectedValue={editedData.phoneCode}
              onValueChange={(value) => {
                setEditedData({ ...editedData, phoneCode: value as string });
                setShowPhoneCodePicker(false);
              }}
              dropdownIconColor={themed.text as string}
              style={{ color: themed.text }}
            >
              {phoneCodes.map((item) => (
                <Picker.Item key={item.code} label={`${item.code} (${item.country})`} value={item.code} color={themed.text as string} />
              ))}
            </Picker>
            <TouchableOpacity
              onPress={() => setShowPhoneCodePicker(false)}
              style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: themed.isDark ? "#0b1220" : "#f3f4f6" }}
            >
              <Text style={{ textAlign: "center", fontWeight: "600", color: themed.text }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Personalizado para Acciones de Usuario */}
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
                : (modalConfig.action === 'logout' || modalConfig.action === 'delete')
                ? (themed.isDark ? '#dc2626' : '#ef4444')
                : (themed.isDark ? '#dc2626' : '#ef4444'),
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Ionicons 
                name={
                  modalConfig.type === 'success' 
                    ? "checkmark" 
                    : modalConfig.action === 'logout'
                    ? "log-out-outline"
                    : modalConfig.action === 'delete'
                    ? "trash-outline"
                    : "alert-circle"
                } 
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

            {/* Botones */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              {modalConfig.type === 'error' && !modalConfig.action ? (
                // Modal de error simple
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    backgroundColor: themed.isDark ? '#dc2626' : '#ef4444',
                    paddingHorizontal: 32,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flex: 1,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Entendido
                  </Text>
                </TouchableOpacity>
              ) : modalConfig.action === 'logout' || modalConfig.action === 'delete' ? (
                // Modal de confirmación (logout/delete)
                <>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={{
                      flex: 1,
                      backgroundColor: themed.softBg,
                      borderWidth: 1,
                      borderColor: themed.border,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: themed.text,
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleModalAction}
                    style={{
                      flex: 1,
                      backgroundColor: modalConfig.action === 'logout' 
                        ? (themed.accent as string)
                        : '#ef4444',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      {modalConfig.action === 'logout' ? 'Cerrar Sesión' : 'Eliminar'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Modal de éxito (guardar/eliminar cuenta exitoso)
                <TouchableOpacity
  onPress={() => {
    setModalVisible(false);
    if (modalConfig.action === 'delete' && modalConfig.type === 'success') {
      AsyncStorage.removeItem("userToken");
      AsyncStorage.removeItem("userData");
      router.replace("/login");
    } else if (modalConfig.action === 'save' && modalConfig.type === 'success') {
      loadUserData();
      setEditMode(false);
    }
  }}
  style={{
    backgroundColor: modalConfig.type === 'success' 
      ? (themed.accent as string)
      : (themed.isDark ? '#dc2626' : '#ef4444'),
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center'
  }}
>
  <Text style={{
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  }}>
    Aceptar
  </Text>
</TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>   
  );
}

export default withAuth(ProfileScreen);