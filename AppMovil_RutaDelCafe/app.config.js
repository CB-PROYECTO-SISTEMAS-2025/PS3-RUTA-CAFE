const fs = require('fs');
const os = require('os');

// Hook que se ejecuta ANTES de expo start
function preExportHook(config) {
  console.log('🔄 Actualizando IP automáticamente...');
  
  // Detectar IP del WiFi
  const interfaces = os.networkInterfaces();
  let wifiIP = '192.168.1.100';
  
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wlan')) {
          wifiIP = net.address;
          break;
        }
      }
    }
  }
  
  // Actualizar .env.local
  const envContent = `EXPO_PUBLIC_API_URL=http://${wifiIP}:4000`;
  fs.writeFileSync('.env.local', envContent, 'utf8');
  
  console.log(`✅ IP automática configurada: ${wifiIP}`);
  
  // Forzar a Expo a usar la IP real en lugar de localhost
  process.env.EXPO_PACKAGER_PROXY_URL = `http://${wifiIP}:8081`;
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = wifiIP;
  
  return config;
}

module.exports = {
  expo: {
    name: "appmovil_rutadelcafe",
    slug: "appmovil_rutadelcafe",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    hooks: {
      preExport: preExportHook
    }
  }
};