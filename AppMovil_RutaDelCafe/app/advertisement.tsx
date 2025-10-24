// app/(tabs)/advertisement.tsx
import { useRouter } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AdvertisementScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const galleryImages = [
    { id: 1, image: require("../app/images/comida1.jpg") },
    { id: 2, image: require("../app/images/comida2.jpg") },
    { id: 3, image: require("../app/images/comida3.jpg") },
    { id: 4, image: require("../app/images/comida4.jpg") },
  ];

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userDataString = await AsyncStorage.getItem("userData");
      if (token) {
        setIsLoggedIn(true);
        if (userDataString) {
          setUserData(JSON.parse(userDataString));
        }
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    }
  };

  const handleRoutePress = () => {
    if (!isLoggedIn) {
      Alert.alert(
        "Iniciar Sesión Requerido",
        "Debes iniciar sesión para acceder a las rutas",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Iniciar Sesión", onPress: () => router.push("/login") }
        ]
      );
    } else {
      router.push("/Route");
    }
  };

  const handleProfilePress = () => {
    if (isLoggedIn) {
      router.push("/profile");
    } else {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          onPress: async () => {
            await AsyncStorage.removeItem("userToken");
            await AsyncStorage.removeItem("userData");
            setIsLoggedIn(false);
            setUserData(null);
          }
        }
      ]
    );
  };

  // Recupera nombre y apellido si existe, si no muestra "Bienvenido"
  const getWelcomeName = () => {
    if (isLoggedIn && userData) {
      const name = userData.name || "";
      const lastName = userData.lastName || "";
      if (name && lastName) {
        return `¡Bienvenido de nuevo, ${name} ${lastName}!`;
      }
      if (name) {
        return `¡Bienvenido de nuevo, ${name}!`;
      }
      return "¡Bienvenido de nuevo!";
    }
    return "¡Bienvenido a La Ruta del Sabor!";
  };

  return (
    <View className="flex-1 bg-white">
      {/* Fondo degradado superior */}
      <LinearGradient
        colors={["#f97316", "#ea580c", "#c2410c"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          zIndex: 1,
        }}
      />

      {/* Logo centrado */}
      <View className="absolute top-8 left-0 right-0 items-center z-10">
        <Image
          source={require("../app/images/LOGOTIPO.png")}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: "#fff",
            padding: 2,
          }}
          resizeMode="contain"
        />
      </View>

      {/* Botones de sesión arriba */}
      <View className="absolute top-8 left-0 right-0 flex-row justify-between px-6 z-20">
        {!isLoggedIn ? (
          <>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">Registrarse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">Iniciar Sesión</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleProfilePress}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">Ver Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">Cerrar Sesión</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20,
          minHeight: 700,
        }}
        className="mt-[120px] px-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Mensaje de bienvenida con nombre y apellido */}
        <View style={{ minHeight: 60, justifyContent: "center" }}>
          <Text className="text-2xl font-bold text-center text-gray-700 mb-4 mt-2">
            {getWelcomeName()}
          </Text>
        </View>

        {/* Galería horizontal detrás de la barra naranja */}
        <View className="relative">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6"
            contentContainerStyle={{ paddingHorizontal: 0 }}
          >
            {galleryImages.map((item) => (
              <View
                key={item.id}
                className="mr-4"
                style={{
                  width: screenWidth - 48,
                  marginTop: -30,
                  zIndex: 0,
                }}
              >
                <Image
                  source={item.image}
                  style={{
                    width: screenWidth - 48,
                    height: 200,
                    borderRadius: 16,
                  }}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Botones principales - 4 COLUMNAS AHORA */}
        <View className="mt-2 flex-row flex-wrap justify-between px-2">
          {/* Ubicaciones */}
          <View className="w-1/4 items-center mb-4">
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push("/Place")}
            >
              <View className="bg-orange-100 p-3 rounded-full mb-2 items-center justify-center w-12 h-12">
                <Image
                  source={require("../app/images/location-icon.png")}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xs text-gray-700 font-medium text-center">Lugares</Text>
            </TouchableOpacity>
          </View>

          {/* Rutas */}
          <View className="w-1/4 items-center mb-4">
            <TouchableOpacity
              className="items-center"
              onPress={handleRoutePress}
            >
              <View className="bg-orange-100 p-3 rounded-full mb-2 items-center justify-center w-12 h-12">
                <Image
                  source={require("../app/images/route-icon.png")}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xs text-gray-700 font-medium text-center">Rutas</Text>
              {!isLoggedIn && (
                <Text className="text-[10px] text-orange-600 italic mt-1 text-center">
                  Requiere inicio de sesión
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Cómo Llegar - NUEVO BOTÓN */}
          <View className="w-1/4 items-center mb-4">
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push("/Place/all-places")}
            >
              <View className="bg-orange-100 p-3 rounded-full mb-2 items-center justify-center w-12 h-12">
                <Image
                  source={require("../app/images/navigation-icon.png")}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xs text-gray-700 font-medium text-center">Cómo Llegar</Text>
            </TouchableOpacity>
          </View>

          {/* Acerca de nosotros */}
          <View className="w-1/4 items-center mb-4">
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push("/about-us")}
            >
              <View className="bg-orange-100 p-3 rounded-full mb-2 items-center justify-center w-12 h-12">
                <Image
                  source={require("../app/images/info-icon.png")}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xs text-gray-700 font-medium text-center">Acerca de</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Separador */}
        <View className="mt-8 mb-4 flex-row items-center justify-center">
          <View className="h-px bg-orange-200 flex-1" />
          <Text className="mx-3 text-orange-500 font-bold">•</Text>
          <View className="h-px bg-orange-200 flex-1" />
        </View>

        {/* Texto informativo debajo del separador */}
        <View className="mb-4 px-2">
          <Text className="text-center text-xs text-gray-500">
            Conéctate con los mejores sabores de tu ciudad y descubre experiencias gastronómicas únicas.
          </Text>
        </View>

        {/* Mensaje de bienvenida y descripción */}
        <View className="mb-4 px-2">
          <Text className="text-base text-gray-700 text-center leading-6">
            Descubre los sabores auténticos de tu ciudad.
            <Text className="font-bold text-orange-600">
              {" "}Encuentra restaurantes, promociones exclusivas{" "}
            </Text>
            y disfruta de la mejor experiencia gastronómica.
          </Text>
        </View>

        {/* Botón principal para registro */}
        {!isLoggedIn && (
          <TouchableOpacity
            onPress={() => router.push("/register")}
            className="mt-4 py-4 rounded-xl overflow-hidden shadow-lg mb-4"
          >
            <LinearGradient
              colors={["#f97316", "#ea580c"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 }}
            />
            <Text className="text-white text-lg font-bold text-center">Comenzar mi Ruta del Sabor</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}