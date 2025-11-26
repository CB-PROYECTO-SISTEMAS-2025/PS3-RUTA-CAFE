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
import { useThemedStyles } from "../hooks/useThemedStyles";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const themed = useThemedStyles(); // 🎨 tema oscuro/claro

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertMessage, setAlertMessage] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 📊 Calcular fortaleza
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

  // ✅ Validación de formulario
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
    return themed.accent as string;
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

  const showAlert = (type: "success" | "error", message: string, onClose?: () => void) => {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: themed.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
            style={{ backgroundColor: themed.background }}
          >
            {/* 🔔 Alertas */}
            {alertVisible && (
              <Animatable.View
                animation="fadeInDown"
                duration={400}
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  right: 20,
                  padding: 14,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  zIndex: 50,
                  backgroundColor:
                    alertType === "success"
                      ? (themed.isDark ? "#16a34a" : "#ea580c")
                      : (themed.isDark ? "#b91c1c" : "#dc2626"),
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 }
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, flex: 1 }}>{alertMessage}</Text>
              </Animatable.View>
            )}

            {/* Logotipo */}
            <View style={{ alignItems: "center", marginBottom: 32, marginTop: 16 }}>
              <Image
                source={require("../app/images/LOGOTIPO.png")}
                style={{ width: 256, height: 128, marginBottom: 24 }}
                resizeMode="contain"
              />
            </View>

            {/* Título */}
            <View style={{ marginBottom: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: themed.text, textAlign: "center", marginBottom: 6 }}>
                Recuperar Contraseña 🔑
              </Text>
              <Text style={{ fontSize: 16, color: themed.muted as string, textAlign: "center" }}>
                Ingresa tu correo y tu nueva contraseña
              </Text>
            </View>

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: themed.text, marginBottom: 8, fontWeight: "600", fontSize: 16 }}>
                Correo electrónico
              </Text>
              <View
                style={{
                  backgroundColor: themed.isDark ? "#0B1220" : "#FFFFFF",
                  borderColor: themed.border,
                  borderWidth: 1,
                  borderRadius: 14
                }}
              >
                <TextInput
                  placeholder="tu@email.com"
                  placeholderTextColor={themed.muted as string}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={{ paddingHorizontal: 14, paddingVertical: 12, color: themed.text, fontSize: 16 }}
                />
              </View>
            </View>

            {/* Nueva contraseña */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: themed.text, marginBottom: 8, fontWeight: "600", fontSize: 16 }}>
                Nueva contraseña
              </Text>
              <View style={{ position: "relative" }}>
                <View
                  style={{
                    backgroundColor: themed.isDark ? "#0B1220" : "#FFFFFF",
                    borderColor: themed.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    paddingRight: 44
                  }}
                >
                  <TextInput
                    placeholder="Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo"
                    placeholderTextColor={themed.muted as string}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    style={{ paddingHorizontal: 14, paddingVertical: 12, color: themed.text, fontSize: 16 }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 10, top: 10, padding: 6 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color={themed.accent as string}
                  />
                </TouchableOpacity>
              </View>

              {/* Indicador de fortaleza */}
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: themed.muted as string }}>Seguridad:</Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: getPasswordStrengthColor() }}>
                    {getPasswordStrengthText()}
                  </Text>
                </View>

                <View style={{ height: 8, backgroundColor: themed.isDark ? "#1f2937" : "#fde68a", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                  <View
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  />
                </View>

                <Text style={{ fontSize: 12, color: themed.muted as string }}>
                  Requerido: 8+ caracteres, mayúscula, minúscula, número y símbolo
                </Text>
              </View>
            </View>

            {/* Botón Actualizar Contraseña */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={loading || !isFormValid}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                marginBottom: 12,
                backgroundColor: loading ? (themed.isDark ? "#334155" : "#fb923c") : (isFormValid ? (themed.accent as string) : (themed.isDark ? "#1f2937" : "#fdba74")),
                alignItems: "center",
                justifyContent: "center",
                elevation: 3,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 }
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}>
                  Actualizar Contraseña
                </Text>
              )}
            </TouchableOpacity>

            {/* Botón volver */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: themed.isDark ? "#0b1220" : "#fff7ed",
                borderWidth: 1,
                borderColor: themed.accent,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: themed.accent as string, fontWeight: "600", fontSize: 16 }}>
                Volver al inicio de sesión
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
