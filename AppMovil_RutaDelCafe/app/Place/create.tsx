// app/Place/create.tsx
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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import WebView from 'react-native-webview';
import { useThemedStyles } from '../../hooks/useThemedStyles';

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
  { key: 'martes', label: 'Martes' },
  { key: 'miércoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sábado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const normalizeImageUrl = (url: string | null): string => {
  if (!url) return '';
  
  // 🔴 CORRECCIÓN: Si es una URL local del servidor de desarrollo, convertir a ruta relativa
  if (url.includes('192.168.0.14') || url.includes('localhost')) {
    // Extraer solo la parte de la ruta después de /uploads/
    const match = url.match(/\/uploads\/.+$/);
    return match ? match[0] : url;
  }
  
  // Si ya es una ruta relativa, mantenerla
  if (url.startsWith('/uploads/')) {
    return url;
  }
  
  return url;
};


export default function CreatePlaceScreen() {
  const themed = useThemedStyles();
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

  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
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
      } catch {
        setSearchQuery(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }

      Alert.alert('Ubicación actual', 
        `Se ha colocado un pin en tu ubicación actual:\n\nLatitud: ${latitude.toFixed(6)}\nLongitud: ${longitude.toFixed(6)}\n\nPuedes ajustar la ubicación tocando el mapa directamente.`);

    } catch {
      Alert.alert('Error', 
        'No se pudo obtener la ubicación actual. Verifica que el GPS esté activado e intenta nuevamente.');
    } finally {
      setSearchingLocation(false);
    }
  };

  // Funciones para manejar imágenes
  const pickImage = async (isAdditional = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (isAdditional) {
          if (additionalImages.length >= 8) {
            Alert.alert('Límite alcanzado', 'Solo puedes agregar hasta 8 imágenes adicionales');
            return;
          }
          setAdditionalImages(prev => [...prev, result.assets[0].uri]);
        } else {
          setFormData(prev => ({ ...prev, image_url: result.assets[0].uri }));
        }
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async (isAdditional = false) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (isAdditional) {
          if (additionalImages.length >= 8) {
            Alert.alert('Límite alcanzado', 'Solo puedes agregar hasta 8 imágenes adicionales');
            return;
          }
          setAdditionalImages(prev => [...prev, result.assets[0].uri]);
        } else {
          setFormData(prev => ({ ...prev, image_url: result.assets[0].uri }));
        }
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeMainImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
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
    submitData.append('name', formData.name.trim());
    submitData.append('description', formData.description.trim());
    submitData.append('latitude', formData.latitude);
    submitData.append('longitude', formData.longitude);
    submitData.append('route_id', formData.route_id);
    submitData.append('website', formData.website || '');
    submitData.append('phoneNumber', formData.countryCode + (formData.phoneNumber || ''));

    // Horarios
    const schedulesData = schedule
      .filter(daySchedule => daySchedule.isOpen)
      .map(daySchedule => ({
        dayOfWeek: daySchedule.dayOfWeek,
        openTime: daySchedule.openTime + ':00',
        closeTime: daySchedule.closeTime + ':00'
      }));
    submitData.append('schedules', JSON.stringify(schedulesData));

    // 🔴 CORRECCIÓN: Imagen principal - solo enviar si hay imagen seleccionada
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

    // Imágenes adicionales (hasta 8)
    additionalImages.forEach((imageUri, index) => {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      submitData.append('additional_images', {
        uri: imageUri,
        name: `additional_${index}.${match ? match[1] : 'jpg'}`,
        type,
      } as any);
    });

    console.log('📤 Enviando datos al servidor...');
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        // 🔴 IMPORTANTE: No incluir Content-Type cuando se usa FormData
        // El navegador lo establecerá automáticamente con el boundary correcto
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
            // 🔴 CORRECCIÓN: Forzar refresh de la lista
            if (numericRouteId) {
              router.replace({ 
                pathname: '/Place', 
                params: { 
                  routeId: String(numericRouteId),
                  refresh: Date.now() // Agregar timestamp para forzar refresh
                } 
              });
            } else {
              router.replace({ 
                pathname: '/Place',
                params: { refresh: Date.now() }
              });
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
            .custom-icon { background: #ea580c; border: 3px solid #fff; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
            .current-location-icon { background: #2563eb; border: 3px solid #fff; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${initialLat}, ${initialLng}], 13);
            L.tileLayer('${tileLayers[mapType]}', { attribution: '© OpenStreetMap contributors' }).addTo(map);
            const customIcon = L.divIcon({ className: 'custom-icon', iconSize: [20, 20], iconAnchor: [10, 10] });
            let marker = null;
            ${selectedLocation ? `
              marker = L.marker([${selectedLocation.latitude}, ${selectedLocation.longitude}], { icon: customIcon })
                .addTo(map)
                .bindPopup('Ubicación seleccionada')
                .openPopup();
            ` : ''}
            map.on('click', function(e) {
              if (marker) { map.removeLayer(marker); }
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

  // Resumen del horario
  const getScheduleSummary = () => {
    const openDays = schedule.filter(day => day.isOpen);
    if (openDays.length === 0) return 'Cerrado todos los días';
    const firstOpenDay = openDays[0];
    const allSameSchedule = openDays.every(day => 
      day.openTime === firstOpenDay.openTime && day.closeTime === firstOpenDay.closeTime
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
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: themed.accent,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }
      }}>
        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
          Crear Nuevo Lugar
        </Text>
        {numericRouteId && (
          <Text style={{ color: '#FFFFFF', opacity: 0.9, textAlign: 'center', marginTop: 4 }}>
            En {lockedRouteName}
          </Text>
        )}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, marginTop: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: themed.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: themed.border, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          {/* Campos */}
          {[
            { key: 'name', label: 'Nombre del Lugar', placeholder: 'Ej: Café Central', required: true, multiline: false },
            { key: 'description', label: 'Descripción', placeholder: 'Descripción del lugar...', required: true, multiline: true },
          ].map((field) => (
            <View key={field.key} style={{ marginBottom: 12 }}>
              <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
                {field.label} {field.required ? '*' : ''}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: themed.border,
                  borderRadius: 12,
                  padding: 12,
                  color: themed.text,
                  backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
                  minHeight: field.multiline ? 100 : undefined,
                  textAlignVertical: field.multiline ? 'top' : 'center',
                }}
                placeholder={field.placeholder}
                placeholderTextColor={themed.muted as string}
                value={(formData as any)[field.key]}
                onChangeText={(text) => handleInputChange(field.key, text)}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 4 : 1}
              />
            </View>
          ))}

          {/* Ubicación */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Ubicación *</Text>
            <TouchableOpacity
              onPress={() => setMapModalVisible(true)}
              style={{
                borderWidth: 1.5,
                borderColor: themed.border,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
              }}
            >
              <Text style={{ color: themed.text }} numberOfLines={1}>
                {formData.latitude && formData.longitude
                  ? `Lat: ${formData.latitude}, Lng: ${formData.longitude}`
                  : 'Seleccionar ubicación en el mapa'}
              </Text>
              <Ionicons name="map-outline" size={20} color={themed.accent as string} />
            </TouchableOpacity>
          </View>

          {/* Horario */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Horario de Atención</Text>
            <TouchableOpacity
              onPress={() => setScheduleModalVisible(true)}
              style={{
                borderWidth: 1.5,
                borderColor: themed.border,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
              }}
            >
              <Text style={{ color: themed.text }} numberOfLines={1}>
                {getScheduleSummary()}
              </Text>
              <Ionicons name="time-outline" size={20} color={themed.accent as string} />
            </TouchableOpacity>
            <Text style={{ color: themed.muted as string, fontSize: 12, marginTop: 4 }}>
              Toque para configurar el horario de atención
            </Text>
          </View>

          {/* Ruta */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Ruta *</Text>
            {numericRouteId ? (
              <View style={{ borderWidth: 1.5, borderColor: themed.successBorder, backgroundColor: themed.successBg, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: themed.successText, fontWeight: '700' }}>{lockedRouteName}</Text>
                <Text style={{ color: themed.successTextMuted as string, fontSize: 12, marginTop: 4 }}>
                  Ruta fija desde la pantalla anterior
                </Text>
              </View>
            ) : (
              <View style={{ borderWidth: 1.5, borderColor: themed.border, borderRadius: 12, maxHeight: 160, overflow: 'hidden' }}>
                <ScrollView>
                  {routes.map((route) => (
                    <TouchableOpacity
                      key={route.id}
                      onPress={() => handleInputChange('route_id', route.id.toString())}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: themed.border,
                        backgroundColor: formData.route_id === route.id.toString()
                          ? (themed.isDark ? '#0b1220' : '#fff7ed')
                          : themed.card,
                      }}
                    >
                      <Text style={{ color: themed.text, fontWeight: '600' }}>{route.name}</Text>
                      <Text style={{ color: themed.successTextMuted as string, fontSize: 12 }}>✓ Aprobada</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {formData.route_id && !numericRouteId && (
              <Text style={{ color: themed.muted as string, marginTop: 4 }}>
                Ruta seleccionada: {routes.find(r => r.id.toString() === formData.route_id)?.name}
              </Text>
            )}
          </View>

          {/* Web */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Sitio Web</Text>
            <TextInput
              style={{
                borderWidth: 1.5, borderColor: themed.border, borderRadius: 12, padding: 12,
                color: themed.text, backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF'
              }}
              placeholder="https://ejemplo.com"
              placeholderTextColor={themed.muted as string}
              value={formData.website}
              onChangeText={(text) => handleInputChange('website', text)}
              keyboardType="url"
            />
          </View>

          {/* Teléfono */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>Teléfono</Text>
            <TouchableOpacity
              onPress={() => setShowCountryModal(true)}
              style={{
                borderWidth: 1.5, borderColor: themed.border, borderRadius: 12, padding: 12,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF'
              }}
            >
              <Text style={{ color: themed.text }} numberOfLines={1}>
                {formData.phoneNumber ? `${formData.countryCode} ${formData.phoneNumber}` : 'Seleccionar teléfono'}
              </Text>
              <Ionicons name="call-outline" size={20} color={themed.accent as string} />
            </TouchableOpacity>
            <Text style={{ color: themed.muted as string, fontSize: 12, marginTop: 4 }}>
              Toque el campo para seleccionar país y número
            </Text>
          </View>

          {/* Imagen Principal */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
              Imagen Principal del Lugar
            </Text>
            <Text style={{ color: themed.muted as string, fontSize: 12, marginBottom: 8 }}>
              Esta será la imagen destacada del lugar
            </Text>
            
           {formData.image_url ? (
            <View style={{ marginBottom: 8 }}>
              <Image 
                source={{ uri: formData.image_url.startsWith('/uploads/') 
                  ? `${process.env.EXPO_PUBLIC_API_URL}${formData.image_url}`
                  : formData.image_url 
                }} 
                style={{ 
                  width: '100%', 
                  height: 200, 
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: themed.accent as string
                }} 
                resizeMode="cover"
              />
                <TouchableOpacity
                  onPress={removeMainImage}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: 20,
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => pickImage(false)}
                style={{
                  flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.border,
                  paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                }}
              >
                <Ionicons name="image-outline" size={20} color={themed.accent as string} />
                <Text style={{ color: themed.text, marginLeft: 8, fontWeight: '600' }}>Galería</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => takePhoto(false)}
                style={{
                  flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.border,
                  paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                }}
              >
                <Ionicons name="camera-outline" size={20} color={themed.accent as string} />
                <Text style={{ color: themed.text, marginLeft: 8, fontWeight: '600' }}>Cámara</Text>
              </TouchableOpacity>
            </View>
            
            {formData.image_url ? (
              <Text style={{ color: themed.successTextMuted as string, fontSize: 12, marginTop: 8 }}>
                ✓ Imagen principal seleccionada
              </Text>
            ) : (
              <Text style={{ color: themed.muted as string, fontSize: 12, marginTop: 8 }}>
                Opcional - Recomendado para mejor presentación
              </Text>
            )}
          </View>

          {/* Imágenes Adicionales */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 8 }}>
              Imágenes Adicionales ({additionalImages.length}/8)
            </Text>
            <Text style={{ color: themed.muted as string, fontSize: 12, marginBottom: 8 }}>
              Puedes agregar hasta 8 imágenes adicionales del lugar
            </Text>

                      {/* Grid de imágenes adicionales */}
                      {additionalImages.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                gap: 8,
              }}>
                {additionalImages.map((imageUri, index) => (
                  <View key={index} style={{ position: 'relative', width: '31%' }}>
                    <Image 
                      source={{ uri: imageUri.startsWith('/uploads/') 
                        ? `${process.env.EXPO_PUBLIC_API_URL}${imageUri}`
                        : imageUri 
                      }} 
                      style={{ 
                        width: '100%', 
                        height: 80, 
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: themed.border
                      }} 
                      resizeMode="cover"
                    />
                      <TouchableOpacity
                        onPress={() => removeAdditionalImage(index)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: 12,
                          width: 24,
                          height: 24,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={{ 
                        position: 'absolute', 
                        bottom: 4, 
                        left: 4, 
                        backgroundColor: 'rgba(0,0,0,0.7)', 
                        color: '#FFFFFF', 
                        fontSize: 10, 
                        paddingHorizontal: 4,
                        borderRadius: 4
                      }}>
                        {index + 1}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {additionalImages.length < 8 && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => pickImage(true)}
                  style={{
                    flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.border,
                    paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                  }}
                >
                  <Ionicons name="image-outline" size={20} color={themed.accent as string} />
                  <Text style={{ color: themed.text, marginLeft: 8, fontWeight: '600' }}>Galería</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => takePhoto(true)}
                  style={{
                    flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.border,
                    paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                  }}
                >
                  <Ionicons name="camera-outline" size={20} color={themed.accent as string} />
                  <Text style={{ color: themed.text, marginLeft: 8, fontWeight: '600' }}>Cámara</Text>
                </TouchableOpacity>
              </View>
            )}

            {additionalImages.length > 0 && (
              <Text style={{ color: themed.successTextMuted as string, fontSize: 12, marginTop: 8 }}>
                ✓ {additionalImages.length} imagen(es) adicional(es) seleccionada(s)
              </Text>
            )}
          </View>

          {/* Acciones */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.accent,
                paddingVertical: 14, borderRadius: 12, alignItems: 'center'
              }}
            >
              <Text style={{ color: themed.accent as string, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{
                flex: 1, backgroundColor: themed.accent, paddingVertical: 14, borderRadius: 12,
                alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Crear Lugar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Horario */}
      <Modal visible={scheduleModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: themed.background }}>
          <View style={{ backgroundColor: themed.accent, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>Horario de Atención</Text>
            <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={{ color: themed.muted as string, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
              Configura los horarios de atención para cada día de la semana
            </Text>

            {schedule.map((daySchedule, index) => (
              <View key={daySchedule.dayOfWeek} style={{ backgroundColor: themed.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: themed.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <TouchableOpacity
                      onPress={() => toggleDayOpen(index)}
                      style={{
                        width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                        borderColor: themed.accent as string,
                        backgroundColor: daySchedule.isOpen ? (themed.accent as string) : 'transparent',
                        alignItems: 'center', justifyContent: 'center', marginRight: 12
                      }}
                    >
                      {daySchedule.isOpen && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </TouchableOpacity>
                    <Text style={{ color: themed.text, fontWeight: '700', fontSize: 16 }}>
                      {DAYS_OF_WEEK.find(day => day.key === daySchedule.dayOfWeek)?.label}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => applySameSchedule(index)} style={{ backgroundColor: themed.info as string, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Aplicar a todos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openScheduleEditor(index)} style={{ backgroundColor: themed.accent as string, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Editar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {daySchedule.isOpen ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={16} color={themed.accent as string} />
                      <Text style={{ color: themed.text, marginLeft: 8 }}>
                        {daySchedule.openTime} - {daySchedule.closeTime}
                      </Text>
                    </View>
                    <Text style={{ color: themed.successTextMuted as string, fontSize: 12, fontWeight: '700' }}>● Abierto</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: themed.muted as string }}>Cerrado</Text>
                    <Text style={{ color: themed.danger as string, fontSize: 12, fontWeight: '700' }}>● Cerrado</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: themed.border }}>
            <TouchableOpacity onPress={() => setScheduleModalVisible(false)} style={{ backgroundColor: themed.accent as string, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', textAlign: 'center' }}>Guardar Horario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Editor horario puntual */}
      <Modal visible={editingDay !== null} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: themed.card, borderRadius: 16, padding: 16, width: '92%', maxWidth: 480, borderWidth: 1, borderColor: themed.border }}>
            <Text style={{ color: themed.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
              Editar Horario - {editingDay !== null ? DAYS_OF_WEEK[editingDay]?.label : ''}
            </Text>

            {editingDay !== null && (
              <>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 6 }}>Hora de Apertura:</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: themed.border, borderRadius: 12, padding: 12, color: themed.text, backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF' }}
                    value={schedule[editingDay].openTime}
                    onChangeText={(text) => updateScheduleTime(editingDay, 'openTime', text)}
                    placeholder="HH:MM"
                    placeholderTextColor={themed.muted as string}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 6 }}>Hora de Cierre:</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: themed.border, borderRadius: 12, padding: 12, color: themed.text, backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF' }}
                    value={schedule[editingDay].closeTime}
                    onChangeText={(text) => updateScheduleTime(editingDay, 'closeTime', text)}
                    placeholder="HH:MM"
                    placeholderTextColor={themed.muted as string}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <Text style={{ color: themed.muted as string, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
                  Formato: HH:MM (24 horas). Ej: 09:00, 14:30, 18:00
                </Text>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditingDay(null)} style={{ flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: themed.accent as string, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingDay(null)} style={{ flex: 1, backgroundColor: themed.accent as string, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal del Mapa */}
      <Modal visible={mapModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: themed.background }}>
          <View style={{ backgroundColor: themed.accent, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>Seleccionar Ubicación</Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: themed.border }}>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1.5, borderColor: themed.border, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, padding: 12, color: themed.text, backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF' }}
                placeholder="Buscar dirección o lugar..."
                placeholderTextColor={themed.muted as string}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchLocation}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={searchLocation}
                disabled={searchingLocation}
                style={{ backgroundColor: themed.accent as string, paddingHorizontal: 16, borderTopRightRadius: 12, borderBottomRightRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                {searchingLocation ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="search" size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={getCurrentLocation}
              disabled={searchingLocation}
              style={{ backgroundColor: themed.info as string, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 8 }}
            >
              {searchingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="locate" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 8 }}>Mi Ubicación Actual</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={{ color: themed.muted as string, fontSize: 12, textAlign: 'center' }}>
              💡 Busca una ubicación o toca el mapa directamente para colocar el pin
            </Text>

            {showResults && (
              <View style={{ position: 'absolute', top: 140, left: 16, right: 16, backgroundColor: themed.card, borderWidth: 1, borderColor: themed.border, borderRadius: 12, zIndex: 10, maxHeight: 200, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
                <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: themed.border }}>
                  <Text style={{ color: themed.text, fontWeight: '700' }}>Resultados de búsqueda:</Text>
                </View>
                <ScrollView>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity key={index} onPress={() => selectSearchResult(result)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: themed.border }}>
                      <Text style={{ color: themed.text, fontSize: 13 }} numberOfLines={2}>
                        {result.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 8, backgroundColor: themed.softBg }}>
            {[
              { k: 'standard', label: 'Estándar', icon: 'map-outline' as const },
              { k: 'satellite', label: 'Satélite', icon: 'earth-outline' as const },
              { k: 'light', label: 'Light', icon: 'sunny-outline' as const },
            ].map(opt => (
              <TouchableOpacity
                key={opt.k}
                onPress={() => setMapType(opt.k as any)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center',
                  backgroundColor: mapType === opt.k ? (themed.accent as string) : themed.softBg, borderWidth: mapType === opt.k ? 0 : 1, borderColor: themed.border
                }}
              >
                <Ionicons name={opt.icon} size={16} color={mapType === opt.k ? '#FFFFFF' : (themed.accent as string)} />
                <Text style={{ marginLeft: 8, fontWeight: '700', color: mapType === opt.k ? '#FFFFFF' : themed.text }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flex: 1 }}>
            <WebView ref={webViewRef} source={{ html: getLeafletMapHTML() }} style={{ flex: 1 }} onMessage={handleMapClick} />
          </View>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: themed.border }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: themed.accent as string, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (selectedLocation) {
                    setMapModalVisible(false);
                    Alert.alert('Ubicación confirmada', `Ubicación guardada:\n\nLatitud: ${formData.latitude}\nLongitud: ${formData.longitude}`);
                  } else {
                    Alert.alert('Ubicación requerida', 'Por favor selecciona una ubicación en el mapa');
                  }
                }}
                style={{ flex: 1, backgroundColor: themed.accent as string, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Confirmar Ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Teléfono */}
      <Modal visible={showCountryModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: themed.card, borderRadius: 16, padding: 16, width: '92%', maxWidth: 480, borderWidth: 1, borderColor: themed.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: themed.text, fontSize: 18, fontWeight: '800' }}>Seleccionar Teléfono</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}><Ionicons name="close" size={24} color={themed.accent as string} /></TouchableOpacity>
            </View>

            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 6 }}>País:</Text>
            <ScrollView style={{ maxHeight: 140, marginBottom: 12 }}>
              {COUNTRY_CODES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  onPress={() => handleCountryChange(country.code)}
                  style={{
                    padding: 12, borderBottomWidth: 1, borderBottomColor: themed.border, borderRadius: 8, marginBottom: 6,
                    backgroundColor: formData.countryCode === country.code ? (themed.isDark ? '#0b1220' : '#fff7ed') : themed.card
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: themed.text, fontWeight: '600' }}>{country.name}</Text>
                      <Text style={{ color: themed.muted as string, fontSize: 12 }}>{country.code}</Text>
                    </View>
                    <Text style={{ color: themed.muted as string, fontSize: 12 }}>Máx. {country.maxLength} dígitos</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ color: themed.text, fontWeight: '700', marginBottom: 6 }}>
              Número de teléfono para {COUNTRY_CODES.find(c => c.code === formData.countryCode)?.name}:
            </Text>
            <TextInput
              style={{ borderWidth: 1.5, borderColor: themed.border, borderRadius: 12, padding: 12, color: themed.text, backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF', marginBottom: 12 }}
              placeholder={`Ingresa número (máx. ${COUNTRY_CODES.find(c => c.code === formData.countryCode)?.maxLength} dígitos)`}
              placeholderTextColor={themed.muted as string}
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
              maxLength={COUNTRY_CODES.find(c => c.code === formData.countryCode)?.maxLength || 10}
            />

            <View style={{ backgroundColor: themed.softBg, padding: 12, borderRadius: 12, marginBottom: 12 }}>
              <Text style={{ color: themed.muted as string, fontSize: 12 }}>Vista previa:</Text>
              <Text style={{ color: themed.text, fontWeight: '800', fontSize: 16 }}>
                {formData.countryCode} {formData.phoneNumber || 'XXX-XXX-XXX'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setFormData(prev => ({ ...prev, phoneNumber: '' }));
                  setShowCountryModal(false);
                }}
                style={{ flex: 1, backgroundColor: themed.softBg, borderWidth: 1, borderColor: themed.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: themed.accent as string, fontWeight: '700' }}>Limpiar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleAcceptPhoneNumber} style={{ flex: 1, backgroundColor: themed.accent as string, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}