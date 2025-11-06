import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
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
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useTheme } from "../hooks/theme-context";

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
  const themed = useThemedStyles();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

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
  const [emailChecking, setEmailChecking] = useState(false);
  
  // Estado para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [progressWidth, setProgressWidth] = useState("100%");
  const [countdown, setCountdown] = useState(3);

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
    try {
      const phoneCodeObj = phoneCodes.find((item) => item.code === formData.phoneCode);
      return phoneCodeObj ? phoneCodeObj.maxLength : 15;
    } catch (error) {
      console.error("Error getting max phone length:", error);
      return 15;
    }
  };

  const isValidEmail = (email: string): { isValid: boolean; message: string } => {
    try {
      if (!email) return { isValid: false, message: "El correo electrónico es requerido" };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { isValid: false, message: "Formato de correo electrónico inválido" };
      }
      return { isValid: true, message: "" };
    } catch (error) {
      console.error("Error validating email:", error);
      return { isValid: false, message: "Error validando el correo" };
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!email || !isValidEmail(email).isValid) return false;
    
    try {
      setEmailChecking(true);
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.status === 200) {
        const data = await response.json();
        return data.exists === true;
      }
      return false;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    } finally {
      setEmailChecking(false);
    }
  };

  useEffect(() => {
    try {
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
    } catch (error) {
      console.error("Error calculating password strength:", error);
    }
  }, [formData.password]);

  useEffect(() => {
    const validateEmail = async () => {
      try {
        if (!formData.email) {
          setEmailError("");
          return;
        }

        const validation = isValidEmail(formData.email);
        if (!validation.isValid) {
          setEmailError(validation.message);
          return;
        }

        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          setEmailError("❌ Este correo electrónico ya está registrado");
        } else {
          setEmailError("");
        }
      } catch (error) {
        console.error("Error in email validation:", error);
        setEmailError("");
      }
    };

    const timeoutId = setTimeout(validateEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  useFocusEffect(
    useCallback(() => {
      try {
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
        setIsLoading(false);
        setShowSuccessModal(false);
        setProgressWidth("100%");
        setCountdown(3);
      } catch (error) {
        console.error("Error resetting form:", error);
      }
    }, [])
  );

  useEffect(() => {
    try {
      if (successMessage || errorMessage) {
        const timer = setTimeout(() => {
          setSuccessMessage("");
          setErrorMessage("");
        }, 4000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error("Error in message timeout:", error);
    }
  }, [successMessage, errorMessage]);

  // Efecto para manejar la redirección después del modal de éxito
  useEffect(() => {
    if (showSuccessModal) {
      try {
        let currentCountdown = 3;
        setCountdown(3);
        
        // Animación de la barra de progreso y cuenta regresiva
        const interval = setInterval(() => {
          currentCountdown -= 1;
          setCountdown(currentCountdown);
          setProgressWidth(`${(currentCountdown / 3) * 100}%`);
          
          if (currentCountdown <= 0) {
            clearInterval(interval);
            setShowSuccessModal(false);
            router.replace("/login");
          }
        }, 1000);

        return () => {
          clearInterval(interval);
        };
      } catch (error) {
        console.error("Error in success modal:", error);
        router.replace("/login");
      }
    } else {
      setProgressWidth("100%");
      setCountdown(3);
    }
  }, [showSuccessModal, router]);

  const getCityFlag = () => {
    try {
      const style = { width: 40, height: 24 };
      switch (formData.City_id) {
        case 1: return <Image source={LaPazFlag} style={style} resizeMode="contain" />;
        case 2: return <Image source={CochabambaFlag} style={style} resizeMode="contain" />;
        case 3: return <Image source={SantaCruzFlag} style={style} resizeMode="contain" />;
        case 4: return <Image source={OruroFlag} style={style} resizeMode="contain" />;
        case 5: return <Image source={PotosiFlag} style={style} resizeMode="contain" />;
        case 6: return <Image source={TarijaFlag} style={style} resizeMode="contain" />;
        case 7: return <Image source={ChuquisacaFlag} style={style} resizeMode="contain" />;
        case 8: return <Image source={BeniFlag} style={style} resizeMode="contain" />;
        case 9: return <Image source={PandoFlag} style={style} resizeMode="contain" />;
        default: return null;
      }
    } catch (error) {
      console.error("Error loading city flag:", error);
      return null;
    }
  };

  const handleChange = (name: keyof FormData, value: string | number | null) => {
    try {
      setFormData((prev) => ({ ...prev, [name]: value as never }));
      // Limpiar mensajes de error cuando el usuario empiece a escribir
      if (errorMessage && name !== 'photo') {
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Error handling form change:", error);
    }
  };

  const handlePhoneChange = (text: string) => {
    try {
      const maxLength = getMaxPhoneLength();
      const numericText = text.replace(/[^0-9]/g, "");
      if (numericText.length <= maxLength) {
        handleChange("phone", numericText);
      }
    } catch (error) {
      console.error("Error handling phone change:", error);
    }
  };

  const handleEmailChange = (text: string) => {
    try {
      handleChange("email", text.toLowerCase());
    } catch (error) {
      console.error("Error handling email change:", error);
    }
  };

  const getPasswordStrengthColor = () => {
    try {
      if (passwordStrength === 0) return "#ef4444";
      if (passwordStrength === 1) return "#f97316";
      if (passwordStrength === 2) return "#eab308";
      if (passwordStrength === 3) return "#84cc16";
      if (passwordStrength === 4) return "#22c55e";
      if (passwordStrength === 5) return "#15803d";
      return themed.border;
    } catch (error) {
      console.error("Error getting password strength color:", error);
      return "#ef4444";
    }
  };

  const getPasswordStrengthText = () => {
    try {
      if (passwordStrength === 0) return "Muy débil";
      if (passwordStrength === 1) return "Débil";
      if (passwordStrength === 2) return "Regular";
      if (passwordStrength === 3) return "Buena";
      if (passwordStrength === 4) return "Fuerte";
      if (passwordStrength === 5) return "Muy fuerte";
      return "";
    } catch (error) {
      console.error("Error getting password strength text:", error);
      return "Error";
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permisos requeridos", "Se necesitan permisos de cámara para tomar fotos");
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
        setFormData((prev) => ({ ...prev, photo: base64data }));
        setSuccessMessage("Foto tomada correctamente");
      }
    } catch (error) {
      console.error("Error al tomar foto:", error);
      Alert.alert("Error", "No se pudo tomar la foto");
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permisos requeridos", "Se necesitan permisos para acceder a la galería");
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
        setFormData((prev) => ({ ...prev, photo: base64data }));
        setSuccessMessage("Foto seleccionada correctamente");
      }
    } catch (error) {
      console.error("Error al seleccionar foto:", error);
      Alert.alert("Error", "No se pudo seleccionar la foto");
    }
  };

  const handleRemovePhoto = () => {
    try {
      setFormData((prev) => ({ ...prev, photo: null }));
      setSuccessMessage("Foto eliminada");
    } catch (error) {
      console.error("Error removing photo:", error);
      Alert.alert("Error", "No se pudo eliminar la foto");
    }
  };

  const validateForm = (): { isValid: boolean; message: string } => {
    try {
      const onlyLettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      const onlyNumbersRegex = /^[0-9]+$/;

      // Validaciones básicas
      if (!formData.name || !formData.lastName || !formData.email || !formData.password || !formData.phone) {
        return { isValid: false, message: "Por favor complete todos los campos obligatorios (*)" };
      }

      // Validación de caracteres
      if (!onlyLettersRegex.test(formData.name)) {
        return { isValid: false, message: "El nombre solo puede contener letras" };
      }
      if (!onlyLettersRegex.test(formData.lastName)) {
        return { isValid: false, message: "El apellido paterno solo puede contener letras" };
      }
      if (formData.secondLastName && !onlyLettersRegex.test(formData.secondLastName)) {
        return { isValid: false, message: "El apellido materno solo puede contener letras" };
      }

      // Validación de email
      const emailValidation = isValidEmail(formData.email);
      if (!emailValidation.isValid) {
        return { isValid: false, message: emailValidation.message };
      }

      // Validación de teléfono
      if (!onlyNumbersRegex.test(formData.phone)) {
        return { isValid: false, message: "El teléfono solo puede contener números" };
      }

      const maxLength = getMaxPhoneLength();
      if (maxLength && formData.phone.length !== maxLength) {
        return { isValid: false, message: `El teléfono para ${formData.phoneCode} debe tener exactamente ${maxLength} dígitos` };
      }

      // Validación de contraseña
      if (formData.password.length < 6) {
        return { isValid: false, message: "La contraseña debe tener al menos 6 caracteres" };
      }
      if (passwordStrength < 2) {
        return { isValid: false, message: "La contraseña es demasiado débil. Use letras, números y caracteres especiales" };
      }
      if (formData.password !== formData.confirmPassword) {
        return { isValid: false, message: "Las contraseñas no coinciden" };
      }
      if (!formData.City_id) {
        return { isValid: false, message: "Por favor selecciona una ciudad" };
      }

      return { isValid: true, message: "" };
    } catch (error) {
      console.error("Error validating form:", error);
      return { isValid: false, message: "Error validando el formulario" };
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    try {
      // Validar formulario
      const validation = validateForm();
      if (!validation.isValid) {
        setErrorMessage(validation.message);
        return;
      }

      // Verificar email duplicado
      if (formData.email) {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          setErrorMessage("❌ Este correo electrónico ya está registrado");
          return;
        }
      }

      setIsLoading(true);
      setErrorMessage("");

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
        submitData.photo = formData.photo;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        let errorText = "Error desconocido";
        try {
          errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            errorText = errorJson.message || errorText;
          } catch {
            // Mantener el texto plano si no es JSON
          }
        } catch {
          errorText = "Error de conexión";
        }

        if (response.status === 400 || response.status === 409 || 
            errorText.toLowerCase().includes("email") || 
            errorText.toLowerCase().includes("duplicado") || 
            errorText.toLowerCase().includes("ya existe") ||
            errorText.toLowerCase().includes("already exists")) {
          throw new Error("EMAIL_EXISTS");
        }
        
        throw new Error(errorText || `Error HTTP: ${response.status}`);
      }

      await response.json();
      
      // Mostrar modal de éxito
      setShowSuccessModal(true);
      
      // Limpiar formulario
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

    } catch (error: unknown) {
      let errorMsg = "No se pudo conectar con el servidor";
      
      if (error instanceof Error) {
        if (error.message === "EMAIL_EXISTS") {
          errorMsg = "❌ El correo electrónico ya está registrado";
        } else if (error.message.includes("400") || error.message.toLowerCase().includes("email")) {
          errorMsg = "❌ El correo electrónico ya está registrado";
        } else if (error.message.includes("500")) {
          errorMsg = "❌ Error interno del servidor. Intente más tarde.";
        } else if (error.message.includes("Data too long") || error.message.includes("image") || error.message.includes("photo")) {
          errorMsg = "❌ La imagen es demasiado grande. Intenta con una imagen más pequeña.";
        } else if (error.message.includes("Network request failed") || error.message.includes("fetch")) {
          errorMsg = "❌ Error de conexión. Verifique su internet.";
        } else {
          errorMsg = `❌ ${error.message}`;
        }
      }
      
      setErrorMessage(errorMsg);
      if (errorMsg !== "❌ El correo electrónico ya está registrado") {
        console.error("Error en registro:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedCityLabel = () => {
    try {
      const selected = cityItems.find((item) => item.value === formData.City_id);
      return selected ? selected.label : "Selecciona una ciudad";
    } catch (error) {
      console.error("Error getting selected city label:", error);
      return "Selecciona una ciudad";
    }
  };

  const dismissKeyboard = () => {
    try {
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error dismissing keyboard:", error);
    }
  };

  const labelStyle = { 
    color: themed.text, 
    fontWeight: "600" as const, 
    marginBottom: 6,
    fontSize: 16
  };
  
  const inputWrapperStyle = {
    backgroundColor: themed.inputBg,
    borderColor: themed.border,
    borderWidth: 1,
    borderRadius: 12,
  };
  
  const inputTextStyle = {
    color: themed.inputText,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
  };

  // Función para determinar si el botón debe estar deshabilitado
  const isSubmitDisabled = () => {
    return isLoading || emailChecking || !!emailError;
  };

  // Función para obtener el color del botón
  const getButtonColor = () => {
    if (isSubmitDisabled()) {
      return themed.accent + "66"; // Color con transparencia cuando está deshabilitado
    }
    return themed.accent; // Color normal cuando está habilitado
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themed.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: 20,
              paddingBottom: 48,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical={false}
          >
            {/* Header */}
            <View
              style={{
                width: "100%",
                height: 192,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                backgroundColor: themed.accent,
                borderRadius: 24,
                padding: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "bold", color: "#FFFFFF", textAlign: "center" }}>
                ¡Bienvenido!
              </Text>
              <Text style={{ color: "#FFFFFF", fontSize: 16, textAlign: "center", marginTop: 4 }}>
                Completa tus datos para crear tu cuenta
              </Text>

              {/* Foto de perfil */}
              <View style={{ position: "relative", marginTop: 12 }}>
                {formData.photo ? (
                  <Image
                    source={{ uri: formData.photo }}
                    style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "white" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      borderWidth: 4,
                      borderColor: "white",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={30} color="white" />
                  </View>
                )}

                <View style={{ position: "absolute", bottom: -8, flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleTakePhoto}
                    style={{ backgroundColor: "white", padding: 8, borderRadius: 20, elevation: 4 }}
                  >
                    <Ionicons name="camera" size={14} color={themed.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleChoosePhoto}
                    style={{ backgroundColor: "white", padding: 8, borderRadius: 20, elevation: 4 }}
                  >
                    <Ionicons name="image" size={14} color={themed.accent} />
                  </TouchableOpacity>
                  {formData.photo && (
                    <TouchableOpacity
                      onPress={handleRemovePhoto}
                      style={{ backgroundColor: "white", padding: 8, borderRadius: 20, elevation: 4 }}
                    >
                      <Ionicons name="trash" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Mensajes de éxito/error normales (solo para fotos) */}
            {successMessage ? (
              <Animatable.View
                animation="fadeIn"
                style={{
                  backgroundColor: themed.accent + "22",
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: themed.accent,
                }}
              >
                <Text style={{ color: themed.accent, textAlign: "center", fontWeight: "600" }}>
                  {successMessage}
                </Text>
              </Animatable.View>
            ) : null}

            {errorMessage ? (
              <Animatable.View
                animation="shake"
                style={{
                  backgroundColor: isDark ? "#2a1212" : "#fee2e2",
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: "#dc2626",
                }}
              >
                <Text style={{ color: "#dc2626", textAlign: "center", fontWeight: "600" }}>{errorMessage}</Text>
              </Animatable.View>
            ) : null}

            {/* Nombre y Apellidos */}
            {[
              { key: "name", label: "Nombre *", placeholder: "Ingresa tu nombre", cap: "words" as const },
              { key: "lastName", label: "Apellido Paterno *", placeholder: "Ingresa tu apellido paterno", cap: "words" as const },
              { key: "secondLastName", label: "Apellido Materno", placeholder: "Opcional", cap: "words" as const },
            ].map((field) => (
              <View key={field.key} style={{ marginBottom: 16 }}>
                <Text style={labelStyle}>{field.label}</Text>
                <View style={inputWrapperStyle}>
                  <TextInput
                    value={(formData as any)[field.key] ?? ""}
                    onChangeText={(text) =>
                      handleChange(field.key as keyof FormData, text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))
                    }
                    placeholder={field.placeholder}
                    placeholderTextColor={themed.placeholder}
                    autoCapitalize={field.cap}
                    editable={!isLoading}
                    style={inputTextStyle}
                    returnKeyType="next"
                  />
                </View>
              </View>
            ))}

            {/* Correo */}
            <View style={{ marginBottom: 16 }}>
              <Text style={labelStyle}>Correo Electrónico *</Text>
              <View
                style={[
                  inputWrapperStyle,
                  { 
                    borderColor: emailError ? "#dc2626" : themed.border,
                    flexDirection: "row",
                    alignItems: "center",
                  },
                ]}
              >
                <TextInput
                  value={formData.email}
                  onChangeText={handleEmailChange}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor={themed.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && !emailChecking}
                  style={[inputTextStyle, { flex: 1 }]}
                  returnKeyType="next"
                />
                {emailChecking && (
                  <ActivityIndicator size="small" color={themed.accent} style={{ marginRight: 12 }} />
                )}
              </View>
              {emailError ? (
                <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{emailError}</Text>
              ) : (
                <Text style={{ color: themed.muted, fontSize: 12, marginTop: 4 }}>
                  Ej: usuario@gmail.com, nombre.apellido@hotmail.com
                </Text>
              )}
            </View>

            {/* Teléfono */}
            <View style={{ marginBottom: 16 }}>
              <Text style={labelStyle}>Teléfono *</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => {
                    dismissKeyboard();
                    setShowPhoneCodePicker(true);
                  }}
                  style={[
                    inputWrapperStyle,
                    {
                      marginRight: 8,
                      paddingHorizontal: 12,
                      minWidth: 80,
                      height: 52,
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text style={{ color: themed.text, fontSize: 16, textAlign: "center" }}>
                    {formData.phoneCode}
                  </Text>
                </TouchableOpacity>

                <View style={[inputWrapperStyle, { flex: 1 }]}>
                  <TextInput
                    value={formData.phone}
                    onChangeText={handlePhoneChange}
                    placeholder={`Ej: ${"0".repeat(Math.max(1, getMaxPhoneLength() - 1))}`}
                    placeholderTextColor={themed.placeholder}
                    keyboardType="number-pad"
                    editable={!isLoading}
                    maxLength={getMaxPhoneLength()}
                    style={inputTextStyle}
                    returnKeyType="next"
                  />
                </View>
              </View>
              <Text style={{ color: themed.muted, fontSize: 12, marginTop: 4 }}>
                Máximo {getMaxPhoneLength()} dígitos para {formData.phoneCode}
              </Text>
            </View>

            {/* Contraseña */}
            <View style={{ marginBottom: 16 }}>
              <Text style={labelStyle}>Contraseña *</Text>
              <View style={[inputWrapperStyle, { flexDirection: "row", alignItems: "center" }]}>
                <TextInput
                  value={formData.password}
                  onChangeText={(text) => handleChange("password", text)}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={themed.placeholder}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  style={[inputTextStyle, { flex: 1 }]}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={themed.accent} />
                </TouchableOpacity>
              </View>

              {/* Barra de fortaleza */}
              {formData.password.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: "row", marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          marginHorizontal: 2,
                          borderRadius: 999,
                          backgroundColor: i <= passwordStrength ? getPasswordStrengthColor() : themed.border,
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ color: getPasswordStrengthColor(), fontSize: 12, fontWeight: "600" }}>
                    {getPasswordStrengthText()}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirmar Contraseña */}
            <View style={{ marginBottom: 16 }}>
              <Text style={labelStyle}>Confirmar Contraseña *</Text>
              <View
                style={[
                  inputWrapperStyle,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    borderColor:
                      formData.password !== formData.confirmPassword && formData.confirmPassword.length > 0
                        ? "#dc2626"
                        : themed.border,
                  },
                ]}
              >
                <TextInput
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleChange("confirmPassword", text)}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={themed.placeholder}
                  secureTextEntry={!showConfirmPassword}
                  editable={!isLoading}
                  style={[inputTextStyle, { flex: 1 }]}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 10 }}>
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={themed.accent} />
                </TouchableOpacity>
              </View>
              {formData.password !== formData.confirmPassword && formData.confirmPassword.length > 0 && (
                <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>Las contraseñas no coinciden</Text>
              )}
            </View>

            {/* Ciudad */}
            <View style={{ marginBottom: 16 }}>
              <Text style={labelStyle}>Ciudad *</Text>
              <TouchableOpacity
                onPress={() => {
                  dismissKeyboard();
                  setShowCityPicker(true);
                }}
                style={[
                  inputWrapperStyle,
                  { padding: 16, backgroundColor: themed.inputBg },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {getCityFlag()}
                  <Text
                    style={{
                      fontSize: 16,
                      marginLeft: 8,
                      color: formData.City_id ? themed.text : themed.muted,
                    }}
                  >
                    {getSelectedCityLabel()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Botones */}
            <View style={{ marginTop: 10, marginBottom: 28 }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitDisabled()}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  marginBottom: 12,
                  borderWidth: 1,
                  backgroundColor: getButtonColor(),
                  borderColor: themed.accent,
                  opacity: isSubmitDisabled() ? 0.6 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color={isDark ? "#0B1220" : "#FFFFFF"} />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}>
                    {emailChecking ? "Verificando..." : "Crear Cuenta"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/login");
                  }
                }}
                disabled={isLoading}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  backgroundColor: themed.card,
                  borderColor: themed.border,
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <Text style={{ color: themed.accent, fontWeight: "600", fontSize: 16 }}>Volver al Inicio</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Modal de éxito - MEJORADO con cuenta regresiva animada */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowSuccessModal(false)}
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
            {/* Icono de éxito */}
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#22c55e',
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
              <Ionicons name="checkmark" size={50} color="white" />
            </View>

            {/* Título */}
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: themed.text,
              textAlign: 'center',
              marginBottom: 16
            }}>
              ¡Registro Exitoso!
            </Text>

            {/* Mensaje */}
            <Text style={{
              fontSize: 16,
              color: themed.muted,
              textAlign: 'center',
              marginBottom: 30,
              lineHeight: 24
            }}>
              Tu cuenta ha sido creada correctamente. Serás redirigido al inicio de sesión automáticamente.
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
                duration={3000}
                easing="linear"
                style={{
                  height: '100%',
                  backgroundColor: themed.accent,
                  borderRadius: 4,
                  width: Platform.select({
                    ios: progressWidth,
                    android: progressWidth,
                    default: progressWidth
                  }) as any,
                }}
              />
            </View>

            {/* Texto de redirección con cuenta regresiva */}
            <Text style={{
              fontSize: 14,
              color: themed.muted,
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              Redirigiendo en {countdown} segundo{countdown !== 1 ? 's' : ''}...
            </Text>
          </Animatable.View>
        </View>
      </Modal>

      {/* Modal Picker para Ciudad */}
      <Modal 
        visible={showCityPicker} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ 
            backgroundColor: themed.card, 
            padding: 20, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20,
            maxHeight: '50%'
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 12, color: themed.text }}>
              Selecciona una ciudad
            </Text>
            <Picker
              selectedValue={formData.City_id}
              onValueChange={(value) => {
                handleChange("City_id", value);
                setShowCityPicker(false);
              }}
              dropdownIconColor={themed.text}
              style={{ color: themed.inputText }}
            >
              {cityItems.map((item) => (
                <Picker.Item
                  key={String(item.value)}
                  label={item.label}
                  value={item.value}
                  color={themed.inputText}
                />
              ))}
            </Picker>
            <TouchableOpacity
              onPress={() => setShowCityPicker(false)}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: themed.accent + "22",
                borderWidth: 1,
                borderColor: themed.accent,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "700", color: themed.accent }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Picker para Código de Teléfono */}
      <Modal 
        visible={showPhoneCodePicker} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowPhoneCodePicker(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ 
            backgroundColor: themed.card, 
            padding: 20, 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20,
            maxHeight: '50%'
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 12, color: themed.text }}>
              Selecciona código de país
            </Text>
            <Picker
              selectedValue={formData.phoneCode}
              onValueChange={(value) => {
                handleChange("phoneCode", value);
                setShowPhoneCodePicker(false);
              }}
              dropdownIconColor={themed.text}
              style={{ color: themed.inputText }}
            >
              {phoneCodes.map((item) => (
                <Picker.Item
                  key={item.code}
                  label={`${item.code} (${item.country})`}
                  value={item.code}
                  color={themed.inputText}
                />
              ))}
            </Picker>
            <TouchableOpacity
              onPress={() => setShowPhoneCodePicker(false)}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: themed.accent + "22",
                borderWidth: 1,
                borderColor: themed.accent,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "700", color: themed.accent }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}