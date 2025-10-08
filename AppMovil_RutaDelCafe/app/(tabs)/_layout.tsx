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

const ORANGE = "#f97316";
const WHITE = "#ffffff";
const TAB_HEIGHT = 72;
const ICON_SIZE = 23;

// ---- ÍTEM INDIVIDUAL ----
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

  const handlePress = () => {
    bounce();
    onPress();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={handlePress}
      style={styles.tabButton}
      activeOpacity={0.85}
    >
      <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <View
          style={[
            styles.iconContainer,
            focused
              ? { backgroundColor: WHITE, borderColor: ORANGE, borderWidth: 2.5 }
              : { backgroundColor: "transparent", borderWidth: 0 },
          ]}
        >
          <Ionicons name={iconName} size={ICON_SIZE} color={focused ? ORANGE : WHITE} />
        </View>
      </Animated.View>

      <Text
        style={[
          styles.label,
          { color: WHITE, fontWeight: focused ? "bold" : "600", opacity: focused ? 1 : 0.9 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---- NAVBAR COMPLETO ----
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

// ---- ESTILOS ----
const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  tabBg: {
    backgroundColor: ORANGE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: TAB_HEIGHT,
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
    height: TAB_HEIGHT,
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
  label: {
    fontSize: 11,
    marginTop: 3,
    textAlign: "center",
  },
});
