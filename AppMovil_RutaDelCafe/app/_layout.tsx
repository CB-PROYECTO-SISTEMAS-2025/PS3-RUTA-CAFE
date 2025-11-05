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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
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
