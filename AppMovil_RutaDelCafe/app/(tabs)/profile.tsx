// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as Animatable from "react-native-animatable";
import { withAuth } from "../../components/ui/withAuth";

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
  avatar: string;
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
  avatar: string;
  notifications: boolean;
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
  const tabBarHeight = useBottomTabBarHeight();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showPhoneCodePicker, setShowPhoneCodePicker] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // 🔥 NUEVO: control de autenticación

  const [editedData, setEditedData] = useState<EditedData>({
    name: "",
    lastName: "",
    secondLastName: "",
    email: "",
    phoneCode: "+591",
    phone: "",
    City_id: 0,
    cityName: "",
    avatar: "",
    notifications: true,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const getCityFlag = (cityId: number) => {
    switch (cityId) {
      case 1: return <Image source={LaPazFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 2: return <Image source={CochabambaFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 3: return <Image source={SantaCruzFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 4: return <Image source={OruroFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 5: return <Image source={PotosiFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 6: return <Image source={TarijaFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 7: return <Image source={ChuquisacaFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 8: return <Image source={BeniFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
      case 9: return <Image source={PandoFlag} style={{ width: 40, height: 24 }} resizeMode="contain" />;
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
        // 🔥 NUEVO: Si no hay token, redirigir inmediatamente
        setIsAuthenticated(false);
        router.replace("/(tabs)/advertisement");
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

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
        avatar: data.user.avatar || "",
        notifications: true,
      });
    } catch {
      showAlert("error", "Error al cargar los datos del perfil");
      // 🔥 NUEVO: En caso de error, verificar autenticación
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setIsAuthenticated(false);
        router.replace("/(tabs)/advertisement");
      }
    } finally {
      setLoading(false);
    }
  };

  const getMaxPhoneLength = () => {
    const phoneCodeObj = phoneCodes.find((i) => i.code === editedData.phoneCode);
    return phoneCodeObj ? phoneCodeObj.maxLength : 15;
  };

  const showAlert = (type: "success" | "error", message: string) => {
    setAlertType(type);
    setAlertMessage(message);
    setAlertVisible(true);
    setTimeout(() => {
      setAlertVisible(false);
      if (type === "success" && message.includes("eliminada")) {
        router.replace("/(tabs)/advertisement");
      }
    }, 3000);
  };

  const handleEdit = () => setEditMode(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("userToken");

      const onlyLettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      const onlyNumbersRegex = /^[0-9]+$/;

      if (!editedData.name || !editedData.lastName || !editedData.email || !editedData.phone) {
        showAlert("error", "Por favor complete todos los campos obligatorios");
        return;
      }
      if (!onlyLettersRegex.test(editedData.name)) return showAlert("error", "El nombre solo puede contener letras");
      if (!onlyLettersRegex.test(editedData.lastName)) return showAlert("error", "El apellido paterno solo puede contener letras");
      if (editedData.secondLastName && !onlyLettersRegex.test(editedData.secondLastName))
        return showAlert("error", "El apellido materno solo puede contener letras");

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedData.email)) return showAlert("error", "Formato de correo electrónico inválido");

      if (!onlyNumbersRegex.test(editedData.phone)) return showAlert("error", "El teléfono solo puede contener números");

      const maxLength = getMaxPhoneLength();
      if (maxLength && editedData.phone.length !== maxLength)
        return showAlert("error", `El teléfono para ${editedData.phoneCode} debe tener exactamente ${maxLength} dígitos`);

      if (!editedData.City_id) return showAlert("error", "Por favor selecciona una ciudad");

      const fullPhone = editedData.phoneCode + editedData.phone;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`, {
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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al guardar los cambios");
      }

      showAlert("success", "Perfil editado correctamente");
      setEditMode(false);
      loadUserData();
    } catch (err: any) {
      showAlert("error", err?.message || "Error al guardar los cambios");
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
        avatar: user.avatar || "",
        notifications: true,
      });
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert("Eliminar cuenta", "¿Estás seguro? Esta acción es irreversible.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/profile`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Error al eliminar la cuenta");
            showAlert("success", "Cuenta eliminada correctamente");
            await AsyncStorage.removeItem("userToken");
            await AsyncStorage.removeItem("userData");
            setIsAuthenticated(false); // 🔥 NUEVO: Actualizar estado
            router.replace("/(tabs)/advertisement");
          } catch {
            showAlert("error", "Error al eliminar la cuenta");
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Quieres salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("userToken");
          await AsyncStorage.removeItem("userData");
          setIsAuthenticated(false); // 🔥 NUEVO: Actualizar estado
          router.replace("/(tabs)/advertisement");
        },
      },
    ]);
  };

  const selectCity = (cityId: number, cityName: string) => {
    setEditedData({ ...editedData, City_id: cityId, cityName });
    setShowCityPicker(false);
  };

  const handlePhoneChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    const maxLength = getMaxPhoneLength();
    if (numericText.length <= maxLength) setEditedData({ ...editedData, phone: numericText });
  };

  const dismissKeyboard = () => Keyboard.dismiss();
  const getSelectedCityLabel = () => cityItems.find((i) => i.value === editedData.City_id)?.label || "Selecciona una ciudad";
  const handleGoHome = () => router.replace("/(tabs)/advertisement");

  // 🔥 NUEVO: Si no está autenticado, mostrar loading o redirigir
  if (!isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="mt-4 text-gray-600">Redirigiendo...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="mt-4 text-gray-600">Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-orange-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView
          className="p-5"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: tabBarHeight + 32, // ✅ deja visible todo
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="w-full h-44 items-center justify-center mb-6 bg-orange-500 rounded-[40px] px-5 py-5">
            <Ionicons name="person-circle-outline" size={80} color="white" />
            <Text className="text-2xl font-bold text-white text-center">
              {editedData.name} {editedData.lastName}
            </Text>
            <Text className="text-white text-sm text-center mt-1">{editedData.email}</Text>
          </View>

          {/* Alertas */}
          {alertVisible && (
            <Animatable.View
              animation="fadeIn"
              className={`p-3.5 rounded-xl mb-4 ${alertType === "success" ? "bg-green-100" : "bg-red-100"}`}
            >
              <Text className={`text-center font-medium ${alertType === "success" ? "text-green-800" : "text-red-800"}`}>
                {alertMessage}
              </Text>
            </Animatable.View>
          )}

          {/* Card info */}
          <View className="bg-white rounded-2xl p-5 mb-5 shadow-lg">
            <Text className="text-xl font-bold mb-5 text-gray-800 text-center">Información personal</Text>

            {[
              { key: "name" as keyof EditedData, label: "Nombre *", placeholder: "Ingresa tu nombre" },
              { key: "lastName" as keyof EditedData, label: "Apellido Paterno *", placeholder: "Ingresa tu apellido paterno" },
              { key: "secondLastName" as keyof EditedData, label: "Apellido Materno", placeholder: "Opcional" },
            ].map((f) => (
              <View key={f.key} className="mb-4">
                <Text className="font-semibold mb-1.5 text-gray-600">{f.label}</Text>
                {editMode ? (
                  <View className="rounded-xl border border-gray-300 bg-white">
                    <TextInput
                      value={editedData[f.key] as string}
                      onChangeText={(t) => handleTextChange(f.key, t)}
                      placeholder={f.placeholder}
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="words"
                      editable={!saving}
                      className="text-base text-gray-900 h-13 px-4"
                    />
                  </View>
                ) : (
                  <Text className={`text-base py-3.5 px-1 ${editedData[f.key] ? "text-gray-600" : "text-gray-400"}`}>
                    {(editedData[f.key] as string) || "No especificado"}
                  </Text>
                )}
              </View>
            ))}

            {/* Correo */}
            <View className="mb-4">
              <Text className="font-semibold mb-1.5 text-gray-600">Correo Electrónico *</Text>
              {editMode ? (
                <View className="rounded-xl border border-gray-300 bg-white">
                  <TextInput
                    value={editedData.email}
                    onChangeText={(t) => handleTextChange("email", t)}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                    className="text-base text-gray-900 h-13 px-4"
                  />
                </View>
              ) : (
                <Text className={`text-base py-3.5 px-1 ${editedData.email ? "text-gray-600" : "text-gray-400"}`}>
                  {editedData.email || "No especificado"}
                </Text>
              )}
            </View>

            {/* Teléfono */}
            <View className="mb-4">
              <Text className="font-semibold mb-1.5 text-gray-600">Teléfono *</Text>
              {editMode ? (
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowPhoneCodePicker(true);
                    }}
                    className="rounded-xl border border-gray-300 bg-white mr-2 px-3 justify-center min-w-20 h-13"
                  >
                    <Text className="text-base text-gray-900 text-center">{editedData.phoneCode}</Text>
                  </TouchableOpacity>
                  <View className="flex-1 rounded-xl border border-gray-300 bg-white">
                    <TextInput
                      value={editedData.phone}
                      onChangeText={handlePhoneChange}
                      placeholder={`Ej: ${"0".repeat(Math.max(getMaxPhoneLength() - 1, 1))}`}
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      editable={!saving}
                      maxLength={getMaxPhoneLength()}
                      className="text-base text-gray-900 h-13 px-4"
                    />
                  </View>
                </View>
              ) : (
                <Text className={`text-base py-3.5 px-1 ${editedData.phone ? "text-gray-600" : "text-gray-400"}`}>
                  {editedData.phoneCode} {editedData.phone || "No especificado"}
                </Text>
              )}
            </View>

            {/* Ciudad */}
            <View className="mb-4">
              <Text className="font-semibold mb-2 text-gray-600">Ciudad *</Text>
              {editMode ? (
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCityPicker(true);
                  }}
                  className="p-4 rounded-xl bg-white border border-gray-300"
                >
                  <View className="flex-row items-center">
                    {getCityFlag(editedData.City_id)}
                    <Text className={`text-base ml-2 ${editedData.City_id ? "text-gray-600" : "text-gray-400"}`}>
                      {getSelectedCityLabel()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center py-2">
                  {getCityFlag(editedData.City_id)}
                  <Text className={`text-base ml-2 ${editedData.City_id ? "text-gray-600" : "text-gray-400"}`}>
                    {getSelectedCityLabel()}
                  </Text>
                </View>
              )}
            </View>
          </View>


          {/* Sección de Favoritos */}
          <TouchableOpacity
            onPress={() => router.push('/Place/favorites')}
            className="mb-4 p-4 rounded-xl bg-pink-100 border border-pink-300 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons name="heart" size={24} color="#ec4899" />
              <Text className="text-pink-700 font-semibold text-base ml-3">Mis Lugares Favoritos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ec4899" />
          </TouchableOpacity>

          {/* Ir a Home */}
          <TouchableOpacity
            onPress={handleGoHome}
            className="mb-4 p-4 rounded-xl bg-orange-100 border border-orange-300 flex-row items-center justify-center"
          >
            <Ionicons name="arrow-back-outline" size={20} color="#f97316" />
            <Text className="text-orange-600 font-semibold text-base ml-2">Volver a la página principal</Text>
          </TouchableOpacity>

          {/* Acciones */}
          <View className="mt-2.5">
            {editMode ? (
              <View className="flex-row">
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={saving}
                  className="flex-1 p-3.5 rounded-xl items-center mr-2 bg-orange-50 border border-orange-500"
                >
                  <Text className="text-orange-500 font-semibold text-sm">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  className={`flex-1 p-3.5 rounded-xl items-center ml-2 ${saving ? "bg-yellow-300" : "bg-orange-500"}`}
                >
                  {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-sm">Guardar</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={handleEdit} className="p-3.5 rounded-xl mb-3 bg-orange-500">
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="pencil-outline" size={20} color="#fff" />
                    <Text className="text-white font-semibold text-sm ml-2">Editar perfil</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogout} className="p-3.5 rounded-xl mb-3 bg-orange-50 border border-orange-500">
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="log-out-outline" size={20} color="#f97316" />
                    <Text className="text-orange-500 font-medium text-sm ml-2">Cerrar sesión</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDeleteAccount} className="p-3.5 rounded-xl bg-red-50 border border-red-500">
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                    <Text className="text-red-600 font-medium text-sm ml-2">Eliminar cuenta</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Spacer final = alto de la tabbar */}
          <View style={{ height: tabBarHeight }} />
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Picker Ciudad */}
      <Modal visible={showCityPicker} transparent animationType="slide" onRequestClose={() => setShowCityPicker(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white p-5 rounded-t-2xl">
            <Text className="text-lg font-bold text-center mb-4">Selecciona una ciudad</Text>
            <Picker
              selectedValue={editedData.City_id}
              onValueChange={(value) => {
                const selectedCity = cityItems.find((i) => i.value === value);
                if (selectedCity) selectCity(selectedCity.value, selectedCity.name);
              }}
            >
              {cityItems.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
            <TouchableOpacity onPress={() => setShowCityPicker(false)} className="mt-4 p-3 rounded-xl bg-gray-100">
              <Text className="text-center font-semibold text-gray-900">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Picker Código Teléfono */}
      <Modal visible={showPhoneCodePicker} transparent animationType="slide" onRequestClose={() => setShowPhoneCodePicker(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white p-5 rounded-t-2xl">
            <Text className="text-lg font-bold text-center mb-4">Selecciona código de país</Text>
            <Picker
              selectedValue={editedData.phoneCode}
              onValueChange={(value) => {
                setEditedData({ ...editedData, phoneCode: value as string });
                setShowPhoneCodePicker(false);
              }}
            >
              {phoneCodes.map((item) => (
                <Picker.Item key={item.code} label={`${item.code} (${item.country})`} value={item.code} />
              ))}
            </Picker>
            <TouchableOpacity onPress={() => setShowPhoneCodePicker(false)} className="mt-4 p-3 rounded-xl bg-gray-100">
              <Text className="text-center font-semibold text-gray-900">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

export default withAuth(ProfileScreen);