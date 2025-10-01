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

interface Place {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  route_id: number;
  website?: string;
  phoneNumber?: string;
  image_url?: string;
  status: string;
  schedules?: Schedule[];
}

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

export default function EditPlaceScreen() {
  const router = useRouter();
  const { id, routeId, routeName } = useLocalSearchParams<{ 
    id: string; 
    routeId?: string; 
    routeName?: string 
  }>();
  const numericRouteId = useMemo(() => (routeId ? Number(routeId) : undefined), [routeId]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
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

  // Nombre de ruta para el header cuando viene por param
  const lockedRouteName =
    routeName ||
    (numericRouteId ? routes.find(r => r.id === numericRouteId)?.name : undefined) ||
    (numericRouteId ? `Ruta #${numericRouteId}` : undefined);

  useEffect(() => {
    if (id) {
      fetchPlace();
      loadApprovedRoutes();
      requestPermissions();
    }
  }, [id]);

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
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const routesData = await response.json();
        setRoutes(routesData);
      }
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const fetchPlace = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const placeData = await response.json();
        setPlace(placeData);
        
        // Extraer código de país del número de teléfono si existe
        let countryCode = COUNTRY_CODES[0].code;
        let phoneNumber = '';
        
        if (placeData.phoneNumber) {
          const foundCountry = COUNTRY_CODES.find(country => 
            placeData.phoneNumber.includes(country.code)
          );
          if (foundCountry) {
            countryCode = foundCountry.code;
            phoneNumber = placeData.phoneNumber.replace(foundCountry.code, '').trim();
          } else {
            phoneNumber = placeData.phoneNumber;
          }
        }

        setFormData({
          name: placeData.name || '',
          description: placeData.description || '',
          latitude: placeData.latitude?.toString() || '',
          longitude: placeData.longitude?.toString() || '',
          route_id: placeData.route_id?.toString() || '',
          website: placeData.website || '',
          phoneNumber: phoneNumber,
          image_url: placeData.image_url || '',
          countryCode: countryCode,
        });

        if (placeData.latitude && placeData.longitude) {
          setSelectedLocation({
            latitude: placeData.latitude,
            longitude: placeData.longitude
          });
        }

        // Cargar horarios si existen
        if (placeData.schedules && Array.isArray(placeData.schedules)) {
          const loadedSchedules = DAYS_OF_WEEK.map(day => {
            const existingSchedule = placeData.schedules.find((s: any) => s.dayOfWeek === day.key);
            if (existingSchedule) {
              return {
                dayOfWeek: day.key,
                openTime: existingSchedule.openTime.substring(0, 5), // Remover segundos
                closeTime: existingSchedule.closeTime.substring(0, 5),
                isOpen: true
              };
            }
            return {
              dayOfWeek: day.key,
              openTime: '09:00',
              closeTime: '18:00',
              isOpen: false
            };
          });
          setSchedule(loadedSchedules);
        }
      } else {
        throw new Error('Error al cargar el lugar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el lugar');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Si hay una ruta fija, no permitir cambiar la ruta
    if (numericRouteId && field === 'route_id') {
      return;
    }

    let filteredValue = value;

    switch (field) {
      case 'name':
        filteredValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        break;
      case 'phoneNumber': {
        const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.countryCode);
        filteredValue = value.replace(/[^0-9]/g, '');
        if (selectedCountry) {
          filteredValue = filteredValue.slice(0, selectedCountry.maxLength);
        }
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
    setFormData(prev => ({
      ...prev,
      countryCode: code,
    }));
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
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación seleccionada');
    }
  };

  // Función para colocar un pin en el mapa desde JavaScript
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
      console.log('Buscando ubicación:', searchQuery);
      
      // Agregar headers para evitar error 403
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
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acceso denegado al servicio de búsqueda. Intenta más tarde.');
        }
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Response text:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Error al procesar los resultados de búsqueda');
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Resultados encontrados:', data.length);
        setSearchResults(data);
        setShowResults(true);
        
        // Colocar automáticamente el pin en el primer resultado
        const firstResult = data[0];
        const latitude = Number(parseFloat(firstResult.lat as any).toFixed(6));
        const longitude = Number(parseFloat(firstResult.lon as any).toFixed(6));
        
        setSelectedLocation({ latitude, longitude });
        setFormData(prev => ({ ...prev, latitude: String(latitude), longitude: String(longitude) }));
        
        // Colocar el pin en el mapa
        placePinOnMap(latitude, longitude);
        
        Alert.alert('Ubicación encontrada', 
          `Se ha colocado un pin en: ${firstResult.display_name}\n\nPuedes ajustar la ubicación tocando el mapa directamente.`);
      } else {
        console.log('No se encontraron resultados');
        Alert.alert('No se encontraron resultados', 'Intenta con términos de búsqueda más específicos');
        setShowResults(false);
      }
    } catch (error) {
      console.error('Error completo en búsqueda:', error);
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
    setFormData(prev => ({
      ...prev,
      latitude: String(latitude),
      longitude: String(longitude),
    }));
    setSearchQuery(result.display_name);
    setShowResults(false);
    
    // Colocar el pin en el mapa
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

      console.log('Obteniendo ubicación actual...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('Ubicación obtenida:', latitude, longitude);
      
      setSelectedLocation({ latitude, longitude });
      setFormData(prev => ({ 
        ...prev, 
        latitude: String(Number(latitude.toFixed(6))), 
        longitude: String(Number(longitude.toFixed(6))) 
      }));

      // Colocar el pin en el mapa
      placePinOnMap(latitude, longitude);

      // Obtener la dirección para mostrar
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
          console.log('Dirección encontrada:', displayName);
        }
      } catch (geocodeError) {
        console.error('Error en geocoding inverso:', geocodeError);
        setSearchQuery(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }

      Alert.alert('Ubicación actual', 
        `Se ha colocado un pin en tu ubicación actual:\n\nLatitud: ${latitude.toFixed(6)}\nLongitud: ${longitude.toFixed(6)}\n\nPuedes ajustar la ubicación tocando el mapa directamente.`);

    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
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
    } catch (error) {
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
    } catch (error) {
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

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const submitData = new FormData();
      
      // Añade todos los campos necesarios
      submitData.append('name', formData.name.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('latitude', parseFloat(formData.latitude).toString());
      submitData.append('longitude', parseFloat(formData.longitude).toString());
      submitData.append('route_id', formData.route_id);
      submitData.append('website', formData.website || '');
      
      // Formatea el número de teléfono correctamente
      const fullPhoneNumber = formData.phoneNumber ? 
        `${formData.countryCode}${formData.phoneNumber}` : '';
      submitData.append('phoneNumber', fullPhoneNumber);
      
      // Preparar horarios - SOLO los días que están abiertos
      const schedulesData = schedule
        .filter(daySchedule => daySchedule.isOpen)
        .map(daySchedule => ({
          dayOfWeek: daySchedule.dayOfWeek,
          openTime: daySchedule.openTime + ':00', // Formato HH:MM:00
          closeTime: daySchedule.closeTime + ':00'
        }));

      // Agregar horarios como string JSON
      submitData.append('schedules', JSON.stringify(schedulesData));

      // Manejo de imagen
      if (formData.image_url) {
        if (formData.image_url.startsWith('file://')) {
          const filename = formData.image_url.split('/').pop();
          const match = /\.(\w+)$/.exec(filename || '');
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          
          submitData.append('image', {
            uri: formData.image_url,
            name: filename || `place_${id}_image.jpg`,
            type,
          } as any);
        } else {
          // Si es una URL, enviarla como image_url
          submitData.append('image_url', formData.image_url);
        }
      }

      console.log('Enviando datos para actualizar lugar ID:', id);
      console.log('Horarios enviados:', schedulesData);
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/places/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: submitData,
      });

      const responseText = await response.text();
      console.log('Respuesta del servidor:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        throw new Error('Respuesta inválida del servidor');
      }
      
      if (response.ok) {
        Alert.alert('Éxito', 'Lugar actualizado correctamente', [
          { 
            text: 'OK', 
            onPress: () => {
              if (numericRouteId) {
                router.push({
                  pathname: '/Place',
                  params: { routeId: String(numericRouteId) }
                });
              } else {
                router.push({
                  pathname: '/Place',
                  params: { id: id }
                });
              }
            }
          }
        ]);
      } else {
        throw new Error(responseData.message || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error completo en handleSubmit:', error);
      Alert.alert(
        "Error", 
        error instanceof Error ? error.message : "Error desconocido al actualizar el lugar"
      );
    } finally {
      setUpdating(false);
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

            // Icono personalizado para lugares
            const customIcon = L.divIcon({
              className: 'custom-icon',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            // Icono para ubicación actual
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">Cargando lugar...</Text>
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <Ionicons name="alert-circle" size={64} color="#f97316" />
        <Text className="text-orange-700 text-lg font-bold mt-4">Lugar no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-orange-500 px-6 py-3 rounded-xl mt-6">
          <Text className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">Editar Lugar</Text>
        <Text className="text-orange-100 text-center mt-1">
          Editando: {place.name}
        </Text>
        {numericRouteId && (
          <Text className="text-orange-100 text-center mt-1">
            En {lockedRouteName}
          </Text>
        )}
      </View>

      <ScrollView className="flex-1 px-6 mt-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl p-6 shadow-md border border-orange-200 mb-6">
          <Text className="text-orange-900 font-bold text-lg mb-4">Información del Lugar</Text>

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
                  field.required && !formData[field.key as keyof typeof formData] 
                    ? 'border-red-300' 
                    : 'border-orange-200'
                }`}
                placeholder={field.placeholder}
                value={formData[field.key as keyof typeof formData]}
                onChangeText={(text) => handleInputChange(field.key, text)}
                multiline={field.multiline}
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
              {/* Campo de número telefónico que abre el modal */}
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

          {/* Selector de imagen */}
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
            {formData.image_url && (
              <Text className="text-green-600 text-sm mt-2">✓ Imagen seleccionada</Text>
            )}
          </View>

          {/* Botones de acción */}
          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-1 bg-orange-100 border border-orange-400 py-4 rounded-xl"
            >
              <Text className="text-orange-700 font-semibold text-center">Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={updating}
              className="flex-1 bg-orange-500 py-4 rounded-xl shadow-lg"
            >
              {updating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-center">Actualizar Lugar</Text>
              )}
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
          {/* Header del Modal */}
          <View className="bg-orange-500 px-6 py-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Seleccionar Ubicación</Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Barra de búsqueda y controles */}
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

            {/* Botón de ubicación actual */}
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

            {/* Instrucciones */}
            <Text className="text-orange-600 text-xs text-center">
              💡 Busca una ubicación o toca el mapa directamente para colocar el pin
            </Text>

            {/* Resultados de búsqueda */}
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

          {/* Selector de tipo de mapa con iconos */}
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

          {/* Mapa Leaflet */}
          <View className="flex-1">
            <WebView 
              ref={webViewRef}
              source={{ html: getLeafletMapHTML() }}
              style={{ flex: 1 }}
              onMessage={handleMapClick}
            />
          </View>

          {/* Botones del mapa */}
          <View className="p-4 border-t border-gray-200">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setMapModalVisible(false)}
                className="flex-1 bg-orange-100 border border-orange-400 py-3 rounded-xl"
              >
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
            
            {/* Selector de país */}
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

            {/* Campo de número telefónico */}
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

            {/* Vista previa */}
            <View className="bg-orange-50 p-3 rounded-xl mb-4">
              <Text className="text-orange-700 text-sm">Vista previa:</Text>
              <Text className="text-orange-900 font-semibold text-lg">
                {formData.countryCode} {formData.phoneNumber || 'XXX-XXX-XXX'}
              </Text>
            </View>

            {/* Botones */}
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