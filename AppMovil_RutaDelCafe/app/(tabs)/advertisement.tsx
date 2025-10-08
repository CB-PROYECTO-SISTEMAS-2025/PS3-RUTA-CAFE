import { useRouter } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
  Alert,
  FlatList,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.40:4000";

export default function AdvertisementScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<any>>(null);

  // imágenes locales de respaldo
  const fallbackAds = [
    { id: "local1", image_url: require("../images/comida1.jpg"), enlace_url: "" },
    { id: "local2", image_url: require("../images/comida2.jpg"), enlace_url: "" },
    { id: "local3", image_url: require("../images/comida3.jpg"), enlace_url: "" },
  ];

  // verificar login y cargar publicidades
  useEffect(() => {
    checkLoginStatus();
    fetchPublicAds();
  }, []);

  // cambio automático del carrusel
  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        const nextIndex = (currentIndex + 1) % ads.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [currentIndex, ads]);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userDataString = await AsyncStorage.getItem("userData");
      if (token) {
        setIsLoggedIn(true);
        if (userDataString) setUserData(JSON.parse(userDataString));
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    }
  };

  // cargar publicidades del backend
  const fetchPublicAds = async () => {
    try {
      const res = await fetch(`${API_URL}/api/advertising/public`);
      if (!res.ok) {
        console.error("❌ Error HTTP:", res.status, res.statusText);
        setAds([]);
        return;
      }

      const data = await res.json();
      const now = new Date();

      // filtrar solo activas y vigentes
      const filtered = (data || []).filter((ad: any) => {
        const start = new Date(ad.start_date);
        const end = new Date(ad.end_date);
        return ad.status === "activo" && start <= now && end >= now;
      });

      setAds(filtered.length > 0 ? filtered : []);
    } catch (error) {
      console.error("Error fetching ads:", error);
      setAds([]);
    }
  };

  // nombre dinámico de bienvenida
  const getWelcomeName = () => {
    if (isLoggedIn && userData) {
      const name = userData.name || "";
      const lastName = userData.lastName || "";
      if (name && lastName) return `¡Bienvenido de nuevo, ${name} ${lastName}!`;
      if (name) return `¡Bienvenido de nuevo, ${name}!`;
      return "¡Bienvenido de nuevo!";
    }
    return "¡Bienvenido a La Ruta del Sabor!";
  };

  // abrir enlace (corrige URLs sin https)
  const openLink = (url: string) => {
    if (!url) return;
    const finalUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;
    Linking.openURL(finalUrl).catch((err) =>
      console.error("Error al abrir el enlace:", err)
    );
  };

  // render de cada publicidad
  const renderAd = ({ item }: { item: any }) => {
    const imageSource =
      typeof item.image_url === "string"
        ? { uri: item.image_url }
        : item.image_url;

    return (
      <TouchableOpacity
        activeOpacity={item.enlace_url ? 0.9 : 1}
        onPress={() => openLink(item.enlace_url)}
        style={{
          width: screenWidth - 48,
          marginRight: 16,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <Image
          source={imageSource}
          style={{ width: "100%", height: 200, borderRadius: 16 }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const dataToShow =
    ads.length >= 2 ? ads : [...ads, ...fallbackAds.slice(0, 2 - ads.length)];

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
          source={require("../images/LOGOTIPO.png")}
          style={{ width: 60, height: 60 }}
          resizeMode="contain"
        />
      </View>

      {/* Botones de sesión */}
      <View className="absolute top-8 left-0 right-0 flex-row justify-between px-6 z-20">
        {!isLoggedIn ? (
          <>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">
                Registrarse
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">
                Ver Perfil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                await AsyncStorage.removeItem("userToken");
                await AsyncStorage.removeItem("userData");
                setIsLoggedIn(false);
                setUserData(null);
              }}
              className="bg-white px-5 py-2.5 rounded-2xl shadow border border-orange-100 min-w-[120px]"
            >
              <Text className="text-orange-600 font-bold text-sm text-center">
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Contenido principal */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20,
          minHeight: 700,
        }}
        className="mt-[120px] px-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Bienvenida */}
        <View style={{ minHeight: 60, justifyContent: "center" }}>
          <Text className="text-2xl font-bold text-center text-gray-700 mb-4 mt-2">
            {getWelcomeName()}
          </Text>
        </View>

        {/* Carrusel dinámico */}
        <View className="relative mb-6">
          <FlatList
            ref={flatListRef}
            data={dataToShow}
            renderItem={renderAd}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            getItemLayout={(_, index) => ({
              length: screenWidth - 48,
              offset: (screenWidth - 48) * index,
              index,
            })}
          />
        </View>

        {/* Acerca de nosotros */}
        <View className="flex-1 items-center mt-2">
          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/about-us")}
          >
            <View className="bg-orange-100 p-3 rounded-full mb-2 items-center justify-center w-12 h-12">
              <Image
                source={require("../images/info-icon.png")}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-xs text-gray-700 font-medium text-center">
              Acerca de nosotros
            </Text>
          </TouchableOpacity>
        </View>

        {/* Separador */}
        <View className="mt-8 mb-4 flex-row items-center justify-center">
          <View className="h-px bg-orange-200 flex-1" />
          <Text className="mx-3 text-orange-500 font-bold">•</Text>
          <View className="h-px bg-orange-200 flex-1" />
        </View>

        {/* Footer descriptivo */}
        <View className="mb-4 px-2">
          <Text className="text-center text-xs text-gray-500">
            Conéctate con los mejores sabores de tu ciudad y descubre
            experiencias gastronómicas únicas.
          </Text>
        </View>

        {/* Descripción institucional */}
        <View className="mb-4 px-2">
          <Text className="text-base text-gray-700 text-center leading-6">
            Descubre los sabores auténticos de tu ciudad.
            <Text className="font-bold text-orange-600">
              {" "}
              Encuentra restaurantes, promociones exclusivas{" "}
            </Text>
            y disfruta de la mejor experiencia gastronómica.
          </Text>
        </View>

        {/* Botón principal */}
        {!isLoggedIn && (
          <TouchableOpacity
            onPress={() => router.push("/register")}
            className="mt-4 py-4 rounded-xl overflow-hidden shadow-lg mb-4"
          >
            <LinearGradient
              colors={["#f97316", "#ea580c"]}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 16,
              }}
            />
            <Text className="text-white text-lg font-bold text-center">
              Comenzar mi Ruta del Sabor
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
