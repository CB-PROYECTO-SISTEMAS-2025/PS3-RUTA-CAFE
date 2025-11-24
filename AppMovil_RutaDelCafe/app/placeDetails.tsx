import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemedStyles } from "../hooks/useThemedStyles";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  website?: string;
  phoneNumber?: string;
  image_url?: string;
  createdAt: string;
  schedules?: Schedule[];
  category?: string;
}

const { width: screenWidth } = Dimensions.get('window');

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

const openInOSMaps = async (latitude: number | string, longitude: number | string, placeName: string, userLocation: { lat: number; lng: number } | null) => {
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  
  let url = `https://www.openstreetmap.org/directions?from=&to=${lat},${lng}#map=15/${lat}/${lng}`;
  
  if (userLocation) {
    url = `https://www.openstreetmap.org/directions?from=${userLocation.lat},${userLocation.lng}&to=${lat},${lng}#map=13/${userLocation.lat}/${userLocation.lng}`;
  }
  
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'No se puede abrir OpenStreetMap');
    }
  } catch (error) {
    Alert.alert('Error', 'No se pudo abrir OpenStreetMap');
  }
};

export default function PlaceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const themed = useThemedStyles();
  
  // OBTENER EL placeId CORRECTAMENTE DE LOS PARÁMETROS
  const placeId = params.placeId ? parseInt(params.placeId as string) : null;
  
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    console.log('📍 Parámetros recibidos:', params);
    console.log('📍 PlaceId extraído:', placeId);
    
    if (placeId) {
      fetchPlaceDetails();
      requestLocationPermission();
    } else {
      console.error('❌ Error: placeId no proporcionado');
      setLoading(false);
    }
  }, [placeId]);

  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
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
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchPlaceDetails = async () => {
    if (!placeId) {
      console.error('❌ No se puede cargar detalles: placeId es null');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📍 Cargando detalles del lugar ID:', placeId);
      
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/places/${placeId}`;
      console.log('📍 URL de la petición:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('📍 Respuesta del servidor:', response.status);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const placeData = await response.json();
      console.log('📍 Datos del lugar recibidos:', placeData);
      setPlace(placeData);
    } catch (error) {
      console.error('❌ Error cargando detalles del lugar:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles del lugar');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInMaps = () => {
    if (!place) return;
    
    openInOSMaps(place.latitude, place.longitude, place.name, userLocation);
  };

  const handleGetDirections = () => {
    if (!place || !userLocation) {
      Alert.alert(
        'Ubicación requerida',
        'Necesitamos tu ubicación para calcular la ruta. ¿Quieres activar tu ubicación ahora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Activar', onPress: () => requestLocationPermission() }
        ]
      );
      return;
    }

    // Abrir en OpenStreetMap con direcciones
    openInOSMaps(place.latitude, place.longitude, place.name, userLocation);
  };

  if (loading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: themed.background}}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={themed.accent} />
          <Text style={{color: themed.text, marginTop: 16, fontSize: 16}}>
            Cargando detalles...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!place) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: themed.background}}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Ionicons name="alert-circle" size={64} color={themed.accent} />
          <Text style={{color: themed.text, marginTop: 16, fontSize: 18}}>
            No se encontró el lugar
          </Text>
          <Text style={{color: themed.muted, marginTop: 8, fontSize: 14, textAlign: 'center'}}>
            ID: {placeId || 'No proporcionado'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: themed.accent,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 20,
            }}
          >
            <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold'}}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { isOpen, statusText } = getPlaceStatus(place.schedules);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: themed.background}}>
      {/* Header */}
      <View style={{
        backgroundColor: themed.accent, 
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)', 
            padding: 8, 
            borderRadius: 8,
            marginRight: 12,
          }}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={{flex: 1}}>
          <Text style={{color: 'white', fontSize: 18, fontWeight: 'bold'}} numberOfLines={1}>
            {getCategoryIcon(place.category)} {place.name}
          </Text>
          {place.category && (
            <Text style={{color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2}}>
              {place.category.charAt(0).toUpperCase() + place.category.slice(1)}
            </Text>
          )}
        </View>
      </View>

      <ScrollView 
        style={{flex: 1}}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 20}}
      >
        {/* Imagen principal */}
        {place.image_url ? (
          <Image
            source={{ uri: place.image_url }}
            style={{
              width: screenWidth,
              height: 200,
              resizeMode: 'cover',
            }}
          />
        ) : (
          <View style={{
            width: screenWidth,
            height: 200,
            backgroundColor: themed.background,
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderBottomColor: themed.border
          }}>
            <Text style={{fontSize: 48}}>
              {getCategoryIcon(place.category)}
            </Text>
          </View>
        )}

        {/* Información principal */}
        <View style={{padding: 20}}>
          {/* Estado y ruta */}
          <View style={{
            backgroundColor: themed.card, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            borderWidth: 1,
            borderColor: themed.border,
          }}>
            <View style={{
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 8
            }}>
              <Text style={{
                color: themed.text, 
                fontWeight: 'bold',
                fontSize: 18
              }}>
                {place.route_name || 'Sin ruta asignada'}
              </Text>
              <View style={{
                backgroundColor: '#dcfce7', 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                borderRadius: 8,
              }}>
                <Text style={{
                  color: '#166534', 
                  fontSize: 14, 
                  fontWeight: 'bold'
                }}>✅ Aprobado</Text>
              </View>
            </View>
            
            <Text style={{
              color: themed.muted, 
              fontSize: 14, 
              marginBottom: 12
            }}>
              Registrado el {new Date(place.createdAt).toLocaleDateString('es-ES')}
            </Text>
            
            {/* Estado actual */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              backgroundColor: isOpen ? '#f0fdf4' : '#fffbeb',
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: isOpen ? '#22c55e' : '#f59e0b'
            }}>
              <Ionicons 
                name={isOpen ? "checkmark-circle" : "time"} 
                size={20} 
                color={isOpen ? '#22c55e' : '#f59e0b'} 
              />
              <Text style={{
                color: isOpen ? '#166534' : '#92400e',
                fontSize: 16,
                fontWeight: '600',
                marginLeft: 12
              }}>
                {statusText}
              </Text>
            </View>
          </View>

          {/* Descripción */}
          <View style={{
            backgroundColor: themed.card, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            borderWidth: 1,
            borderColor: themed.border,
          }}>
            <Text style={{
              color: themed.text, 
              fontWeight: 'bold', 
              fontSize: 18, 
              marginBottom: 12,
            }}>
              📝 Descripción
            </Text>
            <Text style={{
              color: themed.text, 
              fontSize: 16, 
              lineHeight: 24
            }}>
              {place.description || 'Este lugar no tiene descripción disponible.'}
            </Text>
          </View>

          {/* Horario */}
          <View style={{
            backgroundColor: themed.card, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            borderWidth: 1, 
            borderColor: themed.border
          }}>
            <Text style={{
              color: themed.text, 
              fontWeight: 'bold', 
              fontSize: 18, 
              marginBottom: 12,
            }}>
              🕒 Horario de Atención
            </Text>
            {place.schedules && place.schedules.length > 0 ? (
              place.schedules
                .sort((a, b) => {
                  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  return dayOrder.indexOf(a.dayOfWeek.toLowerCase()) - dayOrder.indexOf(b.dayOfWeek.toLowerCase());
                })
                .map(schedule => (
                  <View key={schedule.id} style={{
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: themed.border
                  }}>
                    <Text style={{color: themed.text, fontSize: 16, fontWeight: '500', flex: 1}}>
                      {formatDayName(schedule.dayOfWeek)}
                    </Text>
                    <Text style={{color: themed.text, fontSize: 16, fontWeight: '600'}}>
                      {formatTime(schedule.openTime)} - {formatTime(schedule.closeTime)}
                    </Text>
                  </View>
                ))
            ) : (
              <View style={{paddingVertical: 16}}>
                <Text style={{color: themed.muted, fontSize: 16, textAlign: 'center'}}>
                  Horario no disponible
                </Text>
              </View>
            )}
          </View>

          {/* Información de contacto */}
          {(place.website || place.phoneNumber) && (
            <View style={{
              backgroundColor: themed.card, 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 16,
              borderWidth: 1,
              borderColor: themed.border,
            }}>
              <Text style={{
                color: themed.text, 
                fontWeight: 'bold', 
                fontSize: 18, 
                marginBottom: 12,
              }}>
                📞 Contacto
              </Text>
              {place.website && (
                <TouchableOpacity 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    marginBottom: 8,
                  }}
                  onPress={() => Linking.openURL(place.website!)}
                >
                  <Ionicons name="globe" size={20} color={themed.accent} />
                  <Text style={{
                    color: themed.accent,
                    fontSize: 16,
                    marginLeft: 12,
                    textDecorationLine: 'underline',
                    flex: 1,
                  }} numberOfLines={1}>
                    {place.website}
                  </Text>
                </TouchableOpacity>
              )}
              {place.phoneNumber && (
                <TouchableOpacity 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                  }}
                  onPress={() => Linking.openURL(`tel:${place.phoneNumber}`)}
                >
                  <Ionicons name="call" size={20} color={themed.accent} />
                  <Text style={{
                    color: themed.accent,
                    fontSize: 16,
                    marginLeft: 12,
                  }}>
                    {place.phoneNumber}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Botones de acción */}
          <View style={{
            flexDirection: 'row', 
            gap: 12,
            marginTop: 8,
          }}>
            <TouchableOpacity
              onPress={handleGetDirections}
              style={{
                flex: 1, 
                backgroundColor: '#3b82f6', 
                paddingVertical: 16, 
                borderRadius: 12, 
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="navigate" size={22} color="white" />
              <Text style={{
                color: 'white', 
                fontWeight: 'bold', 
                fontSize: 16,
                marginLeft: 8
              }}>
                Cómo Llegar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenInMaps}
              style={{
                backgroundColor: themed.accent, 
                paddingVertical: 16, 
                paddingHorizontal: 20,
                borderRadius: 12, 
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="map" size={22} color="white" />
              <Text style={{
                color: 'white', 
                fontWeight: 'bold', 
                fontSize: 16,
                marginLeft: 8
              }}>Ver en Mapa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}