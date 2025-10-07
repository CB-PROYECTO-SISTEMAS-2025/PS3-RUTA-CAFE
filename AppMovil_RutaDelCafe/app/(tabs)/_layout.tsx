import React from "react";
import { Tabs } from "expo-router";
import {
  TouchableOpacity,
  Text,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const ORANGE = "#f97316";
const WHITE = "#ffffff";
const TAB_HEIGHT = 96;
const ICON_SIZE = 26;

/* ---------- Item (sin animación) ---------- */
function TabItem({
  label,
  iconName,
  focused,
  onPress,
}: {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrapper}>
        <View
          style={[
            styles.iconContainer,
            focused
              ? { backgroundColor: WHITE, borderColor: ORANGE, borderWidth: 3 }
              : { backgroundColor: "transparent", borderWidth: 0, borderColor: "transparent" },
          ]}
        >
          <Ionicons name={iconName} size={ICON_SIZE} color={focused ? ORANGE : WHITE} />
        </View>
      </View>

      <Text
        style={[
          styles.label,
          { color: WHITE, fontWeight: focused ? "bold" : "600", opacity: focused ? 1 : 0.9 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------- TabBar plano ---------- */
function MyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.tabBg} />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = (options.title ?? route.name) as string;

          const iconName: keyof typeof Ionicons.glyphMap =
            route.name === "advertisement"
              ? "home-outline"
              : route.name === "settings"
              ? "settings-outline"
              : route.name === "explore"
              ? "fast-food-outline"
              : "person-circle-outline";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View key={route.key} style={{ flex: 1, alignItems: "center" }}>
              <TabItem label={label} iconName={iconName} focused={focused} onPress={onPress} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <MyTabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="advertisement" options={{ title: "Home" }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes" }} />
      <Tabs.Screen name="explore" options={{ title: "Rutas" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  tabBg: {
    backgroundColor: ORANGE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: TAB_HEIGHT,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
  },
  tabButton: { width: "100%", alignItems: "center", justifyContent: "flex-start", paddingTop: 6 },
  iconWrapper: { alignItems: "center", justifyContent: "center" },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 1 },
      android: { textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    }),
  },
});
