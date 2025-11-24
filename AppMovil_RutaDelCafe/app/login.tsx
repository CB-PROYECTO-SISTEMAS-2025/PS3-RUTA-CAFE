import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
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
  View,
} from "react-native";
import type { ViewStyle, TextStyle } from "react-native";
import * as Animatable from "react-native-animatable";

import { useThemedStyles } from "../hooks/useThemedStyles";
import { useTheme } from "../hooks/theme-context";

export default function LoginScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

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

  // Estados para el modal de error mejorado
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState("");
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [progressWidth, setProgressWidth] = useState("100%");
  const [countdown, setCountdown] = useState(5);

  // =======================
  // ESTILOS TIPADOS
  // =======================
  const cardStyle: ViewStyle = {
    backgroundColor: themed.card,
    borderColor: themed.border,
    borderWidth: 1,
    borderRadius: 16,
  };

  const inputWrapper: ViewStyle = {
    backgroundColor: themed.inputBg,
    borderColor: themed.border,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  };

  const inputText: TextStyle = {
    color: themed.inputText,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    flex: 1,
  };

  // =======================
  // Efectos
  // =======================
  useEffect(() => {
    checkBiometricAvailability();
    loadStoredFingerprint();
  }, []);

  useEffect(() => {
    if (email && email.includes("@")) {
      checkFingerprintStatusForEmail(email);
    }
  }, [email]);

  // Efecto para manejar el modal de error
  useEffect(() => {
    if (showErrorModal) {
      try {
        let currentCountdown = 5;
        setCountdown(5);
        
        const interval = setInterval(() => {
          currentCountdown -= 1;
          setCountdown(currentCountdown);
          setProgressWidth(`${(currentCountdown / 5) * 100}%`);
          
          if (currentCountdown <= 0) {
            clearInterval(interval);
            setShowErrorModal(false);
          }
        }, 1000);

        return () => {
          clearInterval(interval);
        };
      } catch (error) {
        console.error("Error in error modal:", error);
        setShowErrorModal(false);
      }
    } else {
      setProgressWidth("100%");
      setCountdown(5);
    }
  }, [showErrorModal]);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setBiometricAvailable(hasHardware && isEnrolled);

      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType("fingerprint");
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType("facial");
      }
    } catch (error) {
      console.error("❌ Error verificando biometría:", error);
      setBiometricAvailable(false);
    }
  };

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

  const checkFingerprintStatusForEmail = async (userEmail: string) => {
    if (!userEmail.includes("@")) return;

    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/check-fingerprint`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserHasFingerprint(data.hasFingerprint);
        if (data.fingerprintId) {
          setStoredFingerprintId(data.fingerprintId);
        }
      } else {
        setUserHasFingerprint(false);
      }
    } catch (error) {
      console.error("❌ Error verificando estado de huella:", error);
      setUserHasFingerprint(false);
    }
  };

  // Función mejorada para mostrar errores con modal
  const showErrorModalWithDetails = (title: string, message: string) => {
    setErrorModalTitle(title);
    setErrorModalMessage(message);
    setShowErrorModal(true);
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

  const checkFingerprintEligibility = async (userEmail: string): Promise<boolean> => {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/check-fingerprint`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.fingerprintId) {
          setStoredFingerprintId(data.fingerprintId);
        }
        return data.canRegister;
      }
      return false;
    } catch (error) {
      console.error("❌ Error verificando elegibilidad de huella:", error);
      return false;
    }
  };

  const handleFingerprintLogin = async () => {
    try {
      if (!email) {
        showAlert("error", "Por favor ingresa tu email primero");
        return;
      }
      if (!email.includes("@")) {
        showAlert("error", "Por favor ingresa un email válido");
        return;
      }

      setLoading(true);
      setLoginMethod("fingerprint");

      const promptMessage = userHasFingerprint
        ? "Login rápido con huella dactilar"
        : "Iniciar sesión con huella dactilar";

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Usar contraseña",
        disableDeviceFallback: false,
      });

      if (result.success) {
        if (userHasFingerprint && storedFingerprintId) {
          await handleLoginWithFingerprintOnly(storedFingerprintId);
        } else {
          await handleLoginWithFingerprintAndEmail(email.trim());
        }
      } else {
        if ((result as any).error !== "user_cancel") {
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

  const handleLoginWithFingerprintAndEmail = async (userEmail: string) => {
    try {
      const fingerprintResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/check-fingerprint`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: userEmail }),
        }
      );

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

      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          fingerprint_id: expectedFingerprintId,
          email: userEmail,
        }),
      });

      const textResponse = await response.text();
      let data: any;
      try {
        data = JSON.parse(textResponse);
      } catch {
        showAlert("error", "Error en la respuesta del servidor");
        return;
      }

      if (!response.ok) {
        // Usar modal mejorado para errores de huella
        if (data.message?.toLowerCase().includes("huella") || data.message?.toLowerCase().includes("fingerprint")) {
          showErrorModalWithDetails(
            "Huella No Registrada",
            "No se encontró una huella registrada para este email. Por favor, inicia sesión con tu contraseña."
          );
        } else {
          showAlert("error", data.message || "Huella no registrada para este email");
        }
        return;
      }

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

  const handleLoginWithFingerprintOnly = async (fingerprintId: string) => {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ fingerprint_id: fingerprintId }),
      });

      const textResponse = await response.text();
      let data: any;
      try {
        data = JSON.parse(textResponse);
      } catch {
        showAlert("error", "Error en la respuesta del servidor");
        return;
      }

      if (!response.ok) {
        showErrorModalWithDetails(
          "Huella No Válida",
          "La huella no coincide con ningún usuario registrado. Por favor, intenta con tu email y contraseña."
        );
        return;
      }

      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      setUserHasFingerprint(data.user.hasFingerprint);
      if (data.user.email) setEmail(data.user.email);

      showAlert("success", data.message || "Inicio de sesión exitoso con huella", () => {
        router.replace("/(tabs)/advertisement");
      });
    } catch (err) {
      console.error("🔥 Error en login con huella:", err);
      showAlert("error", "Error de conexión con el servidor");
    }
  };

  const registerFingerprintAfterLogin = async () => {
    try {
      setLoading(true);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Registrar huella dactilar para accesos futuros",
        fallbackLabel: "Cancelar registro",
        disableDeviceFallback: false,
      });

      if (!result.success) {
        showAlert("info", "Registro de huella cancelado");
        return skipFingerprintRegistration();
      }

      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/register-fingerprint`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const textResponse = await response.text();
      let data: any;
      try {
        data = JSON.parse(textResponse);
      } catch {
        showAlert("error", "Error en la respuesta del servidor");
        return;
      }

      if (!response.ok) {
        showAlert("error", data.message || "Error al registrar huella");
        return;
      }

      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      setUserHasFingerprint(true);
      setStoredFingerprintId(data.user.fingerprintId);
      setShowFingerprintModal(false);

      showAlert("success", "¡Huella registrada exitosamente! 🎉", () => {
        router.replace("/(tabs)/advertisement");
      });
    } catch (error) {
      console.error("❌ Error en registro de huella:", error);
      showAlert("error", "Error al registrar huella");
      skipFingerprintRegistration();
    } finally {
      setLoading(false);
    }
  };

  // Función mejorada para manejar login tradicional
  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("error", "Por favor ingresa email y contraseña");
      return;
    }

    if (!email.includes("@")) {
      showAlert("error", "Por favor ingresa un email válido");
      return;
    }

    setLoginMethod("traditional");

    try {
      setLoading(true);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const textResponse = await response.text();
      let data: any;
      try {
        data = JSON.parse(textResponse);
      } catch {
        showAlert("error", "Error en la respuesta del servidor");
        return;
      }

      if (!response.ok) {
        // Detectar tipo de error y mostrar modal apropiado
        const errorMessage = data.message?.toLowerCase() || '';
        
        if (errorMessage.includes("usuario") || errorMessage.includes("user") || errorMessage.includes("not found") || errorMessage.includes("no encontrado")) {
          showErrorModalWithDetails(
            "Usuario No Encontrado",
            "No existe una cuenta asociada a este correo electrónico. Verifica tu email o regístrate para crear una nueva cuenta."
          );
        } else if (errorMessage.includes("contraseña") || errorMessage.includes("password") || errorMessage.includes("incorrect") || errorMessage.includes("inválid")) {
          showErrorModalWithDetails(
            "Contraseña Incorrecta",
            "La contraseña que ingresaste no es válida. Verifica tus credenciales o utiliza la opción '¿Olvidaste tu contraseña?' para restablecerla."
          );
        } else if (response.status === 401) {
          showErrorModalWithDetails(
            "Credenciales Inválidas",
            "El email o la contraseña son incorrectos. Por favor, verifica tus datos e intenta nuevamente."
          );
        } else {
          showAlert("error", data.message || `Error (${response.status})`);
        }
        return;
      }

      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));
      setUserHasFingerprint(data.user.hasFingerprint);

      if (!data.user.hasFingerprint && biometricAvailable) {
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
      showErrorModalWithDetails(
        "Error de Conexión",
        "No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente."
      );
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

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Determinar texto/estilo del botón biométrico
  const fingerprintButtonConfig = (() => {
    if (!biometricAvailable || !email || !email.includes("@")) return null;

    if (userHasFingerprint) {
      return {
        text: "Login Rápido con Huella",
        icon: "flash" as const,
        bg: themed.accent,
        border: themed.accent,
        description: "Acceso instantáneo con tu huella registrada",
      };
    } else {
      return {
        text: "Iniciar con Huella",
        icon: biometricType === "fingerprint" ? ("finger-print" as const) : ("scan" as const),
        bg: (themed.accent as string) + "CC",
        border: themed.accent,
        description: "Usa tu huella + email para iniciar sesión",
      };
    }
  })();

  // =======================
  // UI
  // =======================
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
              justifyContent: "center",
              paddingHorizontal: 20,
              paddingVertical: 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 🔔 Banner de notificación */}
            {alertVisible && (
              <Animatable.View
                animation="fadeInDown"
                duration={400}
                style={{
                  position: "absolute",
                  top: 16,
                  left: 20,
                  right: 20,
                  zIndex: 50,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  backgroundColor:
                    alertType === "success"
                      ? (isDark ? "#14532d" : "#22c55e")
                      : alertType === "error"
                      ? (isDark ? "#7f1d1d" : "#ef4444")
                      : themed.accent,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, marginRight: 8 }}>
                  {alertType === "success" ? "✅" : alertType === "error" ? "❌" : "ℹ️"}
                </Text>
                <Text style={{ color: "#fff", fontSize: 14, flex: 1 }}>{alertMessage}</Text>
              </Animatable.View>
            )}

            {/* Modal de registro de huella */}
            <Modal
              visible={showFingerprintModal}
              transparent
              animationType="slide"
              onRequestClose={skipFingerprintRegistration}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 24,
                }}
              >
                <View style={[{ width: "100%", maxWidth: 420, borderRadius: 20, padding: 16 }, cardStyle]}>
                  <View style={{ alignItems: "center", marginBottom: 12 }}>
                    <Ionicons name="finger-print" size={48} color={themed.accent} />
                    <Text style={{ fontSize: 20, fontWeight: "700", color: themed.text, marginTop: 8 }}>
                      Registrar Huella Dactilar
                    </Text>
                  </View>

                  <Text style={{ color: themed.muted, textAlign: "center", marginBottom: 12 }}>
                    ¿Deseas registrar tu huella dactilar para un acceso más rápido y seguro en futuros inicios de sesión?
                  </Text>

                  <Text style={{ color: themed.accent, textAlign: "center", marginBottom: 12 }}>
                    ⚡ Acceso instantáneo sin contraseña
                  </Text>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity
                      onPress={skipFingerprintRegistration}
                      disabled={loading}
                      style={[
                        { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
                        { backgroundColor: isDark ? "#374151" : "#e5e7eb" },
                      ]}
                    >
                      <Text style={{ color: themed.text, fontWeight: "600" }}>Ahora No</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={registerFingerprintAfterLogin}
                      disabled={loading}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: themed.accent,
                        borderWidth: 1,
                        borderColor: themed.accent,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Registrar</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={skipFingerprintRegistration} style={{ marginTop: 12 }}>
                    <Text style={{ color: themed.accent, textAlign: "center" }}>
                      Puedes registrar luego en tu perfil
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Modal de Error Mejorado */}
            <Modal
              visible={showErrorModal}
              transparent={true}
              animationType="fade"
              statusBarTranslucent={true}
              onRequestClose={() => setShowErrorModal(false)}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
              }}>
                <Animatable.View 
                  animation="bounceIn"
                  duration={800}
                  style={{
                    backgroundColor: themed.card,
                    borderRadius: 20,
                    padding: 30,
                    width: '90%',
                    maxWidth: 340,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 4,
                    },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 10,
                  }}
                >
                  {/* Icono de error */}
                  <View style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: '#ef4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 24,
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 4,
                    },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}>
                    <Ionicons name="close" size={50} color="white" />
                  </View>

                  {/* Título */}
                  <Text style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#ef4444',
                    textAlign: 'center',
                    marginBottom: 16
                  }}>
                    {errorModalTitle}
                  </Text>

                  {/* Mensaje */}
                  <Text style={{
                    fontSize: 16,
                    color: themed.muted,
                    textAlign: 'center',
                    marginBottom: 30,
                    lineHeight: 24
                  }}>
                    {errorModalMessage}
                  </Text>

                  {/* Barra de progreso con animación suave */}
                  <View style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: themed.border,
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}>
                    <Animatable.View 
                      animation={{
                        from: { width: '100%' },
                        to: { width: '0%' },
                      }}
                      duration={5000}
                      easing="linear"
                      style={{
                        height: '100%',
                        backgroundColor: '#ef4444',
                        borderRadius: 4,
                        width: Platform.select({
                          ios: progressWidth,
                          android: progressWidth,
                          default: progressWidth
                        }) as any,
                      }}
                    />
                  </View>

                  {/* Texto de cierre automático */}
                  <Text style={{
                    fontSize: 14,
                    color: themed.muted,
                    textAlign: 'center',
                    fontStyle: 'italic',
                  }}>
                    Cerrando en {countdown} segundo{countdown !== 1 ? 's' : ''}...
                  </Text>

                  {/* Botón de cierre manual */}
                  <TouchableOpacity
                    onPress={() => setShowErrorModal(false)}
                    style={{
                      marginTop: 20,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                      backgroundColor: '#ef4444',
                      borderWidth: 1,
                      borderColor: '#ef4444',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                      Entendido
                    </Text>
                  </TouchableOpacity>
                </Animatable.View>
              </View>
            </Modal>

            {/* Logo y bienvenida */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Image
                source={require("../app/images/LOGOTIPO.png")}
                style={{ width: 200, height: 80, marginBottom: 12 }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: themed.text,
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                Bienvenido a Ruta del Sabor
              </Text>
              <Text style={{ fontSize: 13, color: themed.muted, textAlign: "center" }}>
                Descubre el auténtico sabor de nuestra región
              </Text>
            </View>

            {/* Inputs */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: themed.text, marginBottom: 6, fontWeight: "600", fontSize: 16 }}>
                Correo electrónico
              </Text>
              <View style={[inputWrapper, { marginBottom: 12 }]}>
                <TextInput
                  placeholder="tu@email.com"
                  placeholderTextColor={themed.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={inputText}
                />
              </View>

              <Text style={{ color: themed.text, marginBottom: 6, fontWeight: "600", fontSize: 16 }}>
                Contraseña
              </Text>
              <View style={[inputWrapper, { marginBottom: 12 }]}>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={themed.placeholder}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={inputText}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={themed.accent} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => router.push("/forgot-password")} style={{ alignSelf: "flex-end", marginTop: 6 }}>
                <Text style={{ color: themed.accent, fontSize: 13 }}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>

            {/* Botón login tradicional */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                marginBottom: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                backgroundColor: loading ? (themed.accent as string) + "99" : themed.accent,
                borderWidth: 1,
                borderColor: themed.accent,
                elevation: 3,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              {loading && loginMethod === "traditional" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 }}>
                    Iniciar Sesión
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Botón único de huella */}
            {fingerprintButtonConfig && (
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={handleFingerprintLogin}
                  disabled={loading}
                  style={{
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    backgroundColor: fingerprintButtonConfig.bg,
                    borderWidth: 1,
                    borderColor: fingerprintButtonConfig.border,
                    elevation: 3,
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  {loading && loginMethod === "fingerprint" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name={fingerprintButtonConfig.icon} size={22} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 }}>
                        {fingerprintButtonConfig.text}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={{ color: themed.muted, fontSize: 12, textAlign: "center", marginTop: 6 }}>
                  {fingerprintButtonConfig.description}
                </Text>
              </View>
            )}

            {/* Separador */}
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: themed.border }} />
              <Text style={{ color: themed.muted, paddingHorizontal: 8, fontSize: 13 }}>o</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: themed.border }} />
            </View>

            {/* Registro */}
            <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 16 }}>
              <Text style={{ color: themed.muted, fontSize: 15 }}>¿No tienes cuenta?</Text>
              <TouchableOpacity onPress={() => router.push("/register")} disabled={loading}>
                <Text style={{ color: themed.text, fontWeight: "800", marginLeft: 8, fontSize: 15 }}>
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
              style={{
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                backgroundColor: themed.card,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Ionicons name="arrow-back" size={18} color={themed.accent} />
              <Text style={{ color: themed.accent, fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
                Volver
              </Text>
            </TouchableOpacity>

            {/* Indicador de verificación de huella */}
            {isCheckingFingerprint && (
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="small" color={themed.accent} />
                <Text style={{ color: themed.muted, marginLeft: 8, fontSize: 13 }}>
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