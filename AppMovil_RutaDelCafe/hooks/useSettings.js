// hooks/useSettings.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n } from '../i18n.js';

export const useSettings = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    loading: false,
    refreshing: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setSettings(prev => ({ ...prev, refreshing: true }));
      
      const [savedNotifications, savedDarkMode] = await Promise.all([
        AsyncStorage.getItem('app_notifications'),
        AsyncStorage.getItem('app_dark_mode'),
      ]);

      setSettings(prev => ({
        ...prev,
        notifications: savedNotifications !== null ? JSON.parse(savedNotifications) : true,
        darkMode: savedDarkMode !== null ? JSON.parse(savedDarkMode) : false,
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setSettings(prev => ({ ...prev, refreshing: false }));
    }
  };

  const toggleNotifications = async (value) => {
    setSettings(prev => ({ ...prev, notifications: value }));
    await AsyncStorage.setItem('app_notifications', JSON.stringify(value));
  };

  const toggleDarkMode = async (value) => {
    setSettings(prev => ({ ...prev, darkMode: value }));
    await AsyncStorage.setItem('app_dark_mode', JSON.stringify(value));
  };

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('cache_') || 
        key.startsWith('temp_') ||
        key.startsWith('image_cache_')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  };

  return {
    ...settings,
    toggleNotifications,
    toggleDarkMode,
    clearCache,
    loadSettings,
  };
};