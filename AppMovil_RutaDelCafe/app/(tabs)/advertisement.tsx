import { useRouter } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
  FlatList,
  Linking,
  ColorValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.40:4000";

// Tupla de exactamente 3 colores (readonly) para que encaje con el tipo de LinearGradient
type Triple<T> = readonly [T, T, T];

export default function AdvertisementScreen() {
  const router = useRouter();
  const themed = useThemedStyles();

  const screenWidth = Dimensions.get("window").width;
  const itemWidth = screenWidth - 48; // ancho usado por FlatList (snapToInterval)

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<any> | null>(null);

  // 🎨 Degradado del header según tema (tupla tipada -> FIX de TS)
  const gradientColors = useMemo<Triple<ColorValue>>(
    () =>
      themed.isDark
        ? ["#0B1220", "#0F1E3A", "#1E3A8A"] as const // dark
        : ["#f97316", "#ea580c", "#c2410c"] as const, // light
    [themed.isDark]
  );

  // 📸 Imágenes locales de respaldo
  const fallbackAds = [
    {
      id: "local1",
      title: "Sabor local 1",
      description: "Descubre los mejores sabores cerca de ti.",
      image_url: require("../images/comida1.jpg"),
      enlace_url: "",
    },
    {
      id: "local2",
      title: "Sabor local 2",
      description: "Explora nuevos lugares y experiencias.",
      image_url: require("../images/comida2.jpg"),
      enlace_url: "",
    },
    {
      id: "local3",
      title: "Sabor local 3",
      description: "Encuentra los platos más deliciosos.",
      image_url: require("../images/comida3.jpg"),
      enlace_url: "",
    },
  ];

  // 🔐 Verificar login y cargar publicidades
  useEffect(() => {
    checkLoginStatus();
    fetchPublicAds();
  }, []);

  // 🎠 Carrusel automático (cada 10 s) usando offset
  useEffect(() => {
    const dataToShow = ads.length > 0 ? ads : fallbackAds;
    if (dataToShow.length <= 1) return;

    const id = setInterval(() => {
      const next = (currentIndex + 1) % dataToShow.length;
      setCurrentIndex(next);
      flatListRef.current?.scrollToOffset({
        offset: next * itemWidth,
        animated: true,
      });
    }, 10000);

    return () => clearInterval(id);
  }, [ads, currentIndex, itemWidth]);

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

  const fetchPublicAds = async () => {
    try {
      const res = await fetch(`${API_URL}/api/advertising/public`);
      const data = await res.json();
      const now = new Date();

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
          width: itemWidth,
          marginRight: 16,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: themed.card,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 4,
          borderWidth: 1,
          borderColor: themed.border,
        }}
      >
        <Image
          source={imageSource}
          style={{ width: "100%", height: 280 }}
          resizeMode="cover"
        />
        <View style={{ padding: 12 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themed.accent,
              marginBottom: 4,
            }}
          >
            {item.title || "Publicidad"}
          </Text>
          <Text style={{ fontSize: 14, color: themed.text }}>
            {item.description || "Descubre los mejores sabores locales."}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const dataToShow = ads.length > 0 ? ads : fallbackAds;

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Fondo degradado superior */}
      <LinearGradient
        colors={gradientColors} // <- ahora es una tupla readonly compatible
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

      {/* Botones de sesión (estilo acorde al tema) */}
      <View
        style={{
          position: "absolute",
          top: 32,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          zIndex: 20,
        }}
      >
        {!isLoggedIn ? (
          <>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              style={{
                backgroundColor: themed.card,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 18,
                minWidth: 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Registrarse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login")}
              style={{
                backgroundColor: themed.card,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 18,
                minWidth: 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={{
                backgroundColor: themed.card,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 18,
                minWidth: 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
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
              style={{
                backgroundColor: themed.card,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 18,
                minWidth: 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Contenido scrollable */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
          minHeight: 700,
        }}
        style={{ marginTop: 120, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Título principal */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: 24,
            color: themed.text,
          }}
        >
          ¡Bienvenido a La Ruta del Sabor!
        </Text>

        {/* Carrusel principal */}
        <View style={{ marginBottom: 24 }}>
          <FlatList
            ref={flatListRef}
            data={dataToShow}
            renderItem={renderAd}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={itemWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: itemWidth,
              offset: itemWidth * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              flatListRef.current?.scrollToOffset({
                offset: index * itemWidth,
                animated: true,
              });
            }}
          />
        </View>

        {/* Secciones con ScrollView */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: themed.accent,
            marginBottom: 12,
          }}
        >
          🕒 Publicidades que vencerán pronto
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[require("../images/comida1.jpg"), require("../images/comida2.jpg")].map(
            (img, index) => (
              <View
                key={index}
                style={{
                  marginRight: 12,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: themed.card,
                  width: screenWidth * 0.7,
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: themed.border,
                }}
              >
                <Image source={img} style={{ width: "100%", height: 180 }} resizeMode="cover" />
                <View style={{ padding: 10 }}>
                  <Text style={{ fontWeight: "bold", color: themed.accent }}>
                    Promoción Especial #{index + 1}
                  </Text>
                  <Text style={{ color: themed.text, fontSize: 12 }}>
                    Aprovecha esta oferta antes de que termine.
                  </Text>
                </View>
              </View>
            )
          )}
        </ScrollView>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: themed.accent,
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          💚 Ofertas y Promociones
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[require("../images/comida3.jpg"), require("../images/comida4.jpg")].map(
            (img, index) => (
              <View
                key={index}
                style={{
                  marginRight: 12,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: themed.card,
                  width: screenWidth * 0.7,
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: themed.border,
                }}
              >
                <Image source={img} style={{ width: "100%", height: 180 }} resizeMode="cover" />
                <View style={{ padding: 10 }}>
                  <Text style={{ fontWeight: "bold", color: themed.accent }}>
                    Oferta destacada #{index + 1}
                  </Text>
                  <Text style={{ color: themed.text, fontSize: 12 }}>
                    Descubre nuevos sabores a precios únicos.
                  </Text>
                </View>
              </View>
            )
          )}
        </ScrollView>

        {/* Acerca de nosotros */}
        <View style={{ alignItems: "center", marginTop: 32 }}>
          <TouchableOpacity onPress={() => router.push("/about-us")}>
            <View
              style={{
                backgroundColor: (themed.accent as string) + "22",
                padding: 12,
                borderRadius: 999,
                marginBottom: 8,
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderWidth: 1,
                borderColor: themed.accent,
              }}
            >
              <Image
                source={require("../images/info-icon.png")}
                style={{ width: 24, height: 24, tintColor: themed.accent as string }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ fontSize: 12, color: themed.text, fontWeight: "600", textAlign: "center" }}>
              Acerca de nosotros
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 24, marginBottom: 12, paddingHorizontal: 8 }}>
          <Text style={{ textAlign: "center", fontSize: 12, color: themed.muted }}>
            Conéctate con los mejores sabores de tu ciudad y descubre
            experiencias gastronómicas únicas.
          </Text>
        </View>
        <View style={{ marginBottom: 12, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 16, color: themed.text, textAlign: "center", lineHeight: 22 }}>
            Descubre los sabores auténticos de tu ciudad.
            <Text style={{ fontWeight: "bold", color: themed.accent }}>
              {" "}Encuentra restaurantes, promociones exclusivas{" "}
            </Text>
            y disfruta de la mejor experiencia gastronómica.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
