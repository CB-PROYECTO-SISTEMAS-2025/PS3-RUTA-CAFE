import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Image
} from "react-native";
import * as Animatable from "react-native-animatable";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertMessage, setAlertMessage] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 📊 Calcular fortaleza de la contraseña
  useEffect(() => {
    const calculatePasswordStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 8) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[a-z]/.test(password)) strength += 1;
      if (/\d/.test(password)) strength += 1;
      if (/[@$!%*?&]/.test(password)) strength += 1;
      return Math.min(strength, 5);
    };
    setPasswordStrength(calculatePasswordStrength(newPassword));
  }, [newPassword]);

  // Validar formulario completo
  useEffect(() => {
    const strongPassword =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[@$!%*?&]/.test(newPassword);
    
    setIsFormValid(email.length > 0 && strongPassword);
  }, [email, newPassword]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "#ef4444";
    if (passwordStrength === 1) return "#f97316";
    if (passwordStrength === 2) return "#eab308";
    if (passwordStrength === 3) return "#84cc16";
    if (passwordStrength === 4) return "#22c55e";
    if (passwordStrength === 5) return "#15803d";
    return "#FFE0B2";
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

  const showAlert = (
    type: "success" | "error",
    message: string,
    onClose?: () => void
  ) => {
    setAlertType(type);
    setAlertMessage(message);
    setAlertVisible(true);

    setTimeout(() => {
      setAlertVisible(false);
      if (onClose) onClose();
    }, 2500);
  };

  const handleForgotPassword = async () => {
    if (!email || !newPassword) {
      showAlert("error", "Por favor llena todos los campos");
      return;
    }

    const strongPassword =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[@$!%*?&]/.test(newPassword);

    if (!strongPassword) {
      showAlert("error", "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo");
      return;
    }

    try {
      setLoading(true);
     const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, newPassword }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Error parsing JSON:", e, text);
        showAlert("error", "Respuesta inválida del servidor");
        return;
      }

      if (!response.ok) {
        showAlert("error", data.message || `Error: ${response.status} ${response.statusText}`);
        return;
      }

      showAlert("success", data.message || "Contraseña actualizada correctamente", () => {
        router.replace("/login");
      });
    } catch (error) {
      console.error("Error completo:", error);
      showAlert("error", "Error al conectar con el servidor. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setEmail("");
      setNewPassword("");
      setPasswordStrength(0);
      setAlertVisible(false);
      setLoading(false);
      setShowPassword(false);
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-[#fcaa70]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ 
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingVertical: Platform.OS === "ios" ? 40 : 20
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 🔔 Alertas */}
            {alertVisible && (
              <Animatable.View
                animation="fadeInDown"
                duration={400}
                className={`absolute top-5 left-5 right-5 p-4 rounded-xl flex-row items-center z-50 ${
                  alertType === "success" ? "bg-orange-600" : "bg-red-600"
                }`}
                style={{
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 }
                }}
              >
                <Text className="text-white text-sm flex-1">{alertMessage}</Text>
              </Animatable.View>
            )}

            {/* Logotipo - TAMAÑO AJUSTADO */}
            <View className="items-center mb-8 mt-4">
              <Image
                source={require("../app/images/LOGOTIPO.png")}
                className="w-64 h-32 mb-6"
                resizeMode="contain"
              />
            </View>

            {/* Título */}
            <View className="mb-8 items-center">
              <Text className="text-2xl font-bold text-orange-900 text-center mb-2">
                Recuperar Contraseña 🔑
              </Text>
              <Text className="text-base text-orange-700 text-center">
                Ingresa tu correo y tu nueva contraseña
              </Text>
            </View>

            {/* Email */}
            <View className="mb-6">
              <Text className="text-orange-900 mb-2 font-medium text-base">
                Correo electrónico
              </Text>
              <TextInput
                placeholder="tu@email.com"
                placeholderTextColor="#FF8C00"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                className="w-full bg-orange-100 px-4 py-3 rounded-xl border border-orange-300 text-orange-900 text-base"
              />
            </View>

            {/* Nueva contraseña */}
            <View className="mb-6">
              <Text className="text-orange-900 mb-2 font-medium text-base">
                Nueva contraseña
              </Text>
              <View className="relative">
                <TextInput
                  placeholder="Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo"
                  placeholderTextColor="#FF8C00"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  className="w-full bg-orange-100 px-4 py-3 rounded-xl border border-orange-300 pr-12 text-orange-900 text-base"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3"
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={24} 
                    color="#FF8C00" 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Indicador de fortaleza de contraseña */}
              <View className="mt-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-orange-700">
                    Seguridad: 
                  </Text>
                  <Text 
                    className="text-sm font-medium"
                    style={{ color: getPasswordStrengthColor() }}
                  >
                    {getPasswordStrengthText()}
                  </Text>
                </View>
                
                <View className="h-2 bg-orange-200 rounded-full overflow-hidden mb-2">
                  <View
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor(),
                    }}
                  />
                </View>
                
                <Text className="text-xs text-orange-600 mt-1">
                  Requerido: 8+ caracteres, mayúscula, minúscula, número y símbolo
                </Text>
              </View>
            </View>

            {/* Botón Actualizar Contraseña */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={loading || !isFormValid}
              className={`py-4 rounded-xl mb-4 ${
                loading ? "bg-orange-400" : (isFormValid ? "bg-orange-600" : "bg-orange-300")
              }`}
              style={{
                elevation: 3,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 }
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base text-center">
                  Actualizar Contraseña
                </Text>
              )}
            </TouchableOpacity>

            {/* Botón volver */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="py-3 border border-orange-400 rounded-xl bg-orange-100"
            >
              <Text className="text-orange-700 font-medium text-base text-center">
                Volver al inicio de sesión
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}