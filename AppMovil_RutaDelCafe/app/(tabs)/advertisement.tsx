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
  useWindowDimensions,
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 🔧 Cálculos responsivos basados en las dimensiones de la pantalla
  const itemWidth = screenWidth - 48; // 24px de padding en cada lado
  const isSmallScreen = screenWidth < 375; // iPhone SE y similares
  const isLargeScreen = screenWidth > 414; // Pantallas grandes

  // 📏 Tamaños responsivos
  const responsiveSizes = {
    title: isSmallScreen ? 20 : isLargeScreen ? 24 : 22,
    sectionTitle: isSmallScreen ? 18 : isLargeScreen ? 22 : 20,
    bodyText: isSmallScreen ? 14 : 16,
    smallText: isSmallScreen ? 11 : 12,
    buttonText: isSmallScreen ? 14 : 16,
    cardWidth: screenWidth * (isSmallScreen ? 0.8 : 0.7),
    cardHeight: isSmallScreen ? 250 : 280,
    smallCardHeight: isSmallScreen ? 160 : 180,
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<any> | null>(null);
  const carouselRef = useRef<FlatList<any> | null>(null);

  // 🎨 Degradado del header según tema
  const gradientColors = useMemo<Triple<ColorValue>>(
    () =>
      themed.isDark
        ? ["#0B1220", "#0F1E3A", "#1E3A8A"] as const
        : ["#f97316", "#ea580c", "#c2410c"] as const,
    [themed.isDark]
  );

  // 📸 Imágenes locales de respaldo - MÁS IMÁGENES AGREGADAS
  const fallbackAds = [
    {
      id: "local1",
      title: "Sabor local 1",
      description: "Descubre los mejores sabores cerca de ti.",
      image_url: require("../images/comida1.jpg"),
      enlace_url: "",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 días - POR VENCER
      status: "activo"
    },
    {
      id: "local2",
      title: "Sabor local 2",
      description: "Explora nuevos lugares y experiencias.",
      image_url: require("../images/comida2.jpg"),
      enlace_url: "",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 días
      status: "activo"
    },
    {
      id: "local3",
      title: "Sabor local 3",
      description: "Encuentra los platos más deliciosos.",
      image_url: require("../images/comida3.jpg"),
      enlace_url: "",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días - POR VENCER
      status: "activo"
    },
    {
      id: "local4",
      title: "Oferta Especial 4",
      description: "Disfruta de descuentos exclusivos.",
      image_url: require("../images/comida4.jpg"),
      enlace_url: "",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      status: "activo"
    },
    {
      id: "local5",
      title: "Promoción Flash 5",
      description: "Tiempo limitado para esta oferta.",
      image_url: require("../images/comida5.jpg"),
      enlace_url: "",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 día - POR VENCER
      status: "activo"
    },
    {
      id: "local6",
      title: "Experiencia Gourmet 6",
      description: "Sabores únicos para paladares exigentes.",
      image_url: require("../images/comida2.jpg"),
      enlace_url: "",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 días
      status: "activo"
    }
  ];

  // 🔐 Verificar login y cargar publicidades
  useEffect(() => {
    checkLoginStatus();
    fetchPublicAds();
  }, []);

  // 🎠 Carrusel automático principal
  useEffect(() => {
    const dataToShow = getActiveAds();
    if (dataToShow.length <= 1) return;

    const id = setInterval(() => {
      const next = (currentIndex + 1) % dataToShow.length;
      setCurrentIndex(next);
      flatListRef.current?.scrollToOffset({
        offset: next * itemWidth,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(id);
  }, [ads, currentIndex, itemWidth]);

  // Calcular días hasta el vencimiento
  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Determinar si una publicidad está por vencer (menos de 7 días)
  const isExpiringSoon = (endDate: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(endDate);
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  // Determinar si una publicidad está activa
  const isActive = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    return start <= now && end >= now;
  };

  // Obtener todas las publicidades activas
  const getActiveAds = () => {
    const dataToFilter = ads.length > 0 ? ads : fallbackAds;
    return dataToFilter.filter(ad => 
      isActive(ad.start_date, ad.end_date)
    );
  };

  // Obtener publicidades que vencen pronto (automáticamente)
  const getExpiringAds = () => {
    const dataToFilter = ads.length > 0 ? ads : fallbackAds;
    return dataToFilter.filter(ad => 
      isActive(ad.start_date, ad.end_date) && 
      isExpiringSoon(ad.end_date)
    );
  };

  // Obtener publicidades normales (no por vencer)
  const getNormalAds = () => {
    const dataToFilter = ads.length > 0 ? ads : fallbackAds;
    return dataToFilter.filter(ad => 
      isActive(ad.start_date, ad.end_date) && 
      !isExpiringSoon(ad.end_date)
    );
  };

  // Obtener color según días restantes
  const getExpiryColor = (days: number) => {
    if (days <= 1) return "#EF4444";
    if (days <= 3) return "#F59E0B";
    if (days <= 7) return "#FBBF24";
    return "#10B981";
  };

  // Obtener texto según días restantes
  const getExpiryText = (days: number) => {
    if (days === 0) return "Último día";
    if (days === 1) return "1 día restante";
    return `${days} días restantes`;
  };

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

  // Renderizar item del carrusel principal
  const renderAd = ({ item }: { item: any }) => {
    const imageSource =
      typeof item.image_url === "string"
        ? { uri: item.image_url }
        : item.image_url;
    
    const daysUntilExpiry = getDaysUntilExpiry(item.end_date);
    const isExpiring = isExpiringSoon(item.end_date);

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
          borderWidth: 2,
          borderColor: isExpiring ? getExpiryColor(daysUntilExpiry) : themed.border,
        }}
      >
        {/* Badge de vencimiento */}
        {isExpiring && (
          <View style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            backgroundColor: getExpiryColor(daysUntilExpiry),
            paddingHorizontal: isSmallScreen ? 8 : 10,
            paddingVertical: isSmallScreen ? 4 : 5,
            borderRadius: 12,
          }}>
            <Text style={{ 
              color: 'white', 
              fontSize: isSmallScreen ? 10 : 11, 
              fontWeight: 'bold' 
            }}>
              {getExpiryText(daysUntilExpiry)}
            </Text>
          </View>
        )}

        <Image
          source={imageSource}
          style={{ 
            width: "100%", 
            height: responsiveSizes.cardHeight 
          }}
          resizeMode="cover"
        />
        <View style={{ 
          padding: isSmallScreen ? 10 : 12 
        }}>
          <Text
            style={{
              fontSize: isSmallScreen ? 16 : 18,
              fontWeight: "bold",
              color: themed.accent,
              marginBottom: 4,
            }}
          >
            {item.title || "Publicidad"}
          </Text>
          <Text style={{ 
            fontSize: isSmallScreen ? 13 : 14, 
            color: themed.text, 
            lineHeight: isSmallScreen ? 18 : 20 
          }}>
            {item.description || "Descubre los mejores sabores locales."}
          </Text>
          <Text style={{ 
            fontSize: responsiveSizes.smallText, 
            color: themed.muted, 
            marginTop: 6 
          }}>
            Válido hasta: {new Date(item.end_date).toLocaleDateString('es-ES')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar item para publicidades por vencer
  const renderExpiringAd = ({ item }: { item: any }) => {
    const imageSource =
      typeof item.image_url === "string"
        ? { uri: item.image_url }
        : item.image_url;
    
    const daysUntilExpiry = getDaysUntilExpiry(item.end_date);

    return (
      <TouchableOpacity
        activeOpacity={item.enlace_url ? 0.9 : 1}
        onPress={() => openLink(item.enlace_url)}
        style={{
          marginRight: 12,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: themed.card,
          width: responsiveSizes.cardWidth,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
          borderWidth: 3,
          borderColor: getExpiryColor(daysUntilExpiry),
        }}
      >
        {/* Badge de urgencia */}
        <View style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          backgroundColor: getExpiryColor(daysUntilExpiry),
          paddingHorizontal: isSmallScreen ? 8 : 10,
          paddingVertical: isSmallScreen ? 4 : 5,
          borderRadius: 12,
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: isSmallScreen ? 10 : 11, 
            fontWeight: 'bold' 
          }}>
            {getExpiryText(daysUntilExpiry)}
          </Text>
        </View>

        <Image 
          source={imageSource} 
          style={{ 
            width: "100%", 
            height: responsiveSizes.smallCardHeight 
          }} 
          resizeMode="cover" 
        />
        <View style={{ 
          padding: isSmallScreen ? 10 : 12 
        }}>
          <Text style={{ 
            fontWeight: "bold", 
            color: themed.accent, 
            fontSize: isSmallScreen ? 14 : 15 
          }}>
            {item.title || "Promoción Especial"}
          </Text>
          <Text style={{ 
            color: themed.text, 
            fontSize: isSmallScreen ? 12 : 13, 
            marginTop: 4, 
            lineHeight: isSmallScreen ? 16 : 18 
          }}>
            {item.description || "Aprovecha esta oferta antes de que termine."}
          </Text>
          <Text style={{ 
            fontSize: isSmallScreen ? 10 : 11, 
            color: themed.muted, 
            marginTop: 6 
          }}>
            Vence: {new Date(item.end_date).toLocaleDateString('es-ES')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar item para ofertas normales
  const renderNormalAd = ({ item }: { item: any }) => {
    const imageSource =
      typeof item.image_url === "string"
        ? { uri: item.image_url }
        : item.image_url;

    return (
      <TouchableOpacity
        activeOpacity={item.enlace_url ? 0.9 : 1}
        onPress={() => openLink(item.enlace_url)}
        style={{
          marginRight: 12,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: themed.card,
          width: responsiveSizes.cardWidth,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 3,
          borderWidth: 1,
          borderColor: themed.border,
        }}
      >
        <Image 
          source={imageSource} 
          style={{ 
            width: "100%", 
            height: responsiveSizes.smallCardHeight 
          }} 
          resizeMode="cover" 
        />
        <View style={{ 
          padding: isSmallScreen ? 10 : 12 
        }}>
          <Text style={{ 
            fontWeight: "bold", 
            color: themed.accent, 
            fontSize: isSmallScreen ? 14 : 15 
          }}>
            {item.title || "Oferta Destacada"}
          </Text>
          <Text style={{ 
            color: themed.text, 
            fontSize: isSmallScreen ? 12 : 13, 
            marginTop: 4, 
            lineHeight: isSmallScreen ? 16 : 18 
          }}>
            {item.description || "Descubre nuevos sabores a precios únicos."}
          </Text>
          <Text style={{ 
            fontSize: isSmallScreen ? 10 : 11, 
            color: themed.muted, 
            marginTop: 6 
          }}>
            Hasta: {new Date(item.end_date).toLocaleDateString('es-ES')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const activeAds = getActiveAds();
  const expiringAds = getExpiringAds();
  const normalAds = getNormalAds();

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Fondo degradado superior */}
      <LinearGradient
        colors={gradientColors}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: isSmallScreen ? 100 : 120,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          zIndex: 1,
        }}
      />

      {/* Botones de sesión - Responsivos */}
      <View
        style={{
          position: "absolute",
          top: isSmallScreen ? 28 : 32,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: isSmallScreen ? 20 : 24,
          zIndex: 20,
        }}
      >
        {!isLoggedIn ? (
          <>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              style={{
                backgroundColor: themed.card,
                paddingHorizontal: isSmallScreen ? 16 : 20,
                paddingVertical: isSmallScreen ? 8 : 10,
                borderRadius: 18,
                minWidth: isSmallScreen ? 100 : 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: isSmallScreen ? 12 : 14,
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
                paddingHorizontal: isSmallScreen ? 16 : 20,
                paddingVertical: isSmallScreen ? 8 : 10,
                borderRadius: 18,
                minWidth: isSmallScreen ? 100 : 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: isSmallScreen ? 12 : 14,
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
                paddingHorizontal: isSmallScreen ? 16 : 20,
                paddingVertical: isSmallScreen ? 8 : 10,
                borderRadius: 18,
                minWidth: isSmallScreen ? 100 : 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: isSmallScreen ? 12 : 14,
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
                router.replace("/login");
              }}
              style={{
                backgroundColor: themed.card,
                paddingHorizontal: isSmallScreen ? 16 : 20,
                paddingVertical: isSmallScreen ? 8 : 10,
                borderRadius: 18,
                minWidth: isSmallScreen ? 100 : 120,
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Text
                style={{
                  color: themed.isDark ? "#FFFFFF" : themed.accent,
                  fontWeight: "bold",
                  fontSize: isSmallScreen ? 12 : 14,
                  textAlign: "center",
                }}
              >
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Contenido scrollable con padding mejorado */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: isSmallScreen ? 60 : 80, // 🔼 AUMENTADO el padding bottom
          minHeight: Math.max(screenHeight, 800), // 🔼 Aseguramos altura mínima
        }}
        style={{ 
          marginTop: isSmallScreen ? 100 : 120, 
          paddingHorizontal: isSmallScreen ? 20 : 24 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Título principal */}
        <Text
          style={{
            fontSize: responsiveSizes.title,
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: isSmallScreen ? 20 : 24,
            color: themed.text,
            paddingHorizontal: isSmallScreen ? 10 : 0,
          }}
        >
          ¡Bienvenido a La Ruta del Sabor!
        </Text>

        {/* Botón: Ver mapa de lugares */}
        <View style={{ 
          marginTop: isSmallScreen ? 8 : 12, 
          alignItems: "center", 
          marginBottom: isSmallScreen ? 20 : 24 
        }}>
          <TouchableOpacity
            onPress={() => router.push("/all-places")}
            activeOpacity={0.9}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: themed.accent as string,
              paddingVertical: isSmallScreen ? 10 : 12,
              paddingHorizontal: isSmallScreen ? 18 : 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: (themed.accent as string) + "55",
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text style={{ 
              color: "#FFFFFF", 
              fontWeight: "bold", 
              fontSize: responsiveSizes.buttonText 
            }}>
              🗺️ Cómo llegar!
            </Text>
          </TouchableOpacity>
        </View>

        {/* Carrusel principal con TODAS las publicidades activas */}
        <View style={{ marginBottom: isSmallScreen ? 28 : 32 }}>
          <Text style={{ 
            fontSize: responsiveSizes.sectionTitle, 
            fontWeight: "bold", 
            color: themed.accent, 
            marginBottom: isSmallScreen ? 12 : 16 
          }}>
            🎯 Publicidades Destacadas
          </Text>
          {activeAds.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={activeAds}
              renderItem={renderAd}
              keyExtractor={(item) => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={itemWidth}
              snapToAlignment="start"
              decelerationRate="fast"
              pagingEnabled
            />
          ) : (
            <View style={{ 
              padding: isSmallScreen ? 16 : 20, 
              backgroundColor: themed.card, 
              borderRadius: 16, 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: themed.border,
            }}>
              <Text style={{ 
                color: themed.text, 
                textAlign: 'center',
                fontSize: responsiveSizes.bodyText
              }}>
                No hay publicidades activas en este momento
              </Text>
            </View>
          )}
        </View>

        {/* Sección AUTOMÁTICA: Publicidades que vencen pronto */}
        {expiringAds.length > 0 && (
          <View style={{ marginBottom: isSmallScreen ? 28 : 32 }}>
            <Text style={{ 
              fontSize: responsiveSizes.sectionTitle, 
              fontWeight: "bold", 
              color: "#F59E0B", 
              marginBottom: isSmallScreen ? 12 : 16 
            }}>
              🚨 Publicidades por Vencer
            </Text>
            <Text style={{ 
              fontSize: isSmallScreen ? 13 : 14, 
              color: themed.muted, 
              marginBottom: isSmallScreen ? 10 : 12 
            }}>
              Aprovecha estas ofertas antes de que terminen
            </Text>
            <FlatList
              data={expiringAds}
              renderItem={renderExpiringAd}
              keyExtractor={(item) => `expiring-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={responsiveSizes.cardWidth + 12}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Sección: Ofertas y Promociones (publicidades normales) */}
        {normalAds.length > 0 && (
          <View style={{ marginBottom: isSmallScreen ? 28 : 32 }}>
            <Text style={{ 
              fontSize: responsiveSizes.sectionTitle, 
              fontWeight: "bold", 
              color: "#10B981", 
              marginBottom: isSmallScreen ? 12 : 16 
            }}>
              💚 Ofertas y Promociones
            </Text>
            <FlatList
              data={normalAds}
              renderItem={renderNormalAd}
              keyExtractor={(item) => `normal-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={responsiveSizes.cardWidth + 12}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Acerca de nosotros */}
        <View style={{ 
          alignItems: "center", 
          marginTop: isSmallScreen ? 20 : 32,
          marginBottom: isSmallScreen ? 16 : 24,
        }}>
          <TouchableOpacity onPress={() => router.push("/about-us")}>
            <View
              style={{
                backgroundColor: (themed.accent as string) + "22",
                padding: isSmallScreen ? 10 : 12,
                borderRadius: 999,
                marginBottom: isSmallScreen ? 6 : 8,
                alignItems: "center",
                justifyContent: "center",
                width: isSmallScreen ? 44 : 48,
                height: isSmallScreen ? 44 : 48,
                borderWidth: 1,
                borderColor: themed.accent,
              }}
            >
              <Image
                source={require("../images/info-icon.png")}
                style={{ 
                  width: isSmallScreen ? 20 : 24, 
                  height: isSmallScreen ? 20 : 24, 
                  tintColor: themed.accent as string 
                }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ 
              fontSize: isSmallScreen ? 11 : 12, 
              color: themed.text, 
              fontWeight: "600", 
              textAlign: "center" 
            }}>
              Acerca de nosotros
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer - CON MÁS ESPACIO */}
        <View style={{ 
          marginTop: isSmallScreen ? 20 : 32, 
          marginBottom: isSmallScreen ? 16 : 24, 
          paddingHorizontal: isSmallScreen ? 12 : 16 
        }}>
          <Text style={{ 
            textAlign: "center", 
            fontSize: responsiveSizes.smallText, 
            color: themed.muted,
            lineHeight: isSmallScreen ? 16 : 18,
          }}>
            Conéctate con los mejores sabores de tu ciudad y descubre
            experiencias gastronómicas únicas.
          </Text>
        </View>
        
        {/* Texto final - CON MÁS MARGEN SUPERIOR */}
        <View style={{ 
          marginBottom: isSmallScreen ? 40 : 60, // 🔼 AUMENTADO significativamente
          paddingHorizontal: isSmallScreen ? 12 : 16,
          marginTop: isSmallScreen ? 8 : 16, // 🔼 Agregado margen superior
        }}>
          <Text style={{ 
            fontSize: responsiveSizes.bodyText, 
            color: themed.text, 
            textAlign: "center", 
            lineHeight: isSmallScreen ? 20 : 24 
          }}>
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