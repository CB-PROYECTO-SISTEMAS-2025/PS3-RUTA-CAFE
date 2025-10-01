// app/(tabs)/explore.tsx
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ExploreTab() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = await AsyncStorage.getItem("userToken");
      setIsLoggedIn(!!token);
    };
    checkLoginStatus();
  }, []);

  if (isLoggedIn === null) {
    // todavía cargando
    return null;
  }

  if (!isLoggedIn) {
    // si no está logueado, lo manda a login
    return <Redirect href="/login" />;
  }

  // si está logueado, lo manda a Route
  return <Redirect href="/Route" />;
}
