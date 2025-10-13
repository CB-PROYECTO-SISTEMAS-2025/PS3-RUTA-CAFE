import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "auto";

export function useThemeManager() {
  const [theme, setTheme] = useState<ThemeMode>("auto");

  // Cargar preferencia guardada o usar la hora del sistema
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("themeMode");
      if (saved) setTheme(saved as ThemeMode);
      else detectByTime();
    })();
  }, []);

  // Detectar modo según hora
  const detectByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 19 || hour < 6) setTheme("dark");
    else setTheme("light");
  };

  // Calcular modo efectivo
  const effectiveTheme =
    theme === "auto"
      ? Appearance.getColorScheme() === "dark"
        ? "dark"
        : "light"
      : theme;

  const toggleTheme = async (mode: ThemeMode) => {
    setTheme(mode);
    await AsyncStorage.setItem("themeMode", mode);
  };

  return { theme, effectiveTheme, toggleTheme };
}
