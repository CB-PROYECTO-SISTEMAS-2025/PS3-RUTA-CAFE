import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "auto";
type Ctx = {
  theme: ThemeMode;
  effectiveTheme: "light" | "dark";
  setTheme: (m: ThemeMode) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function computeByTime(date = new Date()): "light" | "dark" {
  const h = date.getHours();
  return h >= 19 || h < 6 ? "dark" : "light";
}

export function ThemeProviderApp({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("auto");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(computeByTime());

  // ⚙️ Elimina el tipo conflictivo de NodeJS.Timeout y usa "number | null"
  const timerRef = useRef<number | null>(null);

  // 🔸 Cargar preferencia del usuario o por hora
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("themeMode");
      if (saved) setThemeState(saved as ThemeMode);
    })();
  }, []);

  // 🔸 Cambia automáticamente entre 19:00 y 06:00 si está en modo "auto"
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (theme !== "auto") return;

    const now = new Date();
    const next = new Date(now);
    const hour = now.getHours();
    const nextBoundaryHour = hour >= 19 || hour < 6 ? 6 : 19; // si está oscuro → 06:00, si claro → 19:00
    next.setHours(nextBoundaryHour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const ms = next.getTime() - now.getTime();

    // ✅ Usa window.setTimeout (devuelve number)
    timerRef.current = window.setTimeout(() => setEffectiveTheme(computeByTime()), ms);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [theme, effectiveTheme]);

  // 🔸 Recalcular al cambiar manualmente el modo
  useEffect(() => {
    if (theme === "auto") setEffectiveTheme(computeByTime());
    else setEffectiveTheme(theme);
  }, [theme]);

  const setTheme = async (m: ThemeMode) => {
    setThemeState(m);
    await AsyncStorage.setItem("themeMode", m);
  };

  const value = useMemo(() => ({ theme, effectiveTheme, setTheme }), [theme, effectiveTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProviderApp");
  return ctx;
}
