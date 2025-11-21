import React from "react";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Dimensions,
  Linking,
  SafeAreaView,
  Modal,
} from 'react-native';
import WebView from 'react-native-webview';
import { useThemedStyles } from "../hooks/useThemedStyles";
import * as Location from 'expo-location';

interface Schedule {
  id: number;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
}

interface Place {
  id: number;
  name: string;
  description: string;
  latitude: number | string;
  longitude: number | string;
  route_id: number;
  route_name?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  rejectionComment?: string;
  website?: string;
  phoneNumber?: string;
  image_url?: string;
  createdAt: string;
  createdBy?: number;
  schedules?: Schedule[];
  likes_count?: number;
  user_liked?: boolean;
  comments_count?: number;
  category?: string;
}

interface Route {
  id: number;
  name: string;
  status: string;
}

interface RouteInfo {
  distance: string;
  time: string;
  placeId: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Iconos por categoría de comida
const getCategoryIcon = (category?: string) => {
  const icons: { [key: string]: string } = {
    'restaurante': '🍽️',
    'cafe': '☕',
    'bar': '🍻',
    'postres': '🍰',
    'comida_rapida': '🍔',
    'pizzeria': '🍕',
    'asiatica': '🍜',
    'mexicana': '🌮',
    'vegetariana': '🥗',
    'mariscos': '🦐',
    'carnes': '🥩',
    'panaderia': '🥖'
  };
  return icons[category?.toLowerCase() || ''] || '🏪';
};

const formatDayName = (dayOfWeek: string) => {
  const days: { [key: string]: string } = {
    'monday': 'Lunes',
    'tuesday': 'Martes',
    'wednesday': 'Miércoles',
    'thursday': 'Jueves',
    'friday': 'Viernes',
    'saturday': 'Sábado',
    'sunday': 'Domingo'
  };
  return days[dayOfWeek.toLowerCase()] || dayOfWeek;
};

const formatTime = (time: string) => {
  return time.substring(0, 5);
};

// Función para obtener el estado actual del lugar (abierto/cerrado)
const getPlaceStatus = (schedules?: Schedule[]) => {
  if (!schedules || schedules.length === 0) {
    return { isOpen: false, statusText: 'Horario no disponible' };
  }

  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todaySchedule = schedules.find(s => 
    s.dayOfWeek.toLowerCase() === today
  );

  if (!todaySchedule) {
    return { isOpen: false, statusText: 'Cerrado hoy' };
  }

  const openTime = todaySchedule.openTime.substring(0, 5);
  const closeTime = todaySchedule.closeTime.substring(0, 5);
  
  const [openHours, openMinutes] = openTime.split(':').map(Number);
  const [closeHours, closeMinutes] = closeTime.split(':').map(Number);
  
  const openTimeInMinutes = openHours * 60 + openMinutes;
  const closeTimeInMinutes = closeHours * 60 + closeMinutes;

  const isOpen = currentTime >= openTimeInMinutes && currentTime <= closeTimeInMinutes;
  
  if (isOpen) {
    const closingTime = new Date();
    closingTime.setHours(closeHours, closeMinutes, 0);
    const timeUntilClose = closingTime.getTime() - now.getTime();
    const hoursUntilClose = Math.floor(timeUntilClose / (1000 * 60 * 60));
    const minutesUntilClose = Math.floor((timeUntilClose % (1000 * 60 * 60)) / (1000 * 60));
    
    let statusText = 'Abierto';
    if (hoursUntilClose < 1 && minutesUntilClose <= 30) {
      statusText = `Cierra en ${minutesUntilClose} min`;
    } else if (hoursUntilClose < 2) {
      statusText = `Cierra en ${hoursUntilClose}h ${minutesUntilClose}m`;
    } else {
      statusText = `Abierto hasta ${closeTime}`;
    }
    
    return { isOpen: true, statusText };
  } else {
    return { isOpen: false, statusText: `Abre ${openTime}` };
  }
};

export default function AllPlacesScreen() {
  const router = useRouter();
  const themed = useThemedStyles();

  const [places, setPlaces] = useState<Place[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [showRouteFilter, setShowRouteFilter] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [routeCalculating, setRouteCalculating] = useState<number | null>(null);
  const [currentRouteInfo, setCurrentRouteInfo] = useState<RouteInfo | null>(null);

  const webViewRef = useRef<any>(null);

  useEffect(() => {
    fetchPlaces();
    fetchRoutes();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (places.length > 0) {
      setMapKey(prev => prev + 1);
    }
  }, [places]);

  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de ubicación requerido',
          'Necesitamos tu ubicación para mostrarte rutas precisas hacia los lugares.',
          [
            { text: 'OK', onPress: () => setLocationLoading(false) },
            { text: 'Configuración', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación actual');
    } finally {
      setLocationLoading(false);
    }
  };

  const getUserLocation = async () => {
    await requestLocationPermission();
  };

  const fetchPlaces = async () => {
    setLoading(true);
    setMapLoaded(false);
    setMapError(false);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/places`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const normalized = data
        .map((p: any) => ({
          ...p,
          latitude: typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude,
          longitude: typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude,
        }))
        .filter(
          (p: any) =>
            p.status === 'aprobada' &&
            typeof p.latitude === 'number' &&
            typeof p.longitude === 'number' &&
            !isNaN(p.latitude) &&
            !isNaN(p.longitude)
        );

      setPlaces(normalized);
    } catch (error) {
      console.error('❌ Error cargando lugares:', error);
      Alert.alert('Error', 'No se pudieron cargar los lugares');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes?status=aprobada`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const routesData = await response.json();
        setRoutes(routesData);
      }
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const filteredPlaces = useMemo(() => {
    let filtered = places;

    if (searchQuery) {
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.route_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedRoute !== 'all') {
      filtered = filtered.filter(place => place.route_id.toString() === selectedRoute);
    }

    return filtered;
  }, [places, searchQuery, selectedRoute]);

  const onRefresh = () => {
    setRefreshing(true);
    setMapLoaded(false);
    setMapError(false);
    fetchPlaces();
  };

  // Función para navegar a la pantalla de detalles - CORREGIDA
  const handlePlaceSelection = (place: Place) => {
    console.log('📍 Navegando a detalles del lugar:', place.id, place.name);
    router.push({
      pathname: '/placeDetails',
      params: { 
        placeId: place.id.toString(),
        placeName: place.name,
        placeCategory: place.category 
      }
    });
  };

// Reemplaza la función getMapHtml() completa con esta versión corregida:

const getMapHtml = () => {
  const placesData = filteredPlaces.map(p => ({
    id: p.id,
    name: p.name,
    lat: p.latitude,
    lng: p.longitude,
    desc: (p.description || '').slice(0, 80),
    route_name: p.route_name || 'Sin ruta',
    category: p.category || 'restaurante'
  }));

  let centerLat = -17.3939;
  let centerLng = -66.1568;
  let initialZoom = 12;

  if (userLocation) {
    centerLat = userLocation.lat;
    centerLng = userLocation.lng;
    initialZoom = 14;
  } else if (placesData.length === 1) {
    centerLat = placesData[0].lat as number;
    centerLng = placesData[0].lng as number;
    initialZoom = 16;
  } else if (placesData.length > 1) {
    const avgLat = placesData.reduce((sum, p) => sum + (p.lat as number), 0) / placesData.length;
    const avgLng = placesData.reduce((sum, p) => sum + (p.lng as number), 0) / placesData.length;
    centerLat = avgLat;
    centerLng = avgLng;
    initialZoom = 14;
  }

  const userLocationHtml = userLocation ? `
    const userIcon = L.divIcon({
      className: 'user-pin',
      html: '📍',
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
    
    const userMarker = L.marker([${userLocation.lat}, ${userLocation.lng}], {
      icon: userIcon,
      zIndexOffset: 1000
    }).addTo(map);
    
    userMarker.bindPopup(
      '<div style="padding: 12px; min-width: 200px;">' +
      '<strong style="color: #3b82f6; font-size: 14px;">📍 Tu Ubicación</strong><br/>' +
      '<span style="color: #666; font-size: 12px;">Punto de partida</span>' +
      '</div>'
    );
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body, #map {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        .custom-pin {
          background: white;
          border-radius: 50%;
          border: 3px solid #ea580c;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(234,88,12,0.4);
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
        }
        .user-pin {
          background: white;
          border-radius: 50%;
          border: 3px solid #3b82f6;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(59,130,246,0.4);
          font-size: 18px;
        }
        .route-active {
          border: 3px solid #22c55e;
          background: #f0fdf4;
        }
        .leaflet-routing-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          max-height: 300px;
          overflow-y: auto;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .leaflet-routing-alt {
          max-height: 200px;
        }
        /* Ocultar controles de zoom */
        .leaflet-control-zoom {
          display: none !important;
        }
        .leaflet-control-attribution {
          font-size: 10px;
        }
        /* Estilos para las instrucciones en español */
        .leaflet-routing-instructions {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        .leaflet-routing-instructions span {
          font-size: 12px !important;
        }
        .leaflet-routing-instructions .leaflet-routing-instruction-distance {
          color: #666 !important;
          font-size: 11px !important;
        }
        .leaflet-routing-collapse-btn {
          background: transparent !important;
          color: #666 !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 4px 8px !important;
          font-size: 16px !important;
          font-weight: normal !important;
          margin: 0 !important;
          cursor: pointer !important;
          box-shadow: none !important;
        }
        
      </style>
    </head>
    <body>
      <div id="map"></div>
      
      <script>
        let map;
        let markers = [];
        let routingControl = null;
        
        // Traducciones completas al español
        const spanishTranslations = {
          'Head': 'Dirígete',
          'north': 'al norte',
          'south': 'al sur', 
          'east': 'al este',
          'west': 'al oeste',
          'northeast': 'al noreste',
          'northwest': 'al noroeste',
          'southeast': 'al sureste',
          'southwest': 'al suroeste',
          'left': 'izquierda',
          'right': 'derecha',
          'Continue': 'Continúa',
          'onto': 'por',
          'Keep': 'Mantente',
          'at roundabout': 'en la rotonda',
          'Take exit': 'Toma la salida',
          'Destination': 'Destino',
          'You have arrived at your destination': 'Has llegado a tu destino',
          'Go straight': 'Continúa recto',
          'Turn around': 'Da la vuelta',
          'Make a U-turn': 'Haz un giro en U',
          'sharp left': 'giro cerrado a la izquierda',
          'sharp right': 'giro cerrado a la derecha',
          'slight left': 'ligero giro a la izquierda',
          'slight right': 'ligero giro a la derecha',
          'Merge': 'Incorpórate',
          'Fork': 'Bifurcación',
          'Ramp': 'Rampa',
          'on the left': 'a la izquierda',
          'on the right': 'a la derecha',
          'Slight': 'Ligero',
          'Sharp': 'Cerrado',
          'Uturn': 'Giro en U',
          'Waypoint': 'Punto de paso',
          'Start': 'Inicio',
          'End': 'Fin',
          'for': 'durante',
          'and arrive at your destination': 'y llegarás a tu destino',
          'km': 'km',
          'm': 'm',
          'Arrive at destination': 'Llegar al destino',
          'In about': 'En aproximadamente',
          'then': 'luego',
          'Take the': 'Toma la',
          'exit': 'salida',
          'toward': 'hacia',
          'Pass': 'Pasa',
          'After': 'Después de',
          'Arrive': 'Llega'
        };

        function translateInstruction(instruction) {
          let translated = instruction;
          // Primero reemplazar frases completas
          Object.keys(spanishTranslations).forEach(key => {
            const regex = new RegExp(key, 'gi');
            translated = translated.replace(regex, spanishTranslations[key]);
          });
          
          // Formatear números y unidades
          translated = translated.replace(/(\\d+\\.?\\d*)\\s*km/gi, '$1 km');
          translated = translated.replace(/(\\d+\\.?\\d*)\\s*m/gi, '$1 m');
          
          return translated.charAt(0).toUpperCase() + translated.slice(1);
        }

        function initMap() {
          try {
            map = L.map('map', {
              zoomControl: false
            }).setView([${centerLat}, ${centerLng}], ${initialZoom});
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            
            ${userLocationHtml}
            
            ${placesData.length > 0 ? `
              const places = ${JSON.stringify(placesData)};
              const categoryIcons = {
                'restaurante': '🍽️',
                'cafe': '☕',
                'bar': '🍻',
                'postres': '🍰',
                'comida_rapida': '🍔',
                'pizzeria': '🍕',
                'asiatica': '🍜',
                'mexicana': '🌮',
                'vegetariana': '🥗',
                'mariscos': '🦐',
                'carnes': '🥩',
                'panaderia': '🥖'
              };
              
              places.forEach(place => {
                const icon = categoryIcons[place.category] || '🏪';
                
                const customIcon = L.divIcon({
                  className: 'custom-pin',
                  html: icon,
                  iconSize: [42, 42],
                  iconAnchor: [21, 21]
                });
                
                const marker = L.marker([place.lat, place.lng], { 
                  icon: customIcon 
                }).addTo(map);
                
                marker.bindPopup(
                  '<div style="padding: 12px; min-width: 220px;">' +
                  '<strong style="color: #ea580c; font-size: 14px; margin-bottom: 4px; display: block;">' + icon + ' ' + place.name + '</strong>' +
                  '<span style="color: #666; font-size: 12px; margin-bottom: 6px; display: block;">' + (place.desc || '') + '</span>' +
                  '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; gap: 8px;">' +
                  '<span style="color: #16a34a; font-size: 11px; font-weight: bold;">📌 ' + place.route_name + '</span>' +
                  '<button onclick="window.ReactNativeWebView.postMessage(\\'ROUTE_' + place.id + '\\')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; flex: 1;">🚗 Ruta</button>' +
                  '<button onclick="window.ReactNativeWebView.postMessage(\\'DETAILS_' + place.id + '\\')" style="background: #ea580c; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; flex: 1;">👀 Detalles</button>' +
                  '</div>' +
                  '</div>'
                );
                
                marker.on('click', function() {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('DETAILS_' + place.id);
                  }
                });
                
                markers.push(marker);
              });
              
              if (places.length > 1) {
                const group = new L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
              }
            ` : ''}
            
            setTimeout(() => {
              map.invalidateSize();
            }, 100);
            
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('MAP_LOADED');
            }
            
          } catch (error) {
            console.error('Error loading map:', error);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('MAP_ERROR');
            }
          }
        }
        
        function calculateRoute(userLat, userLng, placeLat, placeLng, placeId) {
          // Limpiar ruta anterior
          if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
          }
          
          // Resetear marcadores
          markers.forEach(marker => {
            marker.getElement().className = 'custom-pin';
          });
          
          // Resaltar marcador de destino
          const destinationMarker = markers.find(m => 
            m.getLatLng().lat === placeLat && m.getLatLng().lng === placeLng
          );
          if (destinationMarker) {
            destinationMarker.getElement().className = 'custom-pin route-active';
          }
          
          routingControl = L.Routing.control({
            waypoints: [
              L.latLng(userLat, userLng),
              L.latLng(placeLat, placeLng)
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            lineOptions: {
              styles: [
                {
                  color: '#3b83f6',
                  opacity: 0.8,
                  weight: 6
                }
              ]
            },
            createMarker: function(i, waypoint, n) {
              return null;
            },
            show: true,
            collapsible: true,
            // Forzar idioma español en el servicio
            language: 'es'
          }).addTo(map);

          // Traducir instrucciones después de que se carguen
          routingControl.on('routeselected', function(e) {
            setTimeout(translateRouteInstructions, 100);
          });
          
          routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            const summary = routes[0].summary;
            const distance = (summary.totalDistance / 1000).toFixed(1);
            const time = Math.ceil(summary.totalTime / 60);
            
            // Traducir instrucciones después de calcular la ruta
            setTimeout(translateRouteInstructions, 200);
            
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('ROUTE_CALCULATED:' + placeId + ':' + distance + ':' + time);
            }
          });
          
          routingControl.on('routingerror', function(e) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('ROUTE_ERROR:' + placeId);
            }
          });
        }
        
        function translateRouteInstructions() {
          const instructions = document.querySelectorAll('.leaflet-routing-instructions span');
          instructions.forEach(instruction => {
            const originalText = instruction.textContent;
            if (originalText) {
              instruction.textContent = translateInstruction(originalText);
            }
          });
          
          // También traducir los textos de distancia
          const distanceElements = document.querySelectorAll('.leaflet-routing-instruction-distance');
          distanceElements.forEach(element => {
            const originalText = element.textContent;
            if (originalText) {
              element.textContent = originalText
                .replace('km', 'km')
                .replace('m', 'm');
            }
          });
        }
        
        function clearRoute() {
          if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
          }
          markers.forEach(marker => {
            marker.getElement().className = 'custom-pin';
          });
          
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage('ROUTE_CLEARED');
          }
        }
        
        initMap();
        
        window.resizeMap = function() {
          if (map) {
            setTimeout(() => {
              map.invalidateSize();
            }, 100);
          }
        };
        
        window.calculateRoute = calculateRoute;
        window.clearRoute = clearRoute;
      </script>
    </body>
    </html>
  `;
};

  const onMarkerMessage = (e: any) => {
    const data = e?.nativeEvent?.data;
    
    if (data === 'MAP_LOADED') {
      setMapLoaded(true);
      setMapError(false);
      return;
    }
    
    if (data && data.startsWith('MAP_ERROR')) {
      setMapError(true);
      setMapLoaded(false);
      return;
    }
    
    if (data && data.startsWith('ROUTE_CALCULATED:')) {
      const parts = data.replace('ROUTE_CALCULATED:', '').split(':');
      const placeId = Number(parts[0]);
      const distance = parts[1];
      const time = parts[2];
      
      setRouteCalculating(null);
      setCurrentRouteInfo({
        distance,
        time,
        placeId
      });

      Alert.alert(
        '✅ Ruta Calculada',
        `Distancia: ${distance} km\nTiempo estimado: ${time} minutos\n\nSigue las instrucciones en el panel del mapa.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    if (data && data.startsWith('ROUTE_ERROR:')) {
      const placeId = Number(data.replace('ROUTE_ERROR:', ''));
      setRouteCalculating(null);
      Alert.alert('Error', 'No se pudo calcular la ruta. Intenta nuevamente.');
      return;
    }
    
    if (data === 'ROUTE_CLEARED') {
      setCurrentRouteInfo(null);
      return;
    }
    
    if (data && data.startsWith('ROUTE_')) {
      const placeId = Number(data.replace('ROUTE_', ''));
      const place = places.find(p => p.id === placeId);
      if (place && userLocation) {
        calculateRouteInMap(place);
      } else if (!userLocation) {
        Alert.alert('📍 Ubicación requerida', 'Activa tu ubicación para calcular rutas en el mapa');
      }
      return;
    }
    
    if (data && data.startsWith('DETAILS_')) {
      const placeId = Number(data.replace('DETAILS_', ''));
      const place = places.find(p => p.id === placeId);
      if (place) {
        handlePlaceSelection(place);
      }
      return;
    }
  };

  const calculateRouteInMap = (place: Place) => {
    if (!userLocation) {
      Alert.alert(
        'Ubicación requerida',
        'Necesitamos tu ubicación para calcular la ruta en el mapa. ¿Quieres activar tu ubicación ahora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Activar', onPress: () => getUserLocation() }
        ]
      );
      return;
    }

    setRouteCalculating(place.id);
    setCurrentRouteInfo(null);
    
    if (webViewRef.current) {
      const script = `
        window.calculateRoute(
          ${userLocation.lat}, 
          ${userLocation.lng}, 
          ${place.latitude}, 
          ${place.longitude},
          ${place.id}
        );
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };

  const clearRouteFromMap = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.clearRoute();
        true;
      `);
    }
    setRouteCalculating(null);
    setCurrentRouteInfo(null);
  };

  const onWebViewLoad = () => {
    setTimeout(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof window.resizeMap === 'function') {
            window.resizeMap();
          }
          true;
        `);
      }
    }, 300);
  };

  const reloadMap = () => {
    setMapKey(prev => prev + 1);
    setMapLoaded(false);
    setMapError(false);
    setRouteCalculating(null);
    setCurrentRouteInfo(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: themed.background}}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={themed.accent} />
          <Text style={{color: themed.text, marginTop: 16, fontSize: 16}}>
            Cargando lugares...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: themed.background}}>
      {/* Header */}
      <View style={{
        backgroundColor: themed.accent, 
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: 8, 
              borderRadius: 8,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text style={{color: 'white', fontSize: 18, fontWeight: 'bold'}}>🗺️ Cómo Llegar</Text>
          </View>

          <TouchableOpacity
            onPress={getUserLocation}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: 8, 
              borderRadius: 8,
            }}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="location" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Búsqueda y Filtros */}
      <View style={{padding: 12}}>
        <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
          <View style={{
            flex: 1, 
            backgroundColor: themed.card, 
            borderRadius: 10,
            borderWidth: 1,
            borderColor: themed.border
          }}>
            <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8}}>
              <Ionicons name="search" size={16} color={themed.accent} />
              <TextInput
                placeholder="Buscar lugares..."
                placeholderTextColor={themed.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1, 
                  marginLeft: 8, 
                  color: themed.text, 
                  fontSize: 14,
                }}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={themed.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowRouteFilter(true)}
            style={{
              backgroundColor: themed.card, 
              paddingHorizontal: 12, 
              paddingVertical: 8, 
              borderRadius: 10,
              borderWidth: 1,
              borderColor: themed.border,
              flexDirection: 'row', 
              alignItems: 'center',
            }}
          >
            <Ionicons name="filter" size={16} color={themed.accent} />
            {selectedRoute !== 'all' && (
              <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: themed.accent,
                width: 6,
                height: 6,
                borderRadius: 3
              }} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Mapa */}
      <View style={{
        flex: 2,
        marginHorizontal: 12,
        borderRadius: 12, 
        overflow: 'hidden', 
        borderWidth: 2, 
        borderColor: themed.accent,
        position: 'relative'
      }}>
        {!mapLoaded && !mapError && (
          <View style={{
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: themed.background, 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 10
          }}>
            <ActivityIndicator size="small" color={themed.accent} />
            <Text style={{color: themed.text, marginTop: 8, fontSize: 12}}>
              Cargando mapa...
            </Text>
          </View>
        )}
        
        {mapError && (
          <View style={{
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: themed.background, 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 10
          }}>
            <Ionicons name="alert-circle" size={32} color="#ef4444" />
            <Text style={{color: '#ef4444', marginTop: 8, fontSize: 12}}>
              Error al cargar el mapa
            </Text>
            <TouchableOpacity
              onPress={reloadMap}
              style={{
                backgroundColor: '#ef4444', 
                paddingHorizontal: 16, 
                paddingVertical: 8, 
                borderRadius: 8, 
                marginTop: 12,
              }}
            >
              <Text style={{color: 'white', fontSize: 12}}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <WebView
          key={mapKey}
          ref={webViewRef}
          source={{ html: getMapHtml() }}
          onMessage={onMarkerMessage}
          onLoadEnd={onWebViewLoad}
          onLoadStart={() => {
            setMapLoaded(false);
            setMapError(false);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1 }}
          onError={() => setMapError(true)}
        />

        {routeCalculating && (
          <TouchableOpacity
            onPress={clearRouteFromMap}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: '#ef4444',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              zIndex: 1000
            }}
          >
            <Ionicons name="close" size={14} color="white" />
            <Text style={{color: 'white', fontSize: 12, marginLeft: 4}}>
              Limpiar Ruta
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Información de Ruta Calculada - DEBAJO del mapa */}
      {currentRouteInfo && (
        <View style={{
          marginHorizontal: 12,
          marginTop: 8,
          backgroundColor: themed.card,
          borderRadius: 12,
          padding: 16,
          borderWidth: 2,
          borderColor: '#22c55e',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}>
            <Text style={{
              color: '#22c55e',
              fontSize: 16,
              fontWeight: 'bold'
            }}>
              🚗 Ruta Calculada
            </Text>
            <TouchableOpacity
              onPress={clearRouteFromMap}
              style={{
                backgroundColor: '#ef4444',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold'
              }}>
                Cerrar Ruta
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6' }}>📏</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: themed.text, marginTop: 4 }}>
                {currentRouteInfo.distance} km
              </Text>
              <Text style={{ fontSize: 12, color: themed.muted, marginTop: 2 }}>Distancia</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6' }}>⏱️</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: themed.text, marginTop: 4 }}>
                {currentRouteInfo.time} min
              </Text>
              <Text style={{ fontSize: 12, color: themed.muted, marginTop: 2 }}>Tiempo</Text>
            </View>
          </View>

          <View style={{ marginTop: 12, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: '#166534', textAlign: 'center' }}>
              📍 Las instrucciones detalladas aparecen en el panel del mapa
            </Text>
          </View>
        </View>
      )}

      {/* Lista de Lugares */}
      <View style={{flex: 1, marginTop: 12}}>
        <View style={{paddingHorizontal: 16, marginBottom: 8}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{
              color: themed.text, 
              fontSize: 16, 
              fontWeight: 'bold'
            }}>
              {selectedRoute !== 'all' 
                ? `${routes.find(r => r.id.toString() === selectedRoute)?.name}`
                : 'Todos los Lugares'
              } ({filteredPlaces.length})
            </Text>
            <TouchableOpacity 
              onPress={onRefresh} 
              style={{
                backgroundColor: themed.accent, 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                borderRadius: 8,
              }}
            >
              <Ionicons name="refresh" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={{flex: 1, paddingHorizontal: 16}}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[themed.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredPlaces.length === 0 ? (
            <View style={{
              backgroundColor: themed.card, 
              borderRadius: 12, 
              padding: 24, 
              alignItems: 'center', 
              borderWidth: 1,
              borderColor: themed.border,
            }}>
              <Ionicons name="map-outline" size={40} color={themed.accent} />
              <Text style={{
                color: themed.accent, 
                fontSize: 16, 
                fontWeight: 'bold', 
                marginTop: 12, 
                textAlign: 'center'
              }}>
                No se encontraron lugares
              </Text>
              <Text style={{
                color: themed.muted, 
                textAlign: 'center', 
                marginTop: 8,
                fontSize: 12,
              }}>
                {searchQuery || selectedRoute !== 'all' 
                  ? 'Prueba con otros términos de búsqueda'
                  : 'No hay lugares aprobados'
                }
              </Text>
            </View>
          ) : (
            filteredPlaces.map((place) => {
              const { isOpen, statusText } = getPlaceStatus(place.schedules || []);
              const categoryIcon = getCategoryIcon(place.category);
              
              return (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => handlePlaceSelection(place)}
                  style={{
                    backgroundColor: themed.card,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: themed.border,
                  }}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 8,
                      marginRight: 12,
                      backgroundColor: themed.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: themed.border
                    }}>
                      <Text style={{fontSize: 20}}>
                        {categoryIcon}
                      </Text>
                    </View>

                    <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Text style={{
                          color: themed.accent, 
                          fontWeight: 'bold', 
                          fontSize: 14,
                          flex: 1,
                          marginRight: 8
                        }} numberOfLines={1}>
                          {place.name}
                        </Text>
                        <View style={{
                          backgroundColor: isOpen ? '#dcfce7' : '#fef3c7',
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                          borderRadius: 4,
                        }}>
                          <Text style={{
                            color: isOpen ? '#166534' : '#92400e',
                            fontSize: 9,
                            fontWeight: 'bold'
                          }}>
                            {statusText}
                          </Text>
                        </View>
                      </View>

                      <Text style={{
                        color: themed.text, 
                        fontSize: 12, 
                        marginTop: 2,
                        lineHeight: 14
                      }} numberOfLines={2}>
                        {place.description}
                      </Text>

                      <View style={{
                        flexDirection: 'row', 
                        marginTop: 6, 
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Ionicons name="location" size={10} color={themed.muted} />
                          <Text style={{
                            color: themed.muted, 
                            fontSize: 10, 
                            marginLeft: 2,
                          }}>
                            {place.route_name || 'Sin ruta'}
                          </Text>
                        </View>
                        
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            calculateRouteInMap(place);
                          }}
                          style={{
                            backgroundColor: '#3b82f6',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          {routeCalculating === place.id ? (
                            <ActivityIndicator size={8} color="white" />
                          ) : (
                            <Ionicons name="navigate" size={8} color="white" />
                          )}
                          <Text style={{
                            color: 'white', 
                            fontSize: 9, 
                            fontWeight: 'bold',
                            marginLeft: 4
                          }}>
                            Cómo Llegar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Modal de Filtro de Rutas */}
      <Modal
        visible={showRouteFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRouteFilter(false)}
      >
        <View style={{
          flex: 1, 
          justifyContent: 'flex-end', 
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <View style={{
            backgroundColor: themed.card, 
            borderTopLeftRadius: 16, 
            borderTopRightRadius: 16, 
            padding: 20, 
            maxHeight: '60%',
          }}>
            <View style={{
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 16
            }}>
              <Text style={{
                color: themed.accent, 
                fontSize: 18, 
                fontWeight: 'bold'
              }}>Filtrar por Ruta</Text>
              <TouchableOpacity 
                onPress={() => setShowRouteFilter(false)}
              >
                <Ionicons name="close" size={20} color={themed.accent} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedRoute('all');
                  setShowRouteFilter(false);
                }}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedRoute === 'all' ? themed.accent : 'transparent',
                  borderWidth: 1,
                  borderColor: selectedRoute === 'all' ? themed.accent : themed.border,
                }}
              >
                <Text style={{
                  fontSize: 14,
                  color: selectedRoute === 'all' ? 'white' : themed.text,
                  textAlign: 'center'
                }}>
                  🗺️ Todas las Rutas ({places.length})
                </Text>
              </TouchableOpacity>

              {routes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  onPress={() => {
                    setSelectedRoute(route.id.toString());
                    setShowRouteFilter(false);
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: selectedRoute === route.id.toString() ? themed.accent : 'transparent',
                    borderWidth: 1,
                    borderColor: selectedRoute === route.id.toString() ? themed.accent : themed.border,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    color: selectedRoute === route.id.toString() ? 'white' : themed.text,
                    textAlign: 'center'
                  }}>
                    🛣️ {route.name} ({places.filter(p => p.route_id === route.id).length})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}