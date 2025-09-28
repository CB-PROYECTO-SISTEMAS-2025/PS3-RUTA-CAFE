import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
} from "react-native";
import * as Animatable from "react-native-animatable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertMessage, setAlertMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const showAlert = (
    type: "success" | "error",
    message: string,
    onClose?: () => void
  ) => {
    setAlertType(type);
    setAlertMessage(message);
    setAlertVisible(true);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      setAlertVisible(false);
      if (onClose) onClose();
    }, 2500);

    setTimeoutId(newTimeoutId as unknown as number);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("error", "Por favor ingresa tu correo y contraseña");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert("error", "Correo electrónico inválido");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password }),
      });


      let data;
      try {
        const textResponse = await response.text();
        data = JSON.parse(textResponse);
      } catch (jsonError) {
        throw new Error("Formato de respuesta inesperado del servidor");
      }

      if (!response.ok) {
        showAlert("error", data.message || `Error (${response.status})`);
        return;
      }
      
      if (data.token) {
        await AsyncStorage.setItem("userToken", data.token);
        if (data.user) {
          await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        }
      }

      showAlert("success", data.message || "Inicio de sesión exitoso", () => {
        router.replace("/(tabs)");
      });

    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("Network request failed")) {
          showAlert("error", "No se pudo conectar con el servidor. Verifica tu conexión.");
        } else if (err.message.includes("JSON")) {
          showAlert("error", "Error en la respuesta del servidor");
        } else {
          showAlert("error", err.message);
        }
      } else {
        showAlert("error", "Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

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
              justifyContent: "center",
              paddingHorizontal: 20,
              paddingVertical: 24
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 🔔 Banner de notificación */}
            {alertVisible && (
              <Animatable.View
                animation="fadeInDown"
                duration={400}
                className={`absolute top-4 left-5 right-5 z-50 py-3 px-4 rounded-xl shadow-lg flex-row items-center ${alertType === "success" ? "bg-orange-500" : "bg-red-500"}`}
                style={{
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 }
                }}
              >
                <Text className="text-white text-base mr-2">
                  {alertType === "success" ? <Text>✅</Text> : <Text>❌</Text>}
                </Text>
                <Text className="text-white text-sm flex-1">
                  {alertMessage}
                </Text>
              </Animatable.View>
            )}

            {/* Logo y bienvenida */}
            <View className="items-center mb-8">
              <Image
                source={require("../app/images/LOGOTIPO.png")}
                style={{ width: 200, height: 80, marginBottom: 16 }}
                resizeMode="contain"
              />
              <Text className="text-2xl font-bold text-orange-900 text-center mb-2">
                Bienvenido a Ruta del Sabor
              </Text>
              <Text className="text-sm text-orange-700 text-center">
                Descubre el auténtico sabor de nuestra región
              </Text>
            </View>

            {/* Inputs */}
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
                className="w-full bg-orange-100 px-4 py-3 rounded-xl mb-4 text-orange-900 text-base border border-orange-300"
              />

              <Text className="text-orange-900 mb-2 font-medium text-base">
                Contraseña
              </Text>
              <View className="w-full bg-orange-100 rounded-xl border border-orange-300 flex-row items-center mb-4">
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#FF8C00"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  className="flex-1 px-4 py-3 text-orange-900 text-base"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-3"
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#FF8C00"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="self-end mt-2"
                onPress={() => router.push("/forgot-password")}
              >
                <Text className="text-orange-700 text-sm">
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botón login */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className={`py-4 rounded-xl shadow-lg mb-4 ${loading ? "bg-orange-400" : "bg-orange-600"}`}
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
                <Text className="text-white text-base font-semibold text-center">
                  Iniciar Sesión
                </Text>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-orange-400" />
              <Text className="text-orange-700 px-3 text-sm">
                o
              </Text>
              <View className="flex-1 h-px bg-orange-400" />
            </View>

            {/* Registro */}
            <View className="flex-row justify-center mb-6">
              <Text className="text-orange-700 text-base">
                ¿No tienes cuenta?
              </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text className="text-orange-900 font-semibold ml-2 text-base">
                  Únete a nosotros
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botón volver */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="py-3 border border-orange-400 rounded-xl bg-orange-100"
            >
              <Text className="text-orange-700 font-medium text-base text-center">
                Volver
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}