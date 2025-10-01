// app/(tabs)/settings.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { i18n } from '../../i18n.js';
import { useSettings } from '../../hooks/useSettings.js';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const [currentLocale, setCurrentLocale] = useState(i18n.getCurrentLanguage());
  const [changingLanguage, setChangingLanguage] = useState(false);

  useEffect(() => {
    setCurrentLocale(i18n.locale);
  }, []);


  // Función de traducción
  const t = (key: string) => i18n.t(key);

  const changeLanguage = async (languageCode: string) => {
    if (currentLocale === languageCode) return;
    
    setChangingLanguage(true);
    try {
      const success = await i18n.changeLanguage(languageCode);
      
      if (success) {
        Alert.alert(
          t('settings.languageChanged'),
          t('settings.languageChangeMessage'),
          [{ text: t('common.ok') }]
        );
      } else {
        throw new Error('Failed to change language');
      }
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('common.error'), t('settings.languageChangeError'));
    } finally {
      setChangingLanguage(false);
    }
  };

  const handleToggleDarkMode = async (value: boolean) => {
    await settings.toggleDarkMode(value);
    Alert.alert(
      t('settings.themeChanged'),
      t('settings.themeChangeMessage'),
      [{ text: t('common.ok') }]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.clearCacheMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            const success = await settings.clearCache();
            if (success) {
              Alert.alert(t('common.success'), t('settings.cacheCleared'));
            } else {
              Alert.alert(t('common.error'), t('settings.cacheError'));
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(t('settings.privacyPolicy'), t('settings.comingSoon'));
  };

  const handleTermsOfService = () => {
    Alert.alert(t('settings.termsOfService'), t('settings.comingSoon'));
  };

  const handleAppInfo = () => {
    Alert.alert(
      t('settings.about'),
      `${t('settings.appDescription')}\n\n${t('settings.version')}: 1.0.0\n${t('settings.build')}: 2024.01.001`,
      [{ text: t('common.ok') }]
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/advertisement');
    }
  };

  if (settings.refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  const languages = i18n.getAvailableLanguages();

  return (
    <View className="flex-1 bg-orange-50">
      {/* Header con fondo naranja */}
      <View className="bg-orange-500 px-6 pt-12 pb-6 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center justify-center">
          <View className="items-center">
            <Ionicons name="settings-outline" size={32} color="white" />
            <Text className="text-white text-2xl font-bold text-center mt-2">
              {t('settings.title')}
            </Text>
          </View>
        </View>
      </View>

      {/* Contenido principal */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
      >
        {/* Botón de volver */}
        <View className="mb-4">
          <TouchableOpacity
            onPress={handleBack}
            className="bg-orange-100 border border-orange-400 py-4 rounded-xl shadow flex-row items-center justify-center"
          >
            <Ionicons name="arrow-back" size={22} color="#f97316" />
            <Text className="text-orange-700 font-semibold text-base ml-2">
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sección de Idioma */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-orange-200 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Ionicons name="language-outline" size={24} color="#ea580c" />
            <Text className="text-orange-900 text-xl font-bold ml-3">
              {t('settings.language')}
            </Text>
          </View>
          
          <Text className="text-orange-700 mb-4 text-sm">
            {t('settings.selectLanguage')}
          </Text>

          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              onPress={() => changeLanguage(language.code)}
              disabled={changingLanguage}
              className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border ${
                currentLocale === language.code 
                  ? 'bg-orange-100 border-orange-400 shadow' 
                  : 'bg-orange-50 border-orange-200'
              } ${changingLanguage ? 'opacity-50' : ''}`}
            >
              <View className="flex-row items-center flex-1">
                <Text className="text-2xl mr-4">{i18n.getLanguageFlag(language.code)}</Text>
                <View className="flex-1">
                  <Text className="text-orange-900 font-semibold text-base">
                    {language.nativeName}
                  </Text>
                  <Text className="text-orange-600 text-xs mt-1">
                    {language.name}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-center">
                {changingLanguage && currentLocale === language.code ? (
                  <ActivityIndicator size="small" color="#f97316" />
                ) : (
                  currentLocale === language.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                  )
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sección de Preferencias */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-orange-200 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Ionicons name="options-outline" size={24} color="#ea580c" />
            <Text className="text-orange-900 text-xl font-bold ml-3">
              {t('settings.preferences')}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-orange-100">
            <View className="flex-1 mr-4">
              <Text className="text-orange-900 font-semibold text-base">
                {t('settings.notifications')}
              </Text>
              <Text className="text-orange-600 text-xs mt-1">
                {t('settings.notificationsDescription')}
              </Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={settings.toggleNotifications}
              trackColor={{ false: '#d1d5db', true: '#fed7aa' }}
              thumbColor={settings.notifications ? '#f97316' : '#f3f4f6'}
            />
          </View>

          <View className="flex-row items-center justify-between py-4">
            <View className="flex-1 mr-4">
              <Text className="text-orange-900 font-semibold text-base">
                {t('settings.darkMode')}
              </Text>
              <Text className="text-orange-600 text-xs mt-1">
                {t('settings.darkModeDescription')}
              </Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: '#d1d5db', true: '#fed7aa' }}
              thumbColor={settings.darkMode ? '#f97316' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Sección de Privacidad y Seguridad */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-orange-200 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Ionicons name="shield-checkmark-outline" size={24} color="#ea580c" />
            <Text className="text-orange-900 text-xl font-bold ml-3">
              {t('settings.privacySecurity')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClearCache}
            className="flex-row items-center justify-between py-4 border-b border-orange-100"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text className="text-orange-900 font-semibold ml-3">
                {t('settings.clearCache')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePrivacyPolicy}
            className="flex-row items-center justify-between py-4 border-b border-orange-100"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
              <Text className="text-orange-900 font-semibold ml-3">
                {t('settings.privacyPolicy')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTermsOfService}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="business-outline" size={20} color="#8b5cf6" />
              <Text className="text-orange-900 font-semibold ml-3">
                {t('settings.termsOfService')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Información de la App */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-orange-200 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Ionicons name="information-circle-outline" size={24} color="#ea580c" />
            <Text className="text-orange-900 text-xl font-bold ml-3">
              {t('settings.about')}
            </Text>
          </View>

          <TouchableOpacity onPress={handleAppInfo}>
            <View className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-orange-700 font-medium">{t('settings.version')}</Text>
                <Text className="text-orange-900 font-semibold">1.0.0</Text>
              </View>

              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-orange-700 font-medium">{t('settings.build')}</Text>
                <Text className="text-orange-900 font-semibold">2024.01.001</Text>
              </View>

              <Text className="text-orange-800 text-sm text-center leading-5">
                {t('settings.appDescription')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}