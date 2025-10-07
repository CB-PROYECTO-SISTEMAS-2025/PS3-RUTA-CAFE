// app/(tabs)/explore.tsx
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 🔹 ExploreTab
 * Este componente determina a dónde redirigir cuando se toca la pestaña "Rutas".
 * - Si hay sesión, redirige a /Route
 * - Si no hay sesión (visitante), también redirige a /Route (modo público)
 */
export default function ExploreTab() {
  const [isReady, setIsReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        setHasSession(!!token); // true si hay token
      } catch (error) {
        console.error("Error verificando sesión:", error);
      } finally {
        setIsReady(true);
      }
    };
    checkSession();
  }, []);

  if (!isReady) {
    // 🔸 Espera hasta cargar el estado del token
    return null;
  }

  // ✅ En ambos casos (con o sin login) redirige a /Route
  // El acceso a rutas es público desde el backend
  return <Redirect href="/Route" />;
}
