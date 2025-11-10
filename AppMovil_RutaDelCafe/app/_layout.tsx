import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { ThemeProviderApp, useTheme } from "../hooks/theme-context";

function RootInner() {
  const { effectiveTheme } = useTheme();

  const NavyDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: "#0D1117",
      card: "#1E3A8A",
      text: "#E5E7EB",
      border: "#1E3A8A",
      primary: "#3B82F6",
    },
  };

  const LightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#FFFFFF",
      card: "#f97316",
      text: "#1F1F1F",
      border: "#f59e0b",
      primary: "#f97316",
    },
  };

  return (
    <NavThemeProvider value={effectiveTheme === "dark" ? NavyDarkTheme : LightTheme}>
      <Stack>
        {/* 👇 Mantener tabs sin header */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* 👇 Ocultar headers en rutas específicas de Route */}
        <Stack.Screen name="Route/details" options={{ headerShown: false }} />
        <Stack.Screen name="Route/create" options={{ headerShown: false }} />
        <Stack.Screen name="Route/edit" options={{ headerShown: false }} />
        
        {/* 👇 Ocultar headers en rutas específicas de Place */}
        <Stack.Screen name="Place/details" options={{ headerShown: false }} />
        <Stack.Screen name="Place/comments" options={{ headerShown: false }} />
        <Stack.Screen name="Place/create" options={{ headerShown: false }} />
        <Stack.Screen name="Place/edit" options={{ headerShown: false }} />
        
        {/* 👇 Ocultar headers en otras rutas específicas */}
        <Stack.Screen name="indexP" options={{ headerShown: false }} />
        <Stack.Screen name="indexR" options={{ headerShown: false }} />
        <Stack.Screen name="Place/favorites" options={{ headerShown: false }} />
        
        {/* 👇 Modal puede mantener header si quieres */}
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        
        {/* 👇 Para cualquier otra pantalla no cubierta */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        
        {/* 👇 Rutas adicionales que puedan existir */}
        <Stack.Screen name="advertisement" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={effectiveTheme === "dark" ? "light" : "dark"} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProviderApp>
      <RootInner />
    </ThemeProviderApp>
  );
}