import { useRouter, useFocusEffect } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Image,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import * as Animatable from "react-native-animatable";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

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

  // Códigos de teléfono de países latinoamericanos y longitud máxima
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

  // Obtener la longitud máxima para el código de teléfono actual
  const getMaxPhoneLength = () => {
    const phoneCodeObj = phoneCodes.find(item => item.code === formData.phoneCode);
    return phoneCodeObj ? phoneCodeObj.maxLength : 15;
  };

  // Validación de email
  const isValidEmail = (email: string): { isValid: boolean; message: string } => {
    if (!email) return { isValid: false, message: "El correo electrónico es requerido" };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Formato de correo electrónico inválido" };
    }
    
    return { isValid: true, message: "" };
  };

  // Calcular fortaleza de la contraseña
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

  // Validar email cuando cambia
  useEffect(() => {
    if (formData.email) {
      const validation = isValidEmail(formData.email);
      setEmailError(validation.isValid ? "" : validation.message);
    } else {
      setEmailError("");
    }
  }, [formData.email]);

  // Reiniciar estado cuando la pantalla obtiene foco
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
      case 1:
        return <Image source={LaPazFlag} className="w-10 h-6 contain" />;
      case 2:
        return <Image source={CochabambaFlag} className="w-10 h-6 contain" />;
      case 3:
        return <Image source={SantaCruzFlag} className="w-10 h-6 contain" />;
      case 4:
        return <Image source={OruroFlag} className="w-10 h-6 contain" />;
      case 5:
        return <Image source={PotosiFlag} className="w-10 h-6 contain" />;
      case 6:
        return <Image source={TarijaFlag} className="w-10 h-6 contain" />;
      case 7:
        return <Image source={ChuquisacaFlag} className="w-10 h-6 contain" />;
      case 8:
        return <Image source={BeniFlag} className="w-10 h-6 contain" />;
      case 9:
        return <Image source={PandoFlag} className="w-10 h-6 contain" />;
      default:
        return null;
    }
  };

  const handleChange = (name: keyof FormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [name]: value as never }));
  };

  // Manejar cambio de teléfono con validación de longitud
  const handlePhoneChange = (text: string) => {
    const maxLength = getMaxPhoneLength();
    const numericText = text.replace(/[^0-9]/g, "");
    
    if (numericText.length <= maxLength) {
      handleChange("phone", numericText);
    }
  };

  // Manejar cambio de email con validación en tiempo real
  const handleEmailChange = (text: string) => {
    handleChange("email", text.toLowerCase());
  };

  // Colores de fortaleza
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

  const handleSubmit = async () => {
    if (isLoading) return;

    // Validaciones
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

    // Validación de email
    const emailValidation = isValidEmail(formData.email);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.message);
      return;
    }

    if (!onlyNumbersRegex.test(formData.phone)) {
      setErrorMessage("El teléfono solo puede contener números");
      return;
    }

    // Validación extendida de teléfono con códigos de país
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
      // Combinar el código de país con el número de teléfono
      const fullPhone = formData.phoneCode + formData.phone;
      
      console.log("Datos a enviar:", {
        name: formData.name,
        lastName: formData.lastName,
        secondLastName: formData.secondLastName,
        email: formData.email,
        phone: fullPhone,
        password: formData.password,
        City_id: formData.City_id,
        role: 3,
      });

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          lastName: formData.lastName,
          secondLastName: formData.secondLastName,
          email: formData.email,
          phone: fullPhone,
          password: formData.password,
          City_id: formData.City_id,
          role: 3,
        }),
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          throw new Error(data.message || `Error HTTP: ${response.status}`);
        } else {
          const text = await response.text();
          throw new Error(text || `Error HTTP: ${response.status}`);
        }
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("Respuesta del servidor:", data);
        
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
        });

        setTimeout(() => router.push("/(tabs)/advertisement"), 1500);
      } else {
        throw new Error("Formato de respuesta inesperado del servidor");
      }
    } catch (error: unknown) {
      let errorMsg = "No se pudo conectar con el servidor";
      if (error instanceof Error) {
        console.error("Error completo:", error);
        if (error.message.includes("400") || error.message.toLowerCase().includes("email")) {
          errorMsg = "El correo electrónico ya está registrado";
        } else if (error.message.includes("500")) {
          errorMsg = "Error interno del servidor";
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
      className="flex-1 bg-orange-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            minHeight: Platform.OS === "ios" ? "100%" : undefined,
          }}
          className="p-5 pb-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >

          {/* Header */}
          <View className="w-full h-48 items-center justify-center mb-6 bg-orange-500 rounded-3xl px-5 py-5">
            <Text className="text-3xl font-bold text-white">
              ¡Bienvenido!
            </Text>
            <Text className="text-white text-base text-center mt-1">
              Completa tus datos para crear tu cuenta
            </Text>

            {/* Logotipo */}
            <Image
              source={require("../app/images/LOGOTIPO.png")}
              className="w-48 h-28 contain"
            />
          </View>

          {/* Mensajes */}
          {successMessage && (
            <Animatable.View
              animation="fadeIn"
              className="bg-orange-200 p-3 rounded-xl mb-4 border-l-4 border-l-orange-600"
            >
              <Text className="text-orange-800 text-center font-medium">{successMessage}</Text>
            </Animatable.View>
          )}
          {errorMessage && (
            <Animatable.View
              animation="shake"
              className="bg-orange-200 p-3 rounded-xl mb-4 border-l-4 border-l-red-600"
            >
              <Text className="text-red-700 text-center font-medium">{errorMessage}</Text>
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

           {/* Botón volver */}
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/advertisement"); // 👈 envía al home
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