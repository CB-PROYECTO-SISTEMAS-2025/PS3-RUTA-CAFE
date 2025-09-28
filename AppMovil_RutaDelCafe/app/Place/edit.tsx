import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
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

const COUNTRY_CODES = [
  { code: '+591', name: 'Bolivia', maxLength: 8 },
  { code: '+54', name: 'Argentina', maxLength: 10 },
  { code: '+57', name: 'Colombia', maxLength: 10 },
  { code: '+51', name: 'Perú', maxLength: 9 },
  { code: '+52', name: 'México', maxLength: 10 },
  { code: '+34', name: 'España', maxLength: 9 },
];

export default function EditPlaceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'transport' | 'light'>('standard');
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

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

  useEffect(() => {
    if (id) {
      fetchPlace();
      loadApprovedRoutes();
      requestPermissions();
    }
  }, [id]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a las imágenes.');
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
    setShowCountryDropdown(false);
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

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        Alert.alert('Error', 'No se pudo obtener resultados de búsqueda');
        setShowResults(false);
        return;
      }
      if (data && data.length > 0) {
        setSearchResults(data);
        setShowResults(true);
      } else {
        Alert.alert('Error', 'No se encontraron ubicaciones');
        setShowResults(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al buscar la ubicación');
      setShowResults(false);
    }
  };

  const selectSearchResult = (result: LocationResult) => {
    const latitude = Number(parseFloat(result.lat as any).toFixed(6));
    const longitude = Number(parseFloat(result.lon as any).toFixed(6));
    setSelectedLocation({ latitude, longitude });
    setFormData(prev => ({
      ...prev,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    }));
    setSearchQuery(result.display_name);
    setShowResults(false);
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
        `${formData.countryCode} ${formData.phoneNumber}` : '';
        submitData.append('phoneNumber', fullPhoneNumber);
        
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
            onPress: () => router.push({
                pathname: '/Place',
                params: { id: id }
            })
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

    const tileLayers = {
      standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      transport: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png',
      light: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
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
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${initialLat}, ${initialLng}], 13);

            L.tileLayer('${tileLayers[mapType]}', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            let marker = null;

            ${selectedLocation ? `
              marker = L.marker([${selectedLocation.latitude}, ${selectedLocation.longitude}]).addTo(map)
                .bindPopup('Ubicación seleccionada');
            ` : ''}

            map.on('click', function(e) {
              if (marker) {
                map.removeLayer(marker);
              }
              marker = L.marker(e.latlng).addTo(map)
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
      </View>

      <ScrollView className="flex-1 px-6 mt-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl p-6 shadow-md border border-orange-200 mb-6">
          <Text className="text-orange-900 font-bold text-lg mb-4">Editando: {place.name}</Text>

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

          {/* Selector de Ruta */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Ruta *</Text>
            <View className="border-2 border-orange-200 rounded-xl max-h-40">
              <ScrollView>
                {routes.filter(route => route.status === 'aprobada').map((route) => (
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
            {formData.route_id && (
              <Text className="text-orange-600 text-sm mt-1">
                Ruta seleccionada: {routes.find(r => r.id.toString() === formData.route_id)?.name}
              </Text>
            )}
          </View>

          {/* Campos opcionales */}
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

          {/* Selector de código de país mejorado */}
          <View className="mb-4">
            <Text className="text-orange-800 font-semibold mb-2">Teléfono</Text>
            <View className="flex-row gap-2">
              {/* Selector de código de país */}
              <View className="flex-1">
                <TouchableOpacity
                  onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="border-2 border-orange-200 rounded-xl p-3 flex-row items-center justify-between"
                >
                  <Text className="text-orange-900" numberOfLines={1}>
                    {getCurrentCountryName()}
                  </Text>
                  <Ionicons 
                    name={showCountryDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#ea580c" 
                  />
                </TouchableOpacity>

                {/* Dropdown de países */}
                {showCountryDropdown && (
                  <View className="absolute top-16 left-0 right-0 bg-white border-2 border-orange-200 rounded-xl z-10 max-h-48 shadow-lg">
                    <ScrollView>
                      {COUNTRY_CODES.map((country) => (
                        <TouchableOpacity
                          key={country.code}
                          onPress={() => handleCountryChange(country.code)}
                          className={`p-3 border-b border-orange-100 ${
                            formData.countryCode === country.code ? 'bg-orange-100' : ''
                          }`}
                        >
                          <Text className="text-orange-900 font-medium">
                            {country.name} ({country.code})
                          </Text>
                          <Text className="text-orange-600 text-xs">
                            Máx. {country.maxLength} dígitos
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Campo de número telefónico */}
              <View className="flex-2">
                <TextInput
                  className="border-2 border-orange-200 rounded-xl p-3 text-orange-900"
                  placeholder="Número de teléfono"
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleInputChange('phoneNumber', text)}
                  keyboardType="phone-pad"
                  maxLength={COUNTRY_CODES.find(c => c.code === formData.countryCode)?.maxLength || 10}
                />
              </View>
            </View>
            
            {/* Información del formato */}
            <Text className="text-orange-600 text-xs mt-1">
              Formato: {formData.countryCode} {formData.phoneNumber || 'XXX-XXX-XXX'}
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

      {/* Modal del Mapa */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          {/* Header del Modal */}
          <View className="bg-orange-500 px-6 py-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Seleccionar Ubicación</Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Barra de búsqueda */}
          <View className="p-4 border-b border-gray-200">
            <View className="flex-row">
              <TextInput
                className="flex-1 border-2 border-orange-200 rounded-l-xl p-3"
                placeholder="Buscar dirección o lugar..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchLocation}
              />
              <TouchableOpacity
                onPress={searchLocation}
                className="bg-orange-500 px-4 rounded-r-xl justify-center"
              >
                <Ionicons name="search" size={20} color="white" />
              </TouchableOpacity>
            </View>
            
            {/* Resultados de búsqueda */}
            {showResults && (
              <View className="absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-xl z-10 max-h-40">
                <ScrollView>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => selectSearchResult(result)}
                      className="p-3 border-b border-gray-100"
                    >
                      <Text className="text-orange-900" numberOfLines={2}>
                        {result.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Selector de tipo de mapa */}
          <View className="flex-row justify-around p-3 bg-orange-50">
            <TouchableOpacity onPress={() => setMapType('standard')}>
              <Text className={`font-medium ${mapType === 'standard' ? 'text-orange-600' : 'text-orange-400'}`}>
                Estándar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMapType('satellite')}>
              <Text className={`font-medium ${mapType === 'satellite' ? 'text-orange-600' : 'text-orange-400'}`}>
                Satélite
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMapType('transport')}>
              <Text className={`font-medium ${mapType === 'transport' ? 'text-orange-600' : 'text-orange-400'}`}>
                Transporte
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMapType('light')}>
              <Text className={`font-medium ${mapType === 'light' ? 'text-orange-600' : 'text-orange-400'}`}>
                Light
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mapa Leaflet */}
          <View className="flex-1">
            <WebView
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
                  } else {
                    Alert.alert('Error', 'Por favor selecciona una ubicación en el mapa');
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
    </View>
  );
}