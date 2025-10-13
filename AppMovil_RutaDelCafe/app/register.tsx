import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  View
} from "react-native";
import * as Animatable from "react-native-animatable";

// Importar imágenes PNG/JPG de banderas
const LaPazFlag = require("../app/images/Banderas/LaPaz.jpg");
const CochabambaFlag = require("../app/images/Banderas/COCHABAMBA.jpg");
const SantaCruzFlag = require("../app/images/Banderas/Santa_Cruz.png");
const OruroFlag = require("../app/images/Banderas/Oruro.png");
const PotosiFlag = require("../app/images/Banderas/Potosi.jpg");
const TarijaFlag = require("../app/images/Banderas/Tarija.png");
const ChuquisacaFlag = require("../app/images/Banderas/Chuquisaca.png");
const BeniFlag = require("../app/images/Banderas/Beni.png");
const PandoFlag = require("../app/images/Banderas/Pando.png");

interface FormData {
  name: string;
  lastName: string;
  secondLastName: string | null;
  email: string;
  phoneCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
  City_id: number | null;
  photo: string | null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    lastName: "",
    secondLastName: "",
    email: "",
    phoneCode: "+591",
    phone: "",
    password: "",
    confirmPassword: "",
    City_id: null,
    photo: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showPhoneCodePicker, setShowPhoneCodePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const cityItems = [
    { label: "Selecciona una ciudad", value: null },
    { label: "La Paz", value: 1 },
    { label: "Cochabamba", value: 2 },
    { label: "Santa Cruz", value: 3 },
    { label: "Oruro", value: 4 },
    { label: "Potosí", value: 5 },
    { label: "Tarija", value: 6 },
    { label: "Chuquisaca", value: 7 },
    { label: "Beni", value: 8 },
    { label: "Pando", value: 9 },
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

  const getMaxPhoneLength = () => {
    const phoneCodeObj = phoneCodes.find(item => item.code === formData.phoneCode);
    return phoneCodeObj ? phoneCodeObj.maxLength : 15;
  };

  const isValidEmail = (email: string): { isValid: boolean; message: string } => {
    if (!email) return { isValid: false, message: "El correo electrónico es requerido" };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Formato de correo electrónico inválido" };
    }
    
    return { isValid: true, message: "" };
  };

  useEffect(() => {
    const calculatePasswordStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 6) strength += 1;
      if (password.length >= 8) strength += 1;
      if (/\d/.test(password)) strength += 1;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
      return Math.min(strength, 5);
    };
    setPasswordStrength(calculatePasswordStrength(formData.password));
  }, [formData.password]);

  useEffect(() => {
    if (formData.email) {
      const validation = isValidEmail(formData.email);
      setEmailError(validation.isValid ? "" : validation.message);
    } else {
      setEmailError("");
    }
  }, [formData.email]);

  useFocusEffect(
    useCallback(() => {
      setFormData({
        name: "",
        lastName: "",
        secondLastName: "",
        email: "",
        phoneCode: "+591",
        phone: "",
        password: "",
        confirmPassword: "",
        City_id: null,
        photo: null,
      });
      setSuccessMessage("");
      setErrorMessage("");
      setEmailError("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setPasswordStrength(0);
    }, [])
  );

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const getCityFlag = () => {
    switch (formData.City_id) {
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

  const handleChange = (name: keyof FormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [name]: value as never }));
  };

  const handlePhoneChange = (text: string) => {
    const maxLength = getMaxPhoneLength();
    const numericText = text.replace(/[^0-9]/g, "");
    
    if (numericText.length <= maxLength) {
      handleChange("phone", numericText);
    }
  };

  const handleEmailChange = (text: string) => {
    handleChange("email", text.toLowerCase());
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "#ef4444";
    if (passwordStrength === 1) return "#f97316";
    if (passwordStrength === 2) return "#eab308";
    if (passwordStrength === 3) return "#84cc16";
    if (passwordStrength === 4) return "#22c55e";
    if (passwordStrength === 5) return "#15803d";
    return "#d1d5db";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "Muy débil";
    if (passwordStrength === 1) return "Débil";
    if (passwordStrength === 2) return "Regular";
    if (passwordStrength === 3) return "Buena";
    if (passwordStrength === 4) return "Fuerte";
    if (passwordStrength === 5) return "Muy fuerte";
    return "";
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos de cámara para tomar fotos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64data = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData(prev => ({ ...prev, photo: base64data }));
        setSuccessMessage("Foto tomada correctamente");
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64data = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData(prev => ({ ...prev, photo: base64data }));
        setSuccessMessage("Foto seleccionada correctamente");
      }
    } catch (error) {
      console.error('Error al seleccionar foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo: null }));
    setSuccessMessage("Foto eliminada");
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    const onlyLettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const onlyNumbersRegex = /^[0-9]+$/;

    if (!formData.name || !formData.lastName || !formData.email || !formData.password || !formData.phone) {
      setErrorMessage("Por favor complete todos los campos obligatorios (*)");
      return;
    }
    if (!onlyLettersRegex.test(formData.name)) {
      setErrorMessage("El nombre solo puede contener letras");
      return;
    }
    if (!onlyLettersRegex.test(formData.lastName)) {
      setErrorMessage("El apellido paterno solo puede contener letras");
      return;
    }
    if (formData.secondLastName && !onlyLettersRegex.test(formData.secondLastName)) {
      setErrorMessage("El apellido materno solo puede contener letras");
      return;
    }

    const emailValidation = isValidEmail(formData.email);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.message);
      return;
    }

    if (!onlyNumbersRegex.test(formData.phone)) {
      setErrorMessage("El teléfono solo puede contener números");
      return;
    }

    const maxLength = getMaxPhoneLength();
    if (maxLength && formData.phone.length !== maxLength) {
      setErrorMessage(`El teléfono para ${formData.phoneCode} debe tener exactamente ${maxLength} dígitos`);
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (passwordStrength < 2) {
      setErrorMessage("La contraseña es demasiado débil. Use letras, números y caracteres especiales");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden");
      return;
    }
    if (!formData.City_id) {
      setErrorMessage("Por favor selecciona una ciudad");
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = formData.phoneCode + formData.phone;
      
      const submitData: any = {
        name: formData.name,
        lastName: formData.lastName,
        secondLastName: formData.secondLastName,
        email: formData.email,
        phone: fullPhone,
        password: formData.password,
        City_id: formData.City_id,
        role: 3,
      };

      if (formData.photo) {
        console.log("📸 Enviando foto - longitud:", formData.photo.length);
        submitData.photo = formData.photo;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Registro exitoso");
      
      setSuccessMessage("✅ Perfil creado exitosamente");
      setFormData({
        name: "",
        lastName: "",
        secondLastName: "",
        email: "",
        phoneCode: "+591",
        phone: "",
        password: "",
        confirmPassword: "",
        City_id: null,
        photo: null,
      });

      setTimeout(() => router.push("/(tabs)/advertisement"), 1500);
    } catch (error: unknown) {
      let errorMsg = "No se pudo conectar con el servidor";
      if (error instanceof Error) {
        console.error("❌ Error:", error);
        if (error.message.includes("400") || error.message.toLowerCase().includes("email")) {
          errorMsg = "El correo electrónico ya está registrado";
        } else if (error.message.includes("500")) {
          errorMsg = "Error interno del servidor";
        } else if (error.message.includes("Data too long")) {
          errorMsg = "La imagen es demasiado grande. Intenta con una imagen más pequeña.";
        } else {
          errorMsg = error.message;
        }
      }
      setErrorMessage("❌ " + errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedCityLabel = () => {
    const selected = cityItems.find((item) => item.value === formData.City_id);
    return selected ? selected.label : "Selecciona una ciudad";
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fffbeb' }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            minHeight: Platform.OS === "ios" ? "100%" : undefined,
          }}
          style={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >

          {/* Header */}
          <View style={{ 
            width: '100%', 
            height: 192, 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 24,
            backgroundColor: '#f97316',
            borderRadius: 24,
            padding: 20,
          }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              ¡Bienvenido!
            </Text>
            <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', marginTop: 4 }}>
              Completa tus datos para crear tu cuenta
            </Text>

            {/* Foto de perfil */}
            <View style={{ position: 'relative', marginTop: 12 }}>
              {formData.photo ? (
                <Image 
                  source={{ uri: formData.photo }} 
                  style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white' }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 40, 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  borderWidth: 4, 
                  borderColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ionicons name="person" size={30} color="white" />
                </View>
              )}
              
              <View style={{ position: 'absolute', bottom: -8, flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  onPress={handleTakePhoto}
                  style={{ backgroundColor: 'white', padding: 8, borderRadius: 20, elevation: 4 }}
                >
                  <Ionicons name="camera" size={14} color="#f97316" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleChoosePhoto}
                  style={{ backgroundColor: 'white', padding: 8, borderRadius: 20, elevation: 4 }}
                >
                  <Ionicons name="image" size={14} color="#f97316" />
                </TouchableOpacity>
                {formData.photo && (
                  <TouchableOpacity 
                    onPress={handleRemovePhoto}
                    style={{ backgroundColor: 'white', padding: 8, borderRadius: 20, elevation: 4 }}
                  >
                    <Ionicons name="trash" size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Mensajes */}
          {successMessage && (
            <Animatable.View
              animation="fadeIn"
              style={{ backgroundColor: '#fed7aa', padding: 12, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#ea580c' }}
            >
              <Text style={{ color: '#92400e', textAlign: 'center', fontWeight: '500' }}>{successMessage}</Text>
            </Animatable.View>
          )}
          {errorMessage && (
            <Animatable.View
              animation="shake"
              style={{ backgroundColor: '#fed7aa', padding: 12, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#dc2626' }}
            >
              <Text style={{ color: '#dc2626', textAlign: 'center', fontWeight: '500' }}>{errorMessage}</Text>
            </Animatable.View>
          )}

          {/* Nombre y Apellidos */}
          {[
            { key: "name", label: "Nombre *", placeholder: "Ingresa tu nombre", autoCapitalize: "words" as const },
            { key: "lastName", label: "Apellido Paterno *", placeholder: "Ingresa tu apellido paterno", autoCapitalize: "words" as const },
            { key: "secondLastName", label: "Apellido Materno", placeholder: "Opcional", autoCapitalize: "words" as const },
          ].map((field) => (
            <View key={field.key} className="mb-4">
              <Text className="font-semibold mb-1.5 text-orange-900">{field.label}</Text>
              <View className="rounded-xl border border-orange-300 bg-amber-50">
                <TextInput
                  value={(formData as any)[field.key] ?? ""}
                  onChangeText={(text) =>
                    handleChange(field.key as keyof FormData, text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor="#f97316"
                  autoCapitalize={field.autoCapitalize}
                  editable={!isLoading}
                  className="text-base text-orange-900 h-13 px-4"
                  returnKeyType="next"
                />
              </View>
            </View>
          ))}

          {/* Correo */}
          <View className="mb-4">
            <Text className="font-semibold mb-1.5 text-orange-900">Correo Electrónico *</Text>
            <View className={`rounded-xl border bg-amber-50 ${emailError ? "border-red-600" : "border-orange-300"}`}>
              <TextInput
                value={formData.email}
                onChangeText={handleEmailChange}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#f97316"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                className="text-base text-orange-900 h-13 px-4"
                returnKeyType="next"
              />
            </View>
            {emailError ? (
              <Text className="text-xs text-red-600 mt-1">{emailError}</Text>
            ) : (
              <Text className="text-xs text-orange-600 mt-1">
                Ej: usuario@gmail.com, nombre.apellido@hotmail.com
              </Text>
            )}
          </View>

          {/* Teléfono */}
          <View className="mb-4">
            <Text className="font-semibold mb-1.5 text-orange-900">Teléfono *</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  dismissKeyboard();
                  setShowPhoneCodePicker(true);
                }}
                className="rounded-xl border border-orange-300 bg-amber-50 mr-2 px-3 justify-center min-w-20 h-13"
              >
                <Text className="text-base text-orange-900 text-center">{formData.phoneCode}</Text>
              </TouchableOpacity>
              <View className="flex-1 rounded-xl border border-orange-300 bg-amber-50">
                <TextInput
                  value={formData.phone}
                  onChangeText={handlePhoneChange}
                  placeholder={`Ej: ${"0".repeat(getMaxPhoneLength() - 1)}`}
                  placeholderTextColor="#f97316"
                  keyboardType="number-pad"
                  editable={!isLoading}
                  maxLength={getMaxPhoneLength()}
                  className="text-base text-orange-900 h-13 px-4"
                  returnKeyType="next"
                />
              </View>
            </View>
            <Text className="text-xs text-orange-600 mt-1">
              Máximo {getMaxPhoneLength()} dígitos para {formData.phoneCode}
            </Text>
          </View>

          {/* Contraseña */}
          <View className="mb-4">
            <Text className="font-semibold mb-1.5 text-orange-900">Contraseña *</Text>
            <View className="rounded-xl border border-orange-300 bg-amber-50 flex-row items-center">
              <TextInput
                value={formData.password}
                onChangeText={(text) => handleChange("password", text)}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#f97316"
                secureTextEntry={!showPassword}
                editable={!isLoading}
                className="text-base text-orange-900 h-13 px-4 flex-1"
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-3">
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#f97316" />
              </TouchableOpacity>
            </View>

            {/* Barra de fortaleza */}
            {formData.password.length > 0 && (
              <View className="mt-2">
                <View className="flex-row mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      className="flex-1 h-1 mx-0.5 rounded-full"
                      style={{ backgroundColor: i <= passwordStrength ? getPasswordStrengthColor() : "#fed7aa" }}
                    />
                  ))}
                </View>
                <Text className="text-xs font-medium" style={{ color: getPasswordStrengthColor() }}>
                  {getPasswordStrengthText()}
                </Text>
              </View>
            )}
          </View>

          {/* Confirmar Contraseña */}
          <View className="mb-4">
            <Text className="font-semibold mb-1.5 text-orange-900">Confirmar Contraseña *</Text>
            <View className={`rounded-xl border bg-amber-50 flex-row items-center ${
              formData.password !== formData.confirmPassword && formData.confirmPassword.length > 0
                ? "border-red-600"
                : "border-orange-300"
            }`}>
              <TextInput
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange("confirmPassword", text)}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#f97316"
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading}
                className="text-base text-orange-900 h-13 px-4 flex-1"
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-3">
                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#f97316" />
              </TouchableOpacity>
            </View>
            {formData.password !== formData.confirmPassword && formData.confirmPassword.length > 0 && (
              <Text className="text-xs text-red-600 mt-1">Las contraseñas no coinciden</Text>
            )}
          </View>

          {/* Ciudad */}
          <View className="mb-4">
            <Text className="font-semibold mb-2 text-orange-900">Ciudad *</Text>
            <TouchableOpacity
              onPress={() => {
                dismissKeyboard();
                setShowCityPicker(true);
              }}
              className="p-4 rounded-xl bg-amber-50 border border-orange-300"
            >
              <View className="flex-row items-center">
                {getCityFlag()}
                <Text className={`text-base ml-2 ${formData.City_id ? "text-orange-900" : "text-orange-500"}`}>
                  {getSelectedCityLabel()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Botones */}
          <View className="mt-2.5 mb-7">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className={`p-3.5 rounded-xl items-center mb-3 border ${
                isLoading ? "bg-orange-200 border-orange-600" : "bg-orange-500 border-orange-600"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#7c2d12" />
              ) : (
                <Text className="text-white font-semibold text-sm">Crear Cuenta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/advertisement");
                }
              }}
              className="py-3 border border-orange-400 rounded-xl bg-orange-100"
            >
              <Text className="text-orange-700 font-medium text-base text-center">
                Volver
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modal Picker para Ciudad */}
      <Modal visible={showCityPicker} transparent animationType="slide" onRequestClose={() => setShowCityPicker(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-orange-50 p-5 rounded-t-2xl">
            <Text className="text-lg font-bold text-center mb-4 text-orange-900">
              Selecciona una ciudad
            </Text>
            <Picker selectedValue={formData.City_id} onValueChange={(value) => handleChange("City_id", value)}>
              {cityItems.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} color="#7c2d12" />
              ))}
            </Picker>
            <TouchableOpacity
              onPress={() => setShowCityPicker(false)}
              className="mt-4 p-3 rounded-xl bg-orange-200"
            >
              <Text className="text-center font-semibold text-orange-900">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Picker para Código de Teléfono */}
      <Modal visible={showPhoneCodePicker} transparent animationType="slide" onRequestClose={() => setShowPhoneCodePicker(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-orange-50 p-5 rounded-t-2xl">
            <Text className="text-lg font-bold text-center mb-4 text-orange-900">
              Selecciona código de país
            </Text>
            <Picker selectedValue={formData.phoneCode} onValueChange={(value) => handleChange("phoneCode", value)}>
              {phoneCodes.map((item) => (
                <Picker.Item key={item.code} label={`${item.code} (${item.country})`} value={item.code} color="#7c2d12" />
              ))}
            </Picker>
            <TouchableOpacity
              onPress={() => setShowPhoneCodePicker(false)}
              className="mt-4 p-3 rounded-xl bg-orange-200"
            >
              <Text className="text-center font-semibold text-orange-900">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}