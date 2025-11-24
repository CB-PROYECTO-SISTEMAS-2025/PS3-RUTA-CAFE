import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  Linking,
  Image
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

// Interfaces
interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

interface OverpassElement {
  lat: number;
  lon: number;
  tags: {
    name?: string;
    [key: string]: any;
  };
}

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  type: string;
  isUserLocation?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Locations() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentView, setCurrentView] = useState<string>("standard");
  const [isLocating, setIsLocating] = useState(false);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const webViewRef = useRef<WebView>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  // Tipos de vista disponibles
  const mapViews = [
    { 
      id: "standard", 
      name: "Estándar", 
      icon: "map",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; OpenStreetMap contributors'
    },
    { 
      id: "satellite", 
      name: "Satélite", 
      icon: "earth",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri'
    },
    { 
      id: "transport", 
      name: "Transporte", 
      icon: "bus",
      url: "https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png",
      attribution: 'Map memomaps.de'
    },
    { 
      id: "minimal", 
      name: "Minimal", 
      icon: "eye-off",
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      attribution: '&copy; OpenStreetMap contributors'
    }
  ];

  // Solicitar permisos de ubicación
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'web') {
      setLocationPermission(true);
      return;
    }

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
      } else {
        setLocationPermission(false);
        Alert.alert(
          "Permisos requeridos",
          "La aplicación necesita permisos de ubicación para mostrar tu ubicación en el mapa.",
          [
            {
              text: "Abrir ajustes",
              onPress: () => Linking.openSettings()
            },
            {
              text: "Cancelar",
              style: "cancel"
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    }
  };

  // HTML template para el WebView de Leaflet - MEJORADO
  const leafletHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Leaflet Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: system-ui;
        }
        #map {
            width: 100%;
            height: 100%;
            cursor: grab;
        }
        .custom-pin-marker {
            transition: transform 0.2s;
        }
        .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .leaflet-control-zoom a {
            background: #EA580C !important;
            color: white !important;
            border: 2px solid white !important;
            border-radius: 25px !important;
            width: 45px !important;
            height: 45px !important;
            line-height: 41px !important;
            font-size: 22px !important;
            font-weight: bold !important;
            margin: 5px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }
        .location-button {
            position: absolute;
            bottom: 100px;
            right: 10px;
            background: #EA580C;
            border: 2px solid white;
            border-radius: 25px;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            cursor: pointer;
        }
        .user-location-pulse {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }
        .user-location-glow {
            box-shadow: 0 0 20px #EF4444, 0 0 30px #F59E0B;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div class="location-button" onclick="getUserLocation()">📍</div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        let map;
        let currentMarkers = [];
        let userLocationMarker = null;
        let mapInitialized = false;

        function initializeMap() {
            if (mapInitialized) return;
            
            map = L.map('map', {
                center: [-17.3939, -66.1568],
                zoom: 15,
                zoomControl: true,
                touchZoom: true,
                scrollWheelZoom: false,
                doubleClickZoom: true,
                boxZoom: true,
                keyboard: false,
                dragging: true,
                tap: true,
                tapTolerance: 15
            });

            // Capa inicial
            L.tileLayer('${mapViews[0].url}', {
                attribution: '${mapViews[0].attribution}',
                maxZoom: 19,
                minZoom: 3
            }).addTo(map);

            mapInitialized = true;

            // Enviar mensaje de que el mapa está listo
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'map_ready'
                }));
            }
        }

        function changeMapView(viewUrl, attribution) {
            if (!map) return;
            
            // Remover capas actuales
            map.eachLayer(function(layer) {
                if (layer instanceof L.TileLayer) {
                    map.removeLayer(layer);
                }
            });

            // Añadir nueva capa
            L.tileLayer(viewUrl, {
                attribution: attribution,
                maxZoom: 19,
                minZoom: 3
            }).addTo(map);

            // Re-añadir marcadores
            currentMarkers.forEach(marker => {
                if (marker && !map.hasLayer(marker)) {
                    marker.addTo(map);
                }
            });
        }

        function createPinIcon(isUserLocation = false) {
            const pinColor = isUserLocation ? '#EF4444' : '#3B82F6';
            const pinSize = isUserLocation ? 55 : 45;
            const pulseClass = isUserLocation ? 'user-location-pulse' : '';
            const glowClass = isUserLocation ? 'user-location-glow' : '';
            
            return L.divIcon({
                className: 'custom-pin-marker ' + pulseClass,
                html: \`
                    <div style="
                        position: relative;
                        width: \${pinSize}px;
                        height: \${pinSize + 20}px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    ">
                        <div style="
                            position: absolute;
                            width: \${pinSize}px;
                            height: \${pinSize}px;
                            background: \${pinColor};
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 3px solid white;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                            top: 0;
                            left: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.2s;
                            \${glowClass ? 'box-shadow: 0 0 20px #EF4444, 0 0 30px #F59E0B;' : ''}
                        ">
                            <div style="
                                transform: rotate(45deg);
                                color: white;
                                font-size: \${pinSize * 0.35}px;
                                font-weight: bold;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 100%;
                                height: 100%;
                            ">
                                \${isUserLocation ? '🌟' : '📌'}
                            </div>
                        </div>
                        \${isUserLocation ? \`
                        <div style="
                            position: absolute;
                            top: -5px;
                            left: -5px;
                            width: \${pinSize + 10}px;
                            height: \${pinSize + 10}px;
                            border: 2px solid #EF4444;
                            border-radius: 50%;
                            animation: pulse 2s infinite;
                        "></div>
                        \` : ''}
                    </div>
                \`,
                iconSize: [pinSize, pinSize + 20],
                iconAnchor: [pinSize / 2, pinSize + 20],
                popupAnchor: [0, -pinSize - 15]
            });
        }

        function addMarker(lat, lng, title, type, isUserLocation = false) {
            if (!map) return null;

            try {
                const markerIcon = createPinIcon(isUserLocation);
                const shortAddress = title.split(',').slice(0, 3).join(', ').trim();
                const displayTitle = isUserLocation ? "🌟 ¡Estás aquí!" : (title.split(',')[0] || title);

                const marker = L.marker([lat, lng], { 
                    icon: markerIcon,
                    title: displayTitle
                }).addTo(map);

                const popupContent = \`
                    <div style="padding: 15px; min-width: 250px; max-width: 90vw;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6;">
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: \${isUserLocation ? 'linear-gradient(135deg, #EF4444, #F59E0B)' : '#3B82F6'}; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
                                \${isUserLocation ? '🌟' : '📌'}
                            </div>
                            <div>
                                <h4 style="font-weight: bold; color: #1f2937; font-size: 16px; margin: 0;">\${displayTitle}</h4>
                                <span style="color: #6b7280; font-size: 12px; margin-top: 2px; display: block;">
                                    \${isUserLocation ? 'Tu ubicación actual' : type.charAt(0).toUpperCase() + type.slice(1)}
                                </span>
                            </div>
                        </div>
                        
                        \${!isUserLocation ? \`
                        <div style="margin-bottom: 15px;">
                            <span style="display: inline-block; background: #f3f4f6; color: #4b5563; font-size: 12px; padding: 6px 12px; border-radius: 20px; font-weight: 600;">
                                \${type.charAt(0).toUpperCase() + type.slice(1)}
                            </span>
                        </div>
                        \` : ''}
                        
                        <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                            <p style="color: #4b5563; font-size: 12px; font-weight: 600; margin: 0 0 5px 0;">📍 Dirección:</p>
                            <p style="color: #1f2937; font-size: 14px; margin: 0; font-weight: 500;">\${shortAddress}</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                            <div style="background: #eff6ff; text-align: center; padding: 10px; border-radius: 6px;">
                                <strong style="color: #1e40af;">Latitud</strong><br>
                                <span style="color: #374151; font-family: monospace;">\${lat.toFixed(6)}</span>
                            </div>
                            <div style="background: #eff6ff; text-align: center; padding: 10px; border-radius: 6px;">
                                <strong style="color: #1e40af;">Longitud</strong><br>
                                <span style="color: #374151; font-family: monospace;">\${lng.toFixed(6)}</span>
                            </div>
                        </div>
                        
                        \${isUserLocation ? \`
                        <div style="margin-top: 12px; padding: 10px; background: linear-gradient(135deg, #FEF3C7, #FEE2E2); border-radius: 8px; border-left: 4px solid #F59E0B;">
                            <p style="color: #92400E; font-size: 12px; margin: 0; font-weight: 600;">🌟 Ubicación en tiempo real</p>
                        </div>
                        \` : ''}
                    </div>
                \`;

                marker.bindPopup(popupContent, {
                    className: 'custom-popup',
                    maxWidth: 350,
                    closeButton: true,
                    autoClose: false
                });

                marker.on('click', function() {
                    this.openPopup();
                });

                currentMarkers.push(marker);
                
                if (isUserLocation) {
                    if (userLocationMarker) {
                        map.removeLayer(userLocationMarker);
                    }
                    userLocationMarker = marker;
                    map.setView([lat, lng], 16);
                }

                return marker;
            } catch (error) {
                console.error('Error adding marker:', error);
                return null;
            }
        }

        function clearMarkers() {
            if (!map) return;
            
            currentMarkers.forEach(marker => {
                if (marker && map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            currentMarkers = [];
            
            // Mantener el marcador de ubicación del usuario si existe
            if (userLocationMarker && map.hasLayer(userLocationMarker)) {
                currentMarkers.push(userLocationMarker);
            }
        }

        function getUserLocation() {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'location_request'
                }));
            }
        }

        function centerMap(lat, lng) {
          if (map) {
            map.setView([lat, lng], 16, { 
              animate: true, 
              duration: 1,
              easeLinearity: 0.25 
            });
            
            // Asegurar que el mapa se redibuje correctamente
            setTimeout(function() {
              map.invalidateSize(true);
            }, 300);
          }
        }

        // Inicializar el mapa cuando la página cargue
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMap);
        } else {
            initializeMap();
        }

        // Exponer funciones globalmente para comunicación con React Native
        window.leafletMap = {
            changeMapView,
            addMarker,
            clearMarkers,
            centerMap,
            initializeMap
        };
    </script>
</body>
</html>
`;

  // Función para enviar comandos al WebView
  const sendToWebView = (command: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            ${command}
          } catch (error) {
            console.error('Error in WebView command:', error);
          }
        })();
        true;
      `);
    }
  };

  // Manejar mensajes del WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'map_ready':
          console.log('Mapa Leaflet listo');
          break;
          
        case 'location_request':
          handleMyLocation();
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Cambiar vista del mapa
  const changeMapView = (viewId: string) => {
    const viewConfig = mapViews.find(v => v.id === viewId);
    if (viewConfig) {
      setCurrentView(viewId);
      sendToWebView(`
        if (window.leafletMap) {
          window.leafletMap.changeMapView('${viewConfig.url}', '${viewConfig.attribution}');
        }
      `);
    }
  };

// Añadir marcador al mapa - MEJORADA
  const addMarkerToMap = (lat: number, lng: number, title: string, type: string, isUserLocation: boolean = false) => {
    const escapedTitle = title.replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/"/g, '\\"');
    
    sendToWebView(`
      if (window.leafletMap && window.leafletMap.addMarker) {
        try {
          window.leafletMap.addMarker(${lat}, ${lng}, "${escapedTitle}", "${type}", ${isUserLocation});
          
          // Si es la ubicación del usuario, asegurar que el marcador sea visible
          if (${isUserLocation}) {
            setTimeout(function() {
              if (map) {
                map.setView([${lat}, ${lng}], 16, { animate: true, duration: 1 });
              }
            }, 200);
          }
        } catch (error) {
          console.error('Error adding marker:', error);
        }
      }
    `);
    
    // Guardar marcador en el estado para referencia
    setMarkers(prev => [...prev.filter(m => !m.isUserLocation), { lat, lng, title, type, isUserLocation }]);
  };

  // Limpiar marcadores
  const clearMarkers = () => {
    sendToWebView(`
      if (window.leafletMap) {
        window.leafletMap.clearMarkers();
      }
    `);
    setMarkers([]);
  };


  // Centrar mapa en coordenadas - MEJORADA
  const centerMap = (lat: number, lng: number) => {
    sendToWebView(`
      if (window.leafletMap && window.leafletMap.centerMap) {
        try {
          window.leafletMap.centerMap(${lat}, ${lng});
          // Forzar un redraw del mapa
          setTimeout(function() {
            if (map) {
              map.invalidateSize();
            }
          }, 100);
        } catch (error) {
          console.error('Error centering map:', error);
        }
      }
    `);
  };

  // Obtener ubicación actual (funciona en Android/iOS/Web)
  const getCurrentLocation = async () => {
    try {
      if (Platform.OS === 'web') {
        // Para navegador web
        return new Promise<{latitude: number, longitude: number, accuracy: number}>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocalización no soportada'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords),
            (error) => reject(error),
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000
            }
          );
        });
      } else {
        // Para React Native (Android/iOS)
        let { status } = await Location.getForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          await requestLocationPermission();
          status = (await Location.getForegroundPermissionsAsync()).status;
        }

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation
          });
          return location.coords;
        } else {
          throw new Error('Permisos de ubicación denegados');
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const handleMyLocation = async () => {
      if (!locationPermission && Platform.OS !== 'web') {
        Alert.alert(
          "Permisos requeridos", 
          "Por favor permite el acceso a la ubicación para usar esta función.",
          [
            {
              text: "Solicitar permisos",
              onPress: requestLocationPermission
            },
            {
              text: "Cancelar",
              style: "cancel"
            }
          ]
        );
        return;
      }

      setIsLocating(true);

      try {
        const coords = await getCurrentLocation();
        const { latitude, longitude } = coords;

        // Limpiar todos los marcadores antes de dibujar el pin de ubicación
        clearMarkers();

        // Centrar el mapa y dibujar solo el pin de ubicación
        centerMap(latitude, longitude);
        setTimeout(() => {
          addMarkerToMap(latitude, longitude, "Mi ubicación", "ubicación", true);
        }, 300);

        Alert.alert("🌟 Ubicación encontrada", "¡Perfecto! Hemos colocado tu ubicación en el mapa.");
      } catch (error: any) {
        console.error('Location error:', error);

        let errorMessage = "Error desconocido al obtener la ubicación";
        if (error.code) {
          const messages: { [key: number]: string } = {
            1: "Permiso de ubicación denegado. Por favor habilita la ubicación en los ajustes de tu dispositivo.",
            2: "Ubicación no disponible. Verifica tu conexión a internet y el GPS.",
            3: "Tiempo de espera agotado. Intenta nuevamente en un lugar con mejor señal."
          };
          errorMessage = messages[error.code] || errorMessage;
        } else if (error.message) {
          errorMessage = error.message;
        }

        Alert.alert("❌ Error de ubicación", errorMessage);
      } finally {
        setIsLocating(false);
      }
    };
  // Búsqueda de lugares
  const handleSearch = async () => {
    const term = search.trim();
    if (!term) {
      Alert.alert("🔍 Búsqueda", "Por favor ingresa un término de búsqueda");
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LaRutaDelSaborApp/1.0',
            'Accept-Language': 'es'
          }
        }
      );

      const results: SearchResult[] = await response.json();

      if (!results || results.length === 0) {
        Alert.alert("🔍 Búsqueda", `No se encontraron resultados para "${term}"`);
        return;
      }

      clearMarkers();
      
      results.forEach((result, index) => {
        setTimeout(() => {
          addMarkerToMap(
            parseFloat(result.lat),
            parseFloat(result.lon),
            result.display_name,
            result.type
          );
        }, index * 100);
      });

      // Centrar en el primer resultado
      if (results.length > 0) {
        centerMap(parseFloat(results[0].lat), parseFloat(results[0].lon));
      }

      Alert.alert("✅ Éxito", `Encontrados ${results.length} resultados`);
    } catch (err) {
      console.error('Search error:', err);
      Alert.alert("❌ Error", "No se pudo realizar la búsqueda. Verifica tu conexión.");
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-orange-50">
      {/* Header con Logo */}
      <View className="bg-orange-500 px-6 py-5 shadow-lg rounded-b-3xl">
        <View className="flex-row items-center">
          {/* Logo a la izquierda */}
          <Image
            source={require("../app/images/LOGOTIPO.png")}
            className="w-28 h-16"
            resizeMode="contain"
          />

          {/* Texto a la derecha */}
          <View className="flex-1 ml-4">
            <Text className="text-white text-2xl font-extrabold tracking-wide">
              🔥 Sabor cerca de ti
            </Text>
            <Text className="text-orange-100 text-sm mt-1">
              ✨ Explora los sabores más cercanos a ti
            </Text>
          </View>
        </View>
      </View>


      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Búsqueda Principal */}
        <View className="px-5 py-5 bg-orange-400 mx-4 mt-5 rounded-3xl shadow-xl border border-orange-500">
          {/* Título */}
          <Text className="text-white font-extrabold text-base mb-4 text-center">
            Buscar lugar o dirección
          </Text>

          {/* Input */}
          <View className="flex-row items-center bg-orange-300 rounded-xl px-4 h-14 border border-orange-500 shadow-sm">
            <Ionicons name="search" size={22} color="white" />
            <TextInput 
              placeholder="Ejemplo: Calle, Ciudad-Departamento"
              placeholderTextColor="#FFD580"
              value={search} 
              onChangeText={setSearch} 
              className="flex-1 text-white text-base ml-3"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          {/* Botón de búsqueda */}
          <TouchableOpacity 
            className="mt-5 bg-orange-500 py-3 rounded-xl shadow-lg active:scale-95 flex-row items-center justify-center"
            onPress={handleSearch}
          >
            <Ionicons name="search" size={20} color="white" />
            <Text className="text-white font-bold text-base ml-2">
              Buscar en el Mapa
            </Text>
          </TouchableOpacity>
        </View>



        {/* Vistas del Mapa - CORREGIDO */}
        <View className="px-4 mt-6">
          <Text className="text-orange-800 font-semibold text-base mb-3 text-center">🎨 Vista del Mapa</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            <View className="flex-row gap-3">
              {mapViews.map((view) => (
                <TouchableOpacity 
                  key={view.id}
                  className={`flex-row items-center px-4 py-3 rounded-xl shadow-lg active:scale-95 border-2 ${
                    currentView === view.id 
                      ? 'bg-orange-600 border-orange-700 shadow-xl' 
                      : 'bg-white border-orange-200'
                  }`}
                  onPress={() => changeMapView(view.id)}
                >
                  <Ionicons 
                    name={view.icon as any} 
                    size={18} 
                    color={currentView === view.id ? 'white' : '#EA580C'} 
                  />
                  <Text className={`font-semibold text-sm ml-2 ${
                    currentView === view.id ? 'text-white' : 'text-orange-800'
                  }`}>
                    {view.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Mapa Leaflet en WebView */}
        <View className="h-80 mx-4 my-6 rounded-2xl overflow-hidden shadow-2xl border-2 border-orange-300 bg-gray-100">
          <WebView
            ref={webViewRef}
            source={{ html: leafletHTML }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onMessage={handleWebViewMessage}
            onError={(error) => console.error('WebView error:', error)}
            onLoadEnd={() => console.log('WebView loaded successfully')}
            renderLoading={() => (
              <View className="absolute inset-0 bg-orange-500 bg-opacity-90 justify-center items-center rounded-2xl">
                <View className="items-center">
                  <Ionicons name="map" size={48} color="white" />
                  <Text className="text-white text-lg font-bold mt-2">Cargando Mapa</Text>
                  <Text className="text-orange-100 text-sm mt-1">Por favor espera...</Text>
                </View>
              </View>
            )}
          />
        </View>

        {/* Botones de Acción */}
        <View className="flex-row gap-4 px-4 mb-6">
          <TouchableOpacity 
            className="flex-1 flex-row items-center justify-center bg-white py-4 px-4 rounded-xl shadow-lg active:bg-orange-50 active:scale-95 border-2 border-orange-200"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#EA580C"/>
            <Text className="text-orange-800 font-semibold ml-2 text-sm">Volver</Text>
          </TouchableOpacity>
          
         <TouchableOpacity 
            className={`flex-1 flex-row items-center justify-center py-4 px-4 rounded-xl shadow-lg active:scale-95 border-2 border-orange-200 ${
              isLocating 
                ? 'bg-gray-500' 
                : 'bg-orange-500'
            }`}
            onPress={handleMyLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <>
                <Ionicons name="time" size={22} color="white"/>
                <Text className="text-white font-semibold ml-2 text-sm">Buscando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="navigate" size={22} color="white"/>
                <Text className="text-white font-semibold ml-2 text-sm">Mi Ubicación</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Información de Controles */}
        <View className="mx-4 p-5 bg-white rounded-2xl shadow-lg border-2 border-orange-200">
          <Text className="text-orange-800 font-bold text-base mb-3 text-center">🎯 Controles Táctiles</Text>
          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-orange-500 rounded-full mr-3 shadow" />
              <Text className="text-orange-700 text-sm flex-1">
                <Text className="font-semibold">Deslizar:</Text> Mover el mapa
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-orange-500 rounded-full mr-3 shadow" />
              <Text className="text-orange-700 text-sm flex-1">
                <Text className="font-semibold">Pellizcar:</Text> Zoom in/out
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-orange-500 rounded-full mr-3 shadow" />
              <Text className="text-orange-700 text-sm flex-1">
                <Text className="font-semibold">Doble toque:</Text> Zoom in
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-orange-500 rounded-full mr-3 shadow" />
              <Text className="text-orange-700 text-sm flex-1">
                <Text className="font-semibold">Tocar marcador:</Text> Ver información
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-orange-500 rounded-full mr-3 shadow" />
              <Text className="text-orange-700 text-sm flex-1">
                <Text className="font-semibold">Botón ubicación:</Text> Centrar en tu posición
              </Text>
            </View>
          </View>
        </View>

        {/* Estado de permisos */}
        {!locationPermission && Platform.OS !== 'web' && (
          <View className="mx-4 mt-4 p-3 bg-amber-100 rounded-xl border-2 border-amber-300">
            <Text className="text-amber-800 text-sm text-center">
              🔒 Permisos de ubicación requeridos para usar "Mi Ubicación"
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}