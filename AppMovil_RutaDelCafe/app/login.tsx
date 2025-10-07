import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import * as Animatable from "react-native-animatable";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error" | "info">("success");
  const [alertMessage, setAlertMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [userHasFingerprint, setUserHasFingerprint] = useState(false);
  const [isCheckingFingerprint, setIsCheckingFingerprint] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"traditional" | "fingerprint">("traditional");
  const [storedFingerprintId, setStoredFingerprintId] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);

  // Verificar disponibilidad de biometría al cargar el componente
  useEffect(() => {
    checkBiometricAvailability();
    loadStoredFingerprint();
  }, []);

  // Verificar estado de huella cuando el email cambia
  useEffect(() => {
    if (email && email.includes('@')) {
      checkFingerprintStatusForEmail(email);
    }
  }, [email]);

  const checkBiometricAvailability = async () => {
    try {
      console.log("🔍 Verificando disponibilidad de biometría...");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      console.log("🔐 Biometría disponible:", { hasHardware, isEnrolled, supportedTypes });

      setBiometricAvailable(hasHardware && isEnrolled);
      
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('facial');
      }
    } catch (error) {
      console.error("❌ Error verificando biometría:", error);
      setBiometricAvailable(false);
    }
  };

  // Cargar fingerprint ID almacenado
  const loadStoredFingerprint = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.fingerprintId) {
          setStoredFingerprintId(user.fingerprintId);
          setUserHasFingerprint(true);
          console.log("🆔 Fingerprint ID cargado:", user.fingerprintId);
        }
      }
    } catch (error) {
      console.error("Error cargando fingerprint:", error);
    }
  };

  // Verificar estado de huella para un email específico
  const checkFingerprintStatusForEmail = async (userEmail: string) => {
    if (!userEmail.includes('@')) return;
    
    try {
      console.log("🔍 Verificando estado de huella para:", userEmail);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/check-fingerprint`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Estado de huella para", userEmail, ":", data);
        
        // Actualizar estado basado en la respuesta del servidor
        setUserHasFingerprint(data.hasFingerprint);
        if (data.fingerprintId) {
          setStoredFingerprintId(data.fingerprintId);
        }
      } else {
        console.log("❌ Error verificando estado de huella:", response.status);
        // Por defecto, asumir que no tiene huella
        setUserHasFingerprint(false);
      }
    } catch (error) {
      console.error("❌ Error verificando estado de huella:", error);
      setUserHasFingerprint(false);
    }
  };

  const showAlert = (
    type: "success" | "error" | "info",
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
    }, 3000);

    setTimeoutId(newTimeoutId as unknown as number);
  };

  // Función para verificar si el usuario puede registrar huella
  const checkFingerprintEligibility = async (userEmail: string): Promise<boolean> => {
    try {
      console.log("🔍 Verificando elegibilidad para huella...");
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/check-fingerprint`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Estado de huella:", data);
        
        // Guardar el fingerprint ID si está disponible
        if (data.fingerprintId) {
          setStoredFingerprintId(data.fingerprintId);
        }
        
        return data.canRegister;
      }
      console.log("❌ Error verificando elegibilidad:", response.status);
      return false;
    } catch (error) {
      console.error("❌ Error verificando elegibilidad de huella:", error);
      return false;
    }
  };

  // ✅ FUNCIÓN ÚNICA PARA LOGIN CON HUELLA - Se adapta automáticamente
  const handleFingerprintLogin = async () => {
    try {
      if (!email) {
        showAlert("error", "Por favor ingresa tu email primero");
        return;
      }

      if (!email.includes('@')) {
        showAlert("error", "Por favor ingresa un email válido");
        return;
      }

      setLoading(true);
      setLoginMethod("fingerprint");
      
      // Determinar el mensaje según el tipo de login
      const promptMessage = userHasFingerprint 
        ? 'Login rápido con huella dactilar' 
        : 'Iniciar sesión con huella dactilar';
      
      console.log(`🔑 ${userHasFingerprint ? 'Login rápido' : 'Login con email'} + huella para:`, email);
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log("✅ Autenticación biométrica exitosa");
        
        if (userHasFingerprint && storedFingerprintId) {
          // ✅ LOGIN RÁPIDO: Usuario YA tiene huella registrada
          console.log("🆔 Login rápido con fingerprint ID:", storedFingerprintId);
          await handleLoginWithFingerprintOnly(storedFingerprintId);
        } else {
          // ✅ LOGIN CON EMAIL + HUELLA: Usuario NO tiene huella registrada
          console.log("📧 Login con email + huella para:", email);
          await handleLoginWithFingerprintAndEmail(email.trim());
        }
      } else {
        console.log("❌ Autenticación biométrica fallida o cancelada:", result.error);
        if (result.error !== 'user_cancel') {
          showAlert("error", "Autenticación biométrica fallida");
        }
      }
    } catch (error) {
      console.error("❌ Error en autenticación biométrica:", error);
      showAlert("error", "Error en autenticación biométrica");
    } finally {
      setLoading(false);
    }
  };

  // Login con huella + email (para usuarios sin huella registrada)
  const handleLoginWithFingerprintAndEmail = async (userEmail: string) => {
    try {
      console.log("🌍 Enviando login con huella + email al servidor...");
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`;
      
      // Primero necesitamos obtener el fingerprint ID esperado
      const fingerprintResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/check-fingerprint`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!fingerprintResponse.ok) {
        showAlert("error", "No se pudo verificar el estado de huella");
        return;
      }

      const fingerprintData = await fingerprintResponse.json();
      const expectedFingerprintId = fingerprintData.fingerprintId;

      if (!expectedFingerprintId) {
        showAlert("error", "Huella no registrada para este email");
        return;
      }

      // Ahora hacer login con el fingerprint ID
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          fingerprint_id: expectedFingerprintId,
          email: userEmail 
        }),
      });

      const textResponse = await response.text();
      console.log("📡 Respuesta del servidor (huella + email):", textResponse.substring(0, 200));

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error("❌ Error parseando JSON:", e);
        showAlert("error", "Error en la respuesta del servidor");
        return;
      }

      if (!response.ok) {
        console.log("❌ Error en login con huella:", data);
        showAlert("error", data.message || "Huella no registrada para este email");
        return;
      }

      console.log("✅ Login con huella exitoso");
      
      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      setUserHasFingerprint(data.user.hasFingerprint);
      
      showAlert("success", data.message || "Inicio de sesión exitoso con huella", () => {
        router.replace("/(tabs)/advertisement");
      });

    } catch (err) {
      console.error("🔥 Error en login con huella:", err);
      showAlert("error", "Error de conexión con el servidor");
    }
  };

  // Login rápido solo con huella (para usuarios con huella registrada)
  const handleLoginWithFingerprintOnly = async (fingerprintId: string) => {
    try {
      console.log("🌍 Enviando login solo con huella al servidor...");
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          fingerprint_id: fingerprintId
        }),
      });

      const textResponse = await response.text();
      console.log("📡 Respuesta del servidor (solo huella):", textResponse.substring(0, 200));

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error("❌ Error parseando JSON:", e);
        showAlert("error", "Error en la respuesta del servidor");
        return;
      }

      if (!response.ok) {
        console.log("❌ Error en login con huella:", data);
        showAlert("error", data.message || "Huella no registrada");
        return;
      }

      console.log("✅ Login con huella exitoso");
      
      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      setUserHasFingerprint(data.user.hasFingerprint);
      
      // Actualizar el email en el campo si el login fue exitoso
      if (data.user.email) {
        setEmail(data.user.email);
      }
      
      showAlert("success", data.message || "Inicio de sesión exitoso con huella", () => {
        router.replace("/(tabs)/advertisement");
      });

    } catch (err) {
      console.error("🔥 Error en login con huella:", err);
      showAlert("error", "Error de conexión con el servidor");
    }
  };

  // ✅ CORREGIDO: Función para registrar huella después del login
  const registerFingerprintAfterLogin = async () => {
    try {
      setLoading(true);
      console.log("📝 Iniciando registro de huella después del login...");
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Registrar huella dactilar para accesos futuros',
        fallbackLabel: 'Cancelar registro',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log("✅ Autenticación biométrica exitosa para registro");
        
        // ✅ CORREGIDO: Enviar SOLO email y password, el servidor generará el fingerprint ID
        const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/register-fingerprint`;
        console.log("🌍 URL de registro:", url);
        
        const response = await fetch(url, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ 
            email: email.trim(), 
            password
          }),
        });

        const textResponse = await response.text();
        console.log("📡 Respuesta del servidor (registro):", textResponse);

        let data;
        try {
          data = JSON.parse(textResponse);
        } catch (e) {
          console.error("❌ Error parseando JSON:", e);
          showAlert("error", "Error en la respuesta del servidor");
          return;
        }

        if (!response.ok) {
          console.log("❌ Error registrando huella:", data);
          showAlert("error", data.message || "Error al registrar huella");
          return;
        }

        console.log("✅ Huella registrada exitosamente");
        console.log("🆔 Fingerprint ID generado:", data.user?.fingerprintId);
        
        await AsyncStorage.setItem("userToken", data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        setUserHasFingerprint(true);
        setStoredFingerprintId(data.user.fingerprintId);
        setShowFingerprintModal(false);
        
        showAlert("success", "¡Huella registrada exitosamente! 🎉", () => {
          router.replace("/(tabs)/advertisement");
        });

      } else {
        console.log("❌ Registro de huella cancelado por el usuario");
        showAlert("info", "Registro de huella cancelado");
        // Continuar sin registrar huella
        skipFingerprintRegistration();
      }
    } catch (error) {
      console.error("❌ Error en registro de huella:", error);
      showAlert("error", "Error al registrar huella");
      // En caso de error, continuar sin huella
      skipFingerprintRegistration();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("error", "Por favor ingresa email y contraseña");
      return;
    }

    if (!email.includes('@')) {
      showAlert("error", "Por favor ingresa un email válido");
      return;
    }

    console.log("🚀 Intentando login tradicional con:", email);
    setLoginMethod("traditional");

    try {
      setLoading(true);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`;
      console.log("🌍 URL de login:", url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const textResponse = await response.text();
      console.log("📡 Respuesta del servidor:", textResponse.substring(0, 200));

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error("❌ Error parseando JSON:", e);
        showAlert("error", "Error en la respuesta del servidor");
        return;
      }

      if (!response.ok) {
        console.log("❌ Error en login:", data);
        showAlert("error", data.message || `Error (${response.status})`);
        return;
      }

      console.log("✅ Login exitoso");
      
      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      setUserHasFingerprint(data.user.hasFingerprint);
      
      // Verificar si el usuario puede registrar huella
      if (!data.user.hasFingerprint && biometricAvailable) {
        console.log("🔍 Verificando si puede registrar huella...");
        setIsCheckingFingerprint(true);
        const canRegister = await checkFingerprintEligibility(email.trim());
        setIsCheckingFingerprint(false);
        
        if (canRegister) {
          setShowFingerprintModal(true);
        } else {
          showAlert("success", data.message || "Inicio de sesión exitoso", () => {
            router.replace("/(tabs)/advertisement");
          });
        }
      } else {
        showAlert("success", data.message || "Inicio de sesión exitoso", () => {
          router.replace("/(tabs)/advertisement");
        });
      }

    } catch (err) {
      console.error("🔥 Error en login:", err);
      showAlert("error", "Error de conexión. Verifica tu internet.");
    } finally {
      setLoading(false);
    }
  };

  const skipFingerprintRegistration = () => {
    setShowFingerprintModal(false);
    showAlert("success", "Inicio de sesión exitoso", () => {
      router.replace("/(tabs)/advertisement");
    });
  };

  React.useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Determinar el texto y estilo del botón de huella
  const getFingerprintButtonConfig = () => {
    if (!biometricAvailable || !email || !email.includes('@')) {
      return null;
    }

    if (userHasFingerprint) {
      // Usuario YA tiene huella registrada
      return {
        text: 'Login Rápido con Huella',
        icon: 'flash' as const,
        color: 'bg-orange-900',
        description: 'Acceso instantáneo con tu huella registrada'
      };
    } else {
      // Usuario NO tiene huella registrada
      return {
        text: 'Iniciar con Huella',
        icon: biometricType === 'fingerprint' ? 'finger-print' as const : 'scan' as const,
        color: 'bg-orange-800',
        description: 'Usa tu huella + email para iniciar sesión'
      };
    }
  };

  const fingerprintButtonConfig = getFingerprintButtonConfig();

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
                className={`absolute top-4 left-5 right-5 z-50 py-3 px-4 rounded-xl shadow-lg flex-row items-center ${alertType === "success" ? "bg-green-500" : alertType === "error" ? "bg-red-500" : "bg-blue-500"}`}
                style={{
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 }
                }}
              >
                <Text className="text-white text-base mr-2">
                  {alertType === "success" ? "✅" : alertType === "error" ? "❌" : "ℹ️"}
                </Text>
                <Text className="text-white text-sm flex-1">
                  {alertMessage}
                </Text>
              </Animatable.View>
            )}

            {/* Modal de registro de huella */}
            <Modal
              visible={showFingerprintModal}
              transparent={true}
              animationType="slide"
              onRequestClose={skipFingerprintRegistration}
            >
              <View className="flex-1 bg-black/50 justify-center items-center p-6">
                <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                  <View className="items-center mb-4">
                    <Ionicons name="finger-print" size={48} color="#f97316" />
                    <Text className="text-xl font-bold text-orange-900 mt-2">
                      Registrar Huella Dactilar
                    </Text>
                  </View>
                  
                  <Text className="text-gray-600 text-center mb-6">
                    ¿Deseas registrar tu huella dactilar para un acceso más rápido y seguro en futuros inicios de sesión?
                  </Text>

                  <Text className="text-orange-500 text-center text-sm mb-4">
                    ⚡ Acceso instantáneo sin contraseña
                  </Text>

                  <View className="flex-row justify-between space-x-3">
                    <TouchableOpacity
                      onPress={skipFingerprintRegistration}
                      disabled={loading}
                      className="flex-1 bg-gray-200 py-3 rounded-xl"
                    >
                      <Text className="text-gray-700 font-semibold text-center">
                        Ahora No
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={registerFingerprintAfterLogin}
                      disabled={loading}
                      className="flex-1 bg-orange-500 py-3 rounded-xl"
                    >
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white font-semibold text-center">
                          Registrar
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={skipFingerprintRegistration}
                    className="mt-4"
                  >
                    <Text className="text-orange-500 text-center text-sm">
                      Puedes registrar luego en tu perfil
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

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
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
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

            {/* Botón login tradicional */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className={`py-4 rounded-xl shadow-lg mb-4 ${loading ? "bg-orange-400" : "bg-orange-600"} flex-row items-center justify-center`}
              style={{
                elevation: 3,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 }
              }}
            >
              {loading && loginMethod === "traditional" ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="white" />
                  <Text className="text-white text-base font-semibold ml-2">
                    Iniciar Sesión
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ✅ BOTÓN ÚNICO DE HUELLA - Se adapta automáticamente */}
            {fingerprintButtonConfig && (
              <View className="mb-4">
                <TouchableOpacity
                  onPress={handleFingerprintLogin}
                  disabled={loading}
                  className={`py-4 rounded-xl shadow-lg flex-row items-center justify-center ${fingerprintButtonConfig.color}`}
                  style={{
                    elevation: 3,
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 }
                  }}
                >
                  {loading && loginMethod === "fingerprint" ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons 
                        name={fingerprintButtonConfig.icon} 
                        size={24} 
                        color="white" 
                      />
                      <Text className="text-white text-base font-semibold ml-2">
                        {fingerprintButtonConfig.text}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text className="text-orange-700 text-xs text-center mt-2">
                  {fingerprintButtonConfig.description}
                </Text>
              </View>
            )}

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
              <TouchableOpacity 
                onPress={() => router.push("/register")}
                disabled={loading}
              >
                <Text className="text-orange-900 font-semibold ml-2 text-base">
                  Únete a nosotros
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botón volver */}
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/advertisement");
                }
              }}
              disabled={loading}
              className="py-3 border border-orange-400 rounded-xl bg-orange-100 flex-row items-center justify-center"
            >
              <Ionicons name="arrow-back" size={18} color="#f97316" />
              <Text className="text-orange-700 font-medium text-base ml-2">
                Volver
              </Text>
            </TouchableOpacity>

            {/* Indicador de verificación de huella */}
            {isCheckingFingerprint && (
              <View className="mt-4 flex-row items-center justify-center">
                <ActivityIndicator size="small" color="#f97316" />
                <Text className="text-orange-700 ml-2 text-sm">
                  Verificando estado de huella...
                </Text>
              </View>
            )}

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}