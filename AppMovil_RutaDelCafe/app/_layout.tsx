// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";

// Elimina esta línea - no es necesaria con Expo Router
// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="Place/all-places" options={{ headerShown: false }} />
        <Stack.Screen name="Place/details" options={{ 
          headerShown: true,
          title: 'Detalles del Lugar'
        }} />
        <Stack.Screen name="about-us" options={{ 
          headerShown: true,
          title: 'Acerca de Nosotros'
        }} />
        <Stack.Screen name="modal" options={{ 
          presentation: 'modal', 
          title: 'Modal' 
        }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}