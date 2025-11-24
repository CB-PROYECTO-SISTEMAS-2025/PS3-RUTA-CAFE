import { useTheme } from "../../hooks/theme-context";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { i18n } from "../../i18n.js";
import { useSettings } from "../../hooks/useSettings.js";

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const { theme, setTheme } = useTheme();
  const themed = useThemedStyles();

  const [currentLocale, setCurrentLocale] = useState(i18n.getCurrentLanguage());
  const [changingLanguage, setChangingLanguage] = useState(false);

  useEffect(() => {
    setCurrentLocale(i18n.locale);
  }, []);

  const t = (key: string) => i18n.t(key);

  const changeLanguage = async (languageCode: string) => {
    if (currentLocale === languageCode) return;
    setChangingLanguage(true);
    try {
      const success = await i18n.changeLanguage(languageCode);
      if (success) {
        Alert.alert(
          t("settings.languageChanged"),
          t("settings.languageChangeMessage"),
          [{ text: t("common.ok") }]
        );
      } else throw new Error("Failed to change language");
    } catch (error) {
      console.error("Error changing language:", error);
      Alert.alert(t("common.error"), t("settings.languageChangeError"));
    } finally {
      setChangingLanguage(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push("/(tabs)/advertisement");
  };

  const languages = i18n.getAvailableLanguages();

  if (settings.refreshing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: themed.background,
        }}
      >
        <ActivityIndicator size="large" color={themed.accent} />
        <Text style={{ color: themed.text, marginTop: 10 }}>
          {t("common.loading")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: themed.accent,
          paddingHorizontal: 24,
          paddingTop: 48,
          paddingBottom: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 6,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Ionicons name="settings-outline" size={32} color="#FFFFFF" />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 24,
              fontWeight: "bold",
              marginTop: 8,
            }}
          >
            {t("settings.title")}
          </Text>
        </View>
      </View>

      {/* Contenido */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 100,
        }}
      >
        
        {/* <TouchableOpacity
          onPress={handleBack}
          style={{
            backgroundColor: themed.card,
            borderColor: themed.border,
            borderWidth: 1,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={themed.accent}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: themed.text,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            {t("common.back")}
          </Text>
        </TouchableOpacity> */}

        {/* Idioma */}
        <View
          style={{
            backgroundColor: themed.card,
            borderRadius: 20,
            borderColor: themed.border,
            borderWidth: 1,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="language-outline" size={24} color={themed.accent} />
            <Text
              style={{
                color: themed.text,
                fontWeight: "bold",
                fontSize: 20,
                marginLeft: 8,
              }}
            >
              {t("settings.language")}
            </Text>
          </View>

          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              onPress={() => changeLanguage(language.code)}
              disabled={changingLanguage}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor:
                  currentLocale === language.code
                    ? themed.accent + "22"
                    : themed.background,
                borderColor:
                  currentLocale === language.code
                    ? themed.accent
                    : themed.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>
                  {i18n.getLanguageFlag(language.code)}
                </Text>
                <View>
                  <Text
                    style={{ color: themed.text, fontWeight: "600", fontSize: 16 }}
                  >
                    {language.nativeName}
                  </Text>
                  <Text style={{ color: themed.muted, fontSize: 12 }}>
                    {language.name}
                  </Text>
                </View>
              </View>

              {currentLocale === language.code && !changingLanguage && (
                <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Preferencias */}
        <View
          style={{
            backgroundColor: themed.card,
            borderColor: themed.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="options-outline" size={24} color={themed.accent} />
            <Text
              style={{
                color: themed.text,
                fontWeight: "bold",
                fontSize: 20,
                marginLeft: 8,
              }}
            >
              {t("settings.preferences")}
            </Text>
          </View>

          {/* Notificaciones */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottomColor: themed.border,
              borderBottomWidth: 1,
              paddingBottom: 10,
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: themed.text, fontWeight: "600", fontSize: 16 }}>
                {t("settings.notifications")}
              </Text>
              <Text style={{ color: themed.muted, fontSize: 12, marginTop: 4 }}>
                {t("settings.notificationsDescription")}
              </Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={settings.toggleNotifications}
              trackColor={{ false: "#d1d5db", true: themed.accent + "66" }}
              thumbColor={settings.notifications ? themed.accent : "#ccc"}
            />
          </View>

          {/* Tema */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 10,
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: themed.text, fontWeight: "600", fontSize: 16 }}>
                Tema
              </Text>
              <Text style={{ color: themed.muted, fontSize: 12, marginTop: 4 }}>
                Automático por hora o forzado
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const next =
                  theme === "light"
                    ? "dark"
                    : theme === "dark"
                    ? "auto"
                    : "light";
                setTheme(next);
                Alert.alert(
                  "Tema cambiado",
                  next === "auto"
                    ? "Automático (19:00 a 06:00 oscuro)"
                    : next === "dark"
                    ? "Oscuro"
                    : "Claro"
                );
              }}
              style={{
                backgroundColor: themed.accent + "22",
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: themed.accent,
              }}
            >
              <Text style={{ color: themed.accent, fontWeight: "600" }}>
                {theme === "light"
                  ? "Claro"
                  : theme === "dark"
                  ? "Oscuro"
                  : "Automático"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
