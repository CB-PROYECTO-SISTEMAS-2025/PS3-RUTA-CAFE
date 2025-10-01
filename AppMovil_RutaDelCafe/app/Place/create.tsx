import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import WebView from 'react-native-webview';

interface Route {
  id: number;
  name: string;
  status: string;
}

interface LocationResult {
  lat: number;
  lon: number;
  display_name: string;
}

interface Schedule {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

const COUNTRY_CODES = [
  { code: '+591', name: 'Bolivia', maxLength: 8 },
  { code: '+54', name: 'Argentina', maxLength: 10 },
  { code: '+57', name: 'Colombia', maxLength: 10 },
  { code: '+51', name: 'Perú', maxLength: 9 },
  { code: '+52', name: 'México', maxLength: 10 },
  { code: '+34', name: 'España', maxLength: 9 },
];

// Corregido según la estructura de la base de datos
const DAYS_OF_WEEK = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' }, // Corregido de 'maries' a 'martes'
  { key: 'miércoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sábado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

export default function CreatePlaceScreen() {
  const router = useRouter();
  const { routeId, routeName } = useLocalSearchParams<{ routeId?: string; routeName?: string }>();
  const numericRouteId = useMemo(() => (routeId ? Number(routeId) : undefined), [routeId]);

  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'light'>('standard');
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const webViewRef = useRef<WebView>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    route_id: '',
    website: '',
    phoneNumber: '',
    image_url: '',
    countryCode: COUNTRY_CODES[0].code,
  });

  const [schedule, setSchedule] = useState<Schedule[]>(
    DAYS_OF_WEEK.map(day => ({
      dayOfWeek: day.key,
      openTime: '09:00',
      closeTime: '18:00',
      isOpen: true,
    }))
  );

  // Cargar rutas aprobadas + permisos
  useEffect(() => {
    loadApprovedRoutes();
    requestPermissions();
  }, []);

  // Si venimos con routeId, fijarlo en el formulario
  useEffect(() => {
    if (numericRouteId) {
      setFormData(prev => ({ ...prev, route_id: String(numericRouteId) }));
    }
  }, [numericRouteId]);

  const requestPermissions = async () => {
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (mediaStatus !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a las imágenes.');
    }
    if (cameraStatus !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a la cámara.');
    }
    if (locationStatus !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a la ubicación.');
    }
  };

  const loadApprovedRoutes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/routes?status=aprobada`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const routesData: Route[] = await response.json();
        const approved = routesData.filter(r => r.status === 'aprobada');
        setRoutes(approved);
      }
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let filteredValue = value;

    switch (field) {
      case 'name':
        filteredValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        break;
      case 'phoneNumber': {
        const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.countryCode);
        filteredValue = value.replace(/[^0-9]/g, '');
        if (selectedCountry) filteredValue = filteredValue.slice(0, selectedCountry.maxLength);
        break;
      }
      case 'website':
        if (value && !value.match(/^https?:\/\/.+\..+/) && !value.startsWith('http')) {
          filteredValue = 'https://' + value;
        }
        break;
    }

    setFormData(prev => ({ ...prev, [field]: filteredValue }));
  };

  const handleCountryChange = (code: string) => {
    setFormData(prev => ({ ...prev, countryCode: code }));
  };

  const handleAcceptPhoneNumber = () => {
    setShowCountryModal(false);
  };

  // Funciones para manejar el horario
  const toggleDayOpen = (index: number) => {
    setSchedule(prev => prev.map((day, i) => 
      i === index ? { ...day, isOpen: !day.isOpen } : day
    ));
  };

  const updateScheduleTime = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    setSchedule(prev => prev.map((day, i) => 
      i === index ? { ...day, [field]: value } : day
    ));
  };

  const openScheduleEditor = (index: number) => {
    setEditingDay(index);
  };

  const applySameSchedule = (index: number) => {
    const dayToCopy = schedule[index];
    setSchedule(prev => prev.map(day => ({
      ...day,
      openTime: dayToCopy.openTime,
      closeTime: dayToCopy.closeTime,
      isOpen: dayToCopy.isOpen
    })));
    Alert.alert('Horario aplicado', 'Se ha aplicado el mismo horario para todos los días');
  };

  const getCurrentCountryName = () => {
    const country = COUNTRY_CODES.find(c => c.code === formData.countryCode);
    return country ? `${country.name} (${country.code})` : 'Seleccionar país';
  };

  const handleMapClick = (event: any) => {
    try {
      const [lat, lng] = event.nativeEvent.data.split(',');
      if (lat && lng) {
        const latitude = Number(parseFloat(lat).toFixed(6));
        const longitude = Number(parseFloat(lng).toFixed(6));
        setSelectedLocation({ latitude, longitude });
        setFormData(prev => ({ ...prev, latitude: String(latitude), longitude: String(longitude) }));
      }
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicación seleccionada');
    }
  };

  const placePinOnMap = (latitude: number, longitude: number) => {
    const script = `
      if (window.marker) {
        map.removeLayer(window.marker);
      }
      window.marker = L.marker([${latitude}, ${longitude}], { icon: customIcon })
        .addTo(map)
        .bindPopup('Ubicación seleccionada')
        .openPopup();
      map.setView([${latitude}, ${longitude}], 16);
      true;
    `;
    
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Búsqueda vacía', 'Por favor ingresa una dirección o lugar para buscar');
      return;
    }
    
    setSearchingLocation(true);
    setShowResults(false);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TouristApp/1.0 (your-email@example.com)',
            'Accept': 'application/json',
            'Accept-Language': 'es,en;q=0.9',
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acceso denegado al servicio de búsqueda. Intenta más tarde.');
        }
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Error al procesar los resultados de búsqueda');
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        setSearchResults(data);
        setShowResults(true);
        
        const firstResult = data[0];
        const latitude = Number(parseFloat(firstResult.lat as any).toFixed(6));
        const longitude = Number(parseFloat(firstResult.lon as any).toFixed(6));
        
        setSelectedLocation({ latitude, longitude });
        setFormData(prev => ({ ...prev, latitude: String(latitude), longitude: String(longitude) }));
        
        placePinOnMap(latitude, longitude);
        
        Alert.alert('Ubicación encontrada', 
          `Se ha colocado un pin en: ${firstResult.display_name}\n\nPuedes ajustar la ubicación tocando el mapa directamente.`);
      } else {
        Alert.alert('No se encontraron resultados', 'Intenta con términos de búsqueda más específicos');
        setShowResults(false);
      }
    } catch (error) {
      Alert.alert('Error de búsqueda', 
        (error as Error).message || 'No se pudo completar la búsqueda. Verifica tu conexión a internet e intenta nuevamente.');
      setShowResults(false);
    } finally {
      setSearchingLocation(false);
    }
  };

  const selectSearchResult = (result: LocationResult) => {
    const latitude = Number(parseFloat(result.lat as any).toFixed(6));
    const longitude = Number(parseFloat(result.lon as any).toFixed(6));
    setSelectedLocation({ latitude, longitude });
    setFormData(prev => ({ ...prev, latitude: String(latitude), longitude: String(longitude) }));
    setSearchQuery(result.display_name);
    setShowResults(false);
    
    placePinOnMap(latitude, longitude);
    
    Alert.alert('Ubicación seleccionada', 
      `Se ha colocado un pin en: ${result.display_name}\n\nPuedes ajustar la ubicación tocando el mapa directamente.`);
  };

  const getCurrentLocation = async () => {
    try {
      setSearchingLocation(true);
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso de ubicación para usar esta función');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      
      setSelectedLocation({ latitude, longitude });
      setFormData(prev => ({ 
        ...prev, 
        latitude: String(Number(latitude.toFixed(6))), 
        longitude: String(Number(longitude.toFixed(6))) 
      }));

      placePinOnMap(latitude, longitude);

      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          const displayName = [
            address.street,
            address.name,
            address.district,
            address.city,
            address.region,
            address.country
          ].filter(Boolean).join(', ');
          
          setSearchQuery(displayName || 'Ubicación actual');
        }
      } catch (geocodeError) {
        setSearchQuery(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }

      Alert.alert('Ubicación actual', 
        `Se ha colocado un pin en tu ubicación actual:\n\nLatitud: ${latitude.toFixed(6)}\nLongitud: ${longitude.toFixed(6)}\n\nPuedes ajustar la ubicación tocando el mapa directamente.`);

    } catch (error) {
      Alert.alert('Error', 
        'No se pudo obtener la ubicación actual. Verifica que el GPS esté activado e intenta nuevamente.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        setFormData(prev => ({ ...prev, image_url: result.assets[0].uri }));
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        setFormData(prev => ({ ...prev, image_url: result.assets[0].uri }));
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre del lugar es obligatorio');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'La descripción es obligatoria');
      return false;
    }
    if (!formData.latitude || !formData.longitude) {
      Alert.alert('Error', 'Debe seleccionar una ubicación en el mapa');
      return false;
    }
    if (!formData.route_id) {
      Alert.alert('Error', 'Debe seleccionar una ruta');
      return false;
    }
    if (formData.website && !formData.website.match(/^https?:\/\/.+\..+/)) {
      Alert.alert('Error', 'El sitio web debe ser una URL válida');
      return false;
    }
    const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.countryCode);
    if (formData.phoneNumber) {
      if (!formData.phoneNumber.match(/^\d+$/)) {
        Alert.alert('Error', 'El teléfono debe contener solo números');
        return false;
      }
      if (selectedCountry && formData.phoneNumber.length < 6) {
        Alert.alert('Error', `El teléfono debe tener al menos 6 dígitos para ${selectedCountry.name}`);
        return false;
      }
      if (selectedCountry && formData.phoneNumber.length > selectedCountry.maxLength) {
        Alert.alert('Error', `El teléfono no puede exceder ${selectedCountry.maxLength} dígitos para ${selectedCountry.name}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      // Preparar datos para enviar
      const submitData = new FormData();
      
      // Datos básicos del lugar
      submitData.append('name', formData.name.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('latitude', formData.latitude);
      submitData.append('longitude', formData.longitude);
      submitData.append('route_id', formData.route_id);
      submitData.append('website', formData.website || '');
      submitData.append('phoneNumber', formData.countryCode + (formData.phoneNumber || ''));
      
      // Preparar horarios en formato correcto para el backend
      const schedulesData = schedule
        .filter(daySchedule => daySchedule.isOpen)
        .map(daySchedule => ({
          dayOfWeek: daySchedule.dayOfWeek,
          openTime: daySchedule.openTime + ':00', // Agregar segundos para formato time
          closeTime: daySchedule.closeTime + ':00'
        }));

      // Agregar horarios como string JSON
      submitData.append('schedules', JSON.stringify(schedulesData));

      // Manejar imagen
      if (formData.image_url) {
        const filename = formData.image_url.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        submitData.append('image', {
          uri: formData.image_url,
          name: filename || 'image.jpg',
          type,
        } as any);
      }

      console.log('Enviando datos...', {
        name: formData.name,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        route_id: formData.route_id,
        website: formData.website,
        phoneNumber: formData.countryCode + formData.phoneNumber,
        schedules: schedulesData
      });

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          // No incluir Content-Type para FormData, React Native lo establece automáticamente con boundary
        },
        body: submitData,
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText || 'Error desconocido' };
      }

      if (response.ok) {
        Alert.alert('Éxito', 'Lugar creado correctamente', [
          {
            text: 'OK',
            onPress: () => {
              if (numericRouteId) {
                router.replace({ pathname: '/Place', params: { routeId: String(numericRouteId) } });
              } else {
                router.replace('/Place');
              }
            },
          },
        ]);
      } else {
        console.error('Error del servidor:', response.status, responseData);
        throw new Error(responseData.message || `Error ${response.status} al crear el lugar`);
      }
    } catch (error) {
      console.error('Error completo en handleSubmit:', error);
      Alert.alert('Error', (error as Error).message || 'No se pudo crear el lugar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getLeafletMapHTML = () => {
    const initialLat = selectedLocation?.latitude || -17.3939;
    const initialLng = selectedLocation?.longitude || -66.1568;

    const tileLayers: Record<string, string> = {
      standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      light: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Map</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100%; }
            
            .custom-icon {
              background: #ea580c;
              border: 3px solid #fff;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            
            .current-location-icon {
              background: #2563eb;
              border: 3px solid #fff;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${initialLat}, ${initialLng}], 13);

            L.tileLayer('${tileLayers[mapType]}', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            const customIcon = L.divIcon({
              className: 'custom-icon',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            const currentLocationIcon = L.divIcon({
              className: 'current-location-icon',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });

            let marker = null;

            ${selectedLocation ? `
              marker = L.marker([${selectedLocation.latitude}, ${selectedLocation.longitude}], { icon: customIcon })
                .addTo(map)
                .bindPopup('Ubicación seleccionada')
                .openPopup();
            ` : ''}

            map.on('click', function(e) {
              if (marker) {
                map.removeLayer(marker);
              }
              marker = L.marker(e.latlng, { icon: customIcon })
                .addTo(map)
                .bindPopup('Ubicación seleccionada')
                .openPopup();

              window.ReactNativeWebView.postMessage(e.latlng.lat + ',' + e.latlng.lng);
            });
          </script>
      </body>
      </html>
    `;
  };

  // Función para formatear el horario para mostrar
  const getScheduleSummary = () => {
    const openDays = schedule.filter(day => day.isOpen);
    if (openDays.length === 0) return 'Cerrado todos los días';
    
    // Verificar si todos los días tienen el mismo horario
    const firstOpenDay = openDays[0];
    const allSameSchedule = openDays.every(day => 
      day.openTime === firstOpenDay.openTime && 
      day.closeTime === firstOpenDay.closeTime
    );
    
    if (openDays.length === 7 && allSameSchedule) {
      return `Lun-Dom: ${firstOpenDay.openTime} - ${firstOpenDay.closeTime}`;
    }
    
    return `${openDays.length} días configurados`;
  };

  const lockedRouteName =
    routeName ||
    (numericRouteId ? routes.find(r => r.id === numericRouteId)?.name : undefined) ||
    (numericRouteId ? `Ruta #${numericRouteId}` : undefined);

  return (
    <View className="flex-1 bg-orange-50">
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">Crear Nuevo Lugar</Text>
        {numericRouteId && (
          <Text className="text-orange-100 text-center mt-1">
            En {lockedRouteName}
          </Text>
        )}
      </View>

      <ScrollView className="flex-1 px-6 mt-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl p-6 shadow-md border border-orange-200 mb-6">
          {/* Campos del formulario */}
          {[
            { key: 'name', label: 'Nombre del Lugar', placeholder: 'Ej: Café Central', required: true },
            { key: 'description', label: 'Descripción', placeholder: 'Descripción del lugar...', required: true, multiline: true },
          ].map((field) => (
            <View key={field.key} className="mb-4">
              <Text className="text-orange-800 font-semibold mb-2">
                {field.label} {field.required && '*'}
              </Text>
              <TextInput
                className={`border-2 rounded-xl p-3 text-orange-900 ${
                  field.required && !(formData as any)[field.key] ? 'border-red-300' : 'border-orange-200'
                }`}
                placeholder={field.placeholder}
                value={(formData as any)[field.key]}
                onChangeText={(text) => handleInputChange(field.key, text)}
                multiline={!!field.multiline}
                numberOfLines={field.multiline ? 4 : 1}
                textAlignVertical={field.multiline ? 'top' : 'center'}
              />
            </View>
          ))}

          {/* Selector de ubicación en mapa */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Ubicación *</Text>
            <TouchableOpacity
              onPress={() => setMapModalVisible(true)}
              className="border-2 border-orange-200 rounded-xl p-3 flex-row items-center justify-between"
            >
              <Text className="text-orange-900" numberOfLines={1}>
                {formData.latitude && formData.longitude
                  ? `Lat: ${formData.latitude}, Lng: ${formData.longitude}`
                  : 'Seleccionar ubicación en el mapa'}
              </Text>
              <Ionicons name="map-outline" size={20} color="#ea580c" />
            </TouchableOpacity>
          </View>

          {/* Horario de atención */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Horario de Atención</Text>
            <TouchableOpacity
              onPress={() => setScheduleModalVisible(true)}
              className="border-2 border-orange-200 rounded-xl p-3 flex-row items-center justify-between"
            >
              <Text className="text-orange-900" numberOfLines={1}>
                {getScheduleSummary()}
              </Text>
              <Ionicons name="time-outline" size={20} color="#ea580c" />
            </TouchableOpacity>
            <Text className="text-orange-600 text-xs mt-1">
              Toque para configurar el horario de atención
            </Text>
          </View>

          {/* Selector de Ruta */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Ruta *</Text>

            {numericRouteId ? (
              <View className="border-2 border-green-300 bg-green-50 rounded-xl p-3">
                <Text className="text-green-800 font-semibold">
                  {lockedRouteName}
                </Text>
                <Text className="text-green-600 text-xs mt-1">Ruta fija desde la pantalla anterior</Text>
              </View>
            ) : (
              <View className="border-2 border-orange-200 rounded-xl max-h-40">
                <ScrollView>
                  {routes.map((route) => (
                    <TouchableOpacity
                      key={route.id}
                      onPress={() => handleInputChange('route_id', route.id.toString())}
                      className={`p-3 border-b border-orange-100 ${
                        formData.route_id === route.id.toString() ? 'bg-orange-100' : ''
                      }`}
                    >
                      <Text className="text-orange-900 font-medium">{route.name}</Text>
                      <Text className="text-green-600 text-xs">✓ Aprobada</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {formData.route_id && !numericRouteId && (
              <Text className="text-orange-600 text-sm mt-1">
                Ruta seleccionada: {routes.find(r => r.id.toString() === formData.route_id)?.name}
              </Text>
            )}
          </View>

          {/* Sitio Web */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Sitio Web</Text>
            <TextInput
              className="border-2 border-orange-200 rounded-xl p-3 text-orange-900"
              placeholder="https://ejemplo.com"
              value={formData.website}
              onChangeText={(text) => handleInputChange('website', text)}
              keyboardType="url"
            />
          </View>

          {/* Teléfono - Versión con modal */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Teléfono</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <TouchableOpacity
                  onPress={() => setShowCountryModal(true)}
                  className="border-2 border-orange-200 rounded-xl p-3 flex-row items-center justify-between"
                >
                  <Text className="text-orange-900" numberOfLines={1}>
                    {formData.phoneNumber ? `${formData.countryCode} ${formData.phoneNumber}` : 'Seleccionar teléfono'}
                  </Text>
                  <Ionicons name="call-outline" size={20} color="#ea580c" />
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-orange-600 text-xs mt-1">
              Toque el campo para seleccionar país y número
            </Text>
          </View>

          {/* Imagen */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Imagen del Lugar</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={pickImage}
                className="flex-1 bg-orange-100 border border-orange-300 py-3 rounded-xl flex-row items-center justify-center"
              >
                <Ionicons name="image-outline" size={20} color="#ea580c" />
                <Text className="text-orange-700 font-medium ml-2">Galería</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={takePhoto}
                className="flex-1 bg-orange-100 border border-orange-300 py-3 rounded-xl flex-row items-center justify-center"
              >
                <Ionicons name="camera-outline" size={20} color="#ea580c" />
                <Text className="text-orange-700 font-medium ml-2">Cámara</Text>
              </TouchableOpacity>
            </View>
            {formData.image_url && <Text className="text-green-600 text-sm mt-2">✓ Imagen seleccionada</Text>}
          </View>

          {/* Acciones */}
          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity onPress={() => router.back()} className="flex-1 bg-orange-100 border border-orange-400 py-4 rounded-xl">
              <Text className="text-orange-700 font-semibold text-center">Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-1 bg-orange-500 py-4 rounded-xl shadow-lg">
              {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-center">Crear Lugar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal del Horario */}
      <Modal visible={scheduleModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white">
          <View className="bg-orange-500 px-6 py-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Horario de Atención</Text>
            <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <Text className="text-orange-600 text-sm mb-4 text-center">
              Configura los horarios de atención para cada día de la semana
            </Text>

            {schedule.map((daySchedule, index) => (
              <View key={daySchedule.dayOfWeek} className="bg-orange-50 rounded-xl p-4 mb-3 border border-orange-200">
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                      onPress={() => toggleDayOpen(index)}
                      className={`w-6 h-6 rounded-md border-2 mr-3 ${
                        daySchedule.isOpen 
                          ? 'bg-orange-500 border-orange-500' 
                          : 'bg-white border-orange-300'
                      }`}
                    >
                      {daySchedule.isOpen && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </TouchableOpacity>
                    <Text className="text-orange-900 font-semibold text-lg">
                      {DAYS_OF_WEEK.find(day => day.key === daySchedule.dayOfWeek)?.label}
                    </Text>
                  </View>
                  
                  <View className="flex-row gap-2">
                    <TouchableOpacity 
                      onPress={() => applySameSchedule(index)}
                      className="bg-blue-500 px-3 py-1 rounded-lg"
                    >
                      <Text className="text-white text-xs font-medium">Aplicar a todos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => openScheduleEditor(index)}
                      className="bg-orange-500 px-3 py-1 rounded-lg"
                    >
                      <Text className="text-white text-xs font-medium">Editar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {daySchedule.isOpen ? (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={16} color="#ea580c" />
                      <Text className="text-orange-700 ml-2">
                        {daySchedule.openTime} - {daySchedule.closeTime}
                      </Text>
                    </View>
                    <Text className="text-green-600 text-sm font-medium">● Abierto</Text>
                  </View>
                ) : (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-orange-600">Cerrado</Text>
                    <Text className="text-red-600 text-sm font-medium">● Cerrado</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity 
              onPress={() => setScheduleModalVisible(false)}
              className="bg-orange-500 py-3 rounded-xl"
            >
              <Text className="text-white font-bold text-center">Guardar Horario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para editar horario específico */}
      <Modal visible={editingDay !== null} animationType="slide" transparent={true}>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 mx-4 w-11/12 max-w-md">
            <Text className="text-orange-800 text-xl font-bold mb-4 text-center">
              Editar Horario - {editingDay !== null ? DAYS_OF_WEEK[editingDay]?.label : ''}
            </Text>

            {editingDay !== null && (
              <>
                <View className="mb-4">
                  <Text className="text-orange-700 font-semibold mb-2">Hora de Apertura:</Text>
                  <TextInput
                    className="border-2 border-orange-200 rounded-xl p-3 text-orange-900"
                    value={schedule[editingDay].openTime}
                    onChangeText={(text) => updateScheduleTime(editingDay, 'openTime', text)}
                    placeholder="HH:MM"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-orange-700 font-semibold mb-2">Hora de Cierre:</Text>
                  <TextInput
                    className="border-2 border-orange-200 rounded-xl p-3 text-orange-900"
                    value={schedule[editingDay].closeTime}
                    onChangeText={(text) => updateScheduleTime(editingDay, 'closeTime', text)}
                    placeholder="HH:MM"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <Text className="text-orange-600 text-xs text-center mb-4">
                  Formato: HH:MM (24 horas). Ej: 09:00, 14:30, 18:00
                </Text>
              </>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setEditingDay(null)}
                className="flex-1 bg-orange-100 border border-orange-400 py-3 rounded-xl"
              >
                <Text className="text-orange-700 font-semibold text-center">Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setEditingDay(null)}
                className="flex-1 bg-orange-500 py-3 rounded-xl"
              >
                <Text className="text-white font-bold text-center">Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal del Mapa */}
      <Modal visible={mapModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white">
          <View className="bg-orange-500 px-6 py-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Seleccionar Ubicación</Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="p-4 border-b border-gray-200">
            <View className="flex-row mb-2">
              <TextInput
                className="flex-1 border-2 border-orange-200 rounded-l-xl p-3"
                placeholder="Buscar dirección o lugar..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchLocation}
                returnKeyType="search"
              />
              <TouchableOpacity 
                onPress={searchLocation} 
                disabled={searchingLocation}
                className="bg-orange-500 px-4 rounded-r-xl justify-center"
              >
                {searchingLocation ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="search" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={getCurrentLocation}
              disabled={searchingLocation}
              className="bg-blue-500 py-3 rounded-xl flex-row items-center justify-center mb-2"
            >
              {searchingLocation ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="locate" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Mi Ubicación Actual</Text>
                </>
              )}
            </TouchableOpacity>

            <Text className="text-orange-600 text-xs text-center">
              💡 Busca una ubicación o toca el mapa directamente para colocar el pin
            </Text>

            {showResults && (
              <View className="absolute top-40 left-0 right-0 bg-white border border-gray-200 rounded-xl z-10 max-h-48 shadow-lg">
                <View className="p-2 border-b border-gray-100">
                  <Text className="text-orange-700 font-semibold">Resultados de búsqueda:</Text>
                </View>
                <ScrollView>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity 
                      key={index} 
                      onPress={() => selectSearchResult(result)} 
                      className="p-3 border-b border-gray-100 active:bg-orange-50"
                    >
                      <Text className="text-orange-900 text-sm" numberOfLines={2}>
                        {result.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View className="flex-row justify-around p-3 bg-orange-50">
            <TouchableOpacity 
              onPress={() => setMapType('standard')}
              className={`px-4 py-2 rounded-lg flex-row items-center ${
                mapType === 'standard' ? 'bg-orange-500' : 'bg-orange-200'
              }`}
            >
              <Ionicons 
                name="map-outline" 
                size={16} 
                color={mapType === 'standard' ? 'white' : '#ea580c'} 
              />
              <Text className={`font-medium ml-2 ${
                mapType === 'standard' ? 'text-white' : 'text-orange-700'
              }`}>
                Estándar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setMapType('satellite')}
              className={`px-4 py-2 rounded-lg flex-row items-center ${
                mapType === 'satellite' ? 'bg-orange-500' : 'bg-orange-200'
              }`}
            >
              <Ionicons 
                name="earth-outline" 
                size={16} 
                color={mapType === 'satellite' ? 'white' : '#ea580c'} 
              />
              <Text className={`font-medium ml-2 ${
                mapType === 'satellite' ? 'text-white' : 'text-orange-700'
              }`}>
                Satélite
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setMapType('light')}
              className={`px-4 py-2 rounded-lg flex-row items-center ${
                mapType === 'light' ? 'bg-orange-500' : 'bg-orange-200'
              }`}
            >
              <Ionicons 
                name="sunny-outline" 
                size={16} 
                color={mapType === 'light' ? 'white' : '#ea580c'} 
              />
              <Text className={`font-medium ml-2 ${
                mapType === 'light' ? 'text-white' : 'text-orange-700'
              }`}>
                Light
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <WebView 
              ref={webViewRef}
              source={{ html: getLeafletMapHTML() }} 
              style={{ flex: 1 }} 
              onMessage={handleMapClick} 
            />
          </View>

          <View className="p-4 border-t border-gray-200">
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setMapModalVisible(false)} className="flex-1 bg-orange-100 border border-orange-400 py-3 rounded-xl">
                <Text className="text-orange-700 font-semibold text-center">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (selectedLocation) {
                    setMapModalVisible(false);
                    Alert.alert('Ubicación confirmada', 
                      `Ubicación guardada:\n\nLatitud: ${formData.latitude}\nLongitud: ${formData.longitude}`);
                  } else {
                    Alert.alert('Ubicación requerida', 'Por favor selecciona una ubicación en el mapa');
                  }
                }}
                className="flex-1 bg-orange-500 py-3 rounded-xl"
              >
                <Text className="text-white font-bold text-center">Confirmar Ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para selección de código de país y número */}
      <Modal visible={showCountryModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 mx-4 w-11/12 max-w-md">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-orange-800 text-xl font-bold">
                Seleccionar Teléfono
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCountryModal(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#ea580c" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-orange-700 font-semibold mb-2">País:</Text>
            <ScrollView className="max-h-32 mb-4">
              {COUNTRY_CODES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  onPress={() => handleCountryChange(country.code)}
                  className={`p-3 border-b border-orange-100 rounded-lg mb-1 ${
                    formData.countryCode === country.code ? 'bg-orange-100 border-orange-300' : 'bg-orange-50'
                  }`}
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-orange-900 font-medium">
                        {country.name}
                      </Text>
                      <Text className="text-orange-600 text-xs">{country.code}</Text>
                    </View>
                    <Text className="text-orange-500 text-xs">
                      Máx. {country.maxLength} dígitos
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-orange-700 font-semibold mb-2">
              Número de teléfono para {COUNTRY_CODES.find(c => c.code === formData.countryCode)?.name}:
            </Text>
            <TextInput
              className="border-2 border-orange-200 rounded-xl p-3 text-orange-900 mb-4"
              placeholder={`Ingresa número (máx. ${COUNTRY_CODES.find(c => c.code === formData.countryCode)?.maxLength} dígitos)`}
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
              maxLength={COUNTRY_CODES.find(c => c.code === formData.countryCode)?.maxLength || 10}
            />

            <View className="bg-orange-50 p-3 rounded-xl mb-4">
              <Text className="text-orange-700 text-sm">Vista previa:</Text>
              <Text className="text-orange-900 font-semibold text-lg">
                {formData.countryCode} {formData.phoneNumber || 'XXX-XXX-XXX'}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => {
                  setFormData(prev => ({ ...prev, phoneNumber: '' }));
                  setShowCountryModal(false);
                }}
                className="flex-1 bg-orange-100 border border-orange-400 py-3 rounded-xl"
              >
                <Text className="text-orange-700 font-semibold text-center">Limpiar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleAcceptPhoneNumber}
                className="flex-1 bg-orange-500 py-3 rounded-xl"
              >
                <Text className="text-white font-bold text-center">Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}