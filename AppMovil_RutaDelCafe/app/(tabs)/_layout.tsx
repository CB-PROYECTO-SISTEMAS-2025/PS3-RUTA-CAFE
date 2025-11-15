import React, { useRef } from "react";
import { Tabs } from "expo-router";
import {
  TouchableOpacity,
  Text,
  Platform,
  StyleSheet,
  View,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../../hooks/theme-context";

export default function TabLayout() {
  const { theme, effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  const COLORS = {
    bg: isDark ? "#1E3A8A" : "#f97316",
    text: isDark ? "#E5E7EB" : "#FFFFFF",
    iconActive: isDark ? "#60A5FA" : "#f97316",
    iconInactive: isDark ? "#A5B4FC" : "#FFFFFF",
  };

  function TabItem({ label, iconName, focused, onPress }: any) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const bounce = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 80,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <TouchableOpacity
        onPress={() => {
          bounce();
          onPress();
        }}
        style={styles.tabButton}
        activeOpacity={0.85}
      >
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <View
            style={[
              styles.iconContainer,
              focused
                ? { backgroundColor: COLORS.text, borderColor: COLORS.iconActive, borderWidth: 2.5 }
                : { backgroundColor: "transparent", borderWidth: 0 },
            ]}
          >
            <Ionicons
              name={iconName}
              size={23}
              color={focused ? COLORS.iconActive : COLORS.iconInactive}
            />
          </View>
        </Animated.View>
        <Text
          style={{
            color: COLORS.text,
            fontWeight: focused ? "bold" : "600",
            opacity: focused ? 1 : 0.9,
            fontSize: 11,
            marginTop: 3,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function MyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
      <View pointerEvents="box-none" style={styles.wrap}>
        <View style={[styles.tabBg, { backgroundColor: COLORS.bg }]} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = (options.title ?? route.name) as string;
            
            let iconName = "help-outline";
            if (route.name === "advertisement") iconName = focused ? "home" : "home-outline";
            else if (route.name === "settings") iconName = focused ? "settings" : "settings-outline";
            else if (route.name === "indexR") iconName = focused ? "fast-food" : "fast-food-outline";
            else if (route.name === "profile") iconName = focused ? "person-circle" : "person-circle-outline";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
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

  return (
    <Tabs
      key={effectiveTheme}
      tabBar={(p) => <MyTabBar {...p} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="advertisement" options={{ title: "Home" }} />
      <Tabs.Screen name="indexR" options={{ title: "Rutas" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  tabBg: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 72,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
  },
  tabButton: { width: "100%", alignItems: "center", justifyContent: "flex-start", paddingTop: 4 },
  iconWrapper: { alignItems: "center", justifyContent: "center" },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
});