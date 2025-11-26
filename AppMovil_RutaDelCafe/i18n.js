// lib/i18n.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sistema de traducciones
const TRANSLATIONS = {
  es: {
    common: {
      ok: 'Aceptar',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      back: 'Volver',
      save: 'Guardar',
      error: 'Error',
      success: 'Éxito',
      loading: 'Cargando...',
    },
    settings: {
      title: 'Ajustes',
      language: 'Idioma',
      selectLanguage: 'Selecciona tu idioma preferido',
      languageChanged: 'Idioma Cambiado',
      languageChangeMessage: 'El idioma de la aplicación ha sido actualizado correctamente.',
      languageChangeError: 'Error al cambiar el idioma',
      preferences: 'Preferencias',
      notifications: 'Notificaciones',
      notificationsDescription: 'Recibir notificaciones push y alertas',
      darkMode: 'Modo Oscuro',
      darkModeDescription: 'Cambiar al tema oscuro',
      themeChanged: 'Tema Cambiado',
      themeChangeMessage: 'La configuración del tema se aplicará en toda la aplicación.',
      privacySecurity: 'Privacidad y Seguridad',
      clearCache: 'Limpiar Caché',
      clearCacheMessage: 'Esto borrará los datos temporales. ¿Quieres continuar?',
      cacheCleared: 'Caché limpiado correctamente',
      cacheError: 'Error al limpiar el caché',
      privacyPolicy: 'Política de Privacidad',
      termsOfService: 'Términos de Servicio',
      about: 'Acerca de',
      version: 'Versión',
      build: 'Compilación',
      appDescription: 'RutaCafe - Descubre los mejores lugares de café en tu ciudad',
      comingSoon: 'Próximamente...',
    },
    navigation: {
      home: 'Inicio',
      map: 'Mapa',
      favorites: 'Favoritos',
      profile: 'Perfil',
      settings: 'Ajustes',
    },
  },
  en: {
    common: {
      ok: 'OK',
      cancel: 'Cancel',
      confirm: 'Confirm',
      back: 'Back',
      save: 'Save',
      error: 'Error',
      success: 'Success',
      loading: 'Loading...',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      selectLanguage: 'Select your preferred language',
      languageChanged: 'Language Changed',
      languageChangeMessage: 'The application language has been updated successfully.',
      languageChangeError: 'Error changing language',
      preferences: 'Preferences',
      notifications: 'Notifications',
      notificationsDescription: 'Receive push notifications and alerts',
      darkMode: 'Dark Mode',
      darkModeDescription: 'Switch to dark theme',
      themeChanged: 'Theme Changed',
      themeChangeMessage: 'Theme settings will be applied throughout the app.',
      privacySecurity: 'Privacy & Security',
      clearCache: 'Clear Cache',
      clearCacheMessage: 'This will clear temporary data. Do you want to continue?',
      cacheCleared: 'Cache cleared successfully',
      cacheError: 'Error clearing cache',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      about: 'About',
      version: 'Version',
      build: 'Build',
      appDescription: 'RutaCafe - Discover the best coffee places in your city',
      comingSoon: 'Coming soon...',
    },
    navigation: {
      home: 'Home',
      map: 'Map',
      favorites: 'Favorites',
      profile: 'Profile',
      settings: 'Settings',
    },
  },
  pt: {
    common: {
      ok: 'OK',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      back: 'Voltar',
      save: 'Salvar',
      error: 'Erro',
      success: 'Sucesso',
      loading: 'Carregando...',
    },
    settings: {
      title: 'Configurações',
      language: 'Idioma',
      selectLanguage: 'Selecione seu idioma preferido',
      languageChanged: 'Idioma Alterado',
      languageChangeMessage: 'O idioma do aplicativo foi atualizado com sucesso.',
      languageChangeError: 'Erro ao alterar o idioma',
      preferences: 'Preferências',
      notifications: 'Notificações',
      notificationsDescription: 'Receber notificações push e alertas',
      darkMode: 'Modo Escuro',
      darkModeDescription: 'Mudar para o tema escuro',
      themeChanged: 'Tema Alterado',
      themeChangeMessage: 'As configurações do tema serão aplicadas em todo o aplicativo.',
      privacySecurity: 'Privacidade e Segurança',
      clearCache: 'Limpar Cache',
      clearCacheMessage: 'Isso limpará os dados temporários. Deseja continuar?',
      cacheCleared: 'Cache limpo com sucesso',
      cacheError: 'Erro ao limpar o cache',
      privacyPolicy: 'Política de Privacidade',
      termsOfService: 'Termos de Serviço',
      about: 'Sobre',
      version: 'Versão',
      build: 'Compilação',
      appDescription: 'RutaCafe - Descubra os melhores lugares de café na sua cidade',
      comingSoon: 'Em breve...',
    },
  },
  fr: {
    common: {
      ok: 'OK',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      back: 'Retour',
      save: 'Sauvegarder',
      error: 'Erreur',
      success: 'Succès',
      loading: 'Chargement...',
    },
    settings: {
      title: 'Paramètres',
      language: 'Langue',
      selectLanguage: 'Sélectionnez votre langue préférée',
      languageChanged: 'Langue Modifiée',
      languageChangeMessage: 'La langue de l\'application a été mise à jour avec succès.',
      languageChangeError: 'Erreur lors du changement de langue',
      preferences: 'Préférences',
      notifications: 'Notifications',
      notificationsDescription: 'Recevoir des notifications push et alertes',
      darkMode: 'Mode Sombre',
      darkModeDescription: 'Passer au thème sombre',
      themeChanged: 'Thème Modifié',
      themeChangeMessage: 'Les paramètres du thème seront appliqués dans toute l\'application.',
      privacySecurity: 'Confidentialité et Sécurité',
      clearCache: 'Effacer le Cache',
      clearCacheMessage: 'Cela effacera les données temporaires. Voulez-vous continuer?',
      cacheCleared: 'Cache effacé avec succès',
      cacheError: 'Erreur lors de l\'effacement du cache',
      privacyPolicy: 'Politique de Confidentialité',
      termsOfService: 'Conditions d\'Utilisation',
      about: 'À Propos',
      version: 'Version',
      build: 'Build',
      appDescription: 'RutaCafe - Découvrez les meilleurs cafés de votre ville',
      comingSoon: 'Bientôt disponible...',
    },
  },
};

class I18n {
  constructor() {
    this.locale = 'es';
    this.translations = TRANSLATIONS;
    this.listeners = new Set();
  }

  // Inicializar con el idioma guardado
  async init() {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && this.translations[savedLanguage]) {
        this.locale = savedLanguage;
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing i18n:', error);
    }
  }

  // Traducir una clave
  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.locale];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key} for locale ${this.locale}`);
        return key;
      }
    }
    
    return value;
  }

  // Cambiar idioma
  async changeLanguage(locale) {
    if (!this.translations[locale]) {
      console.error(`Locale not supported: ${locale}`);
      return false;
    }

    try {
      this.locale = locale;
      await AsyncStorage.setItem('app_language', locale);
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error changing language:', error);
      return false;
    }
  }

  // Obtener idioma actual
  getCurrentLanguage() {
    return this.locale;
  }

  // Suscribirse a cambios
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notificar a los listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.locale));
  }

  // Obtener lista de idiomas disponibles
  getAvailableLanguages() {
    return [
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
    ];
  }

  // Obtener bandera del idioma
  getLanguageFlag(code) {
    switch (code) {
      case 'es': return '🇪🇸';
      case 'en': return '🇺🇸';
      case 'pt': return '🇧🇷';
      case 'fr': return '🇫🇷';
      default: return '🌐';
    }
  }
}

// Instancia singleton
export const i18n = new I18n();

// Inicializar inmediatamente
i18n.init();

// Hook para React (opcional, para componentes funcionales)
export const useTranslation = () => {
  const [locale, setLocale] = useState(i18n.getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = i18n.subscribe(setLocale);
    return unsubscribe;
  }, []);

  return {
    t: i18n.t.bind(i18n),
    locale,
    changeLanguage: i18n.changeLanguage.bind(i18n),
    getAvailableLanguages: i18n.getAvailableLanguages.bind(i18n),
    getLanguageFlag: i18n.getLanguageFlag.bind(i18n),
  };
};

export default i18n;