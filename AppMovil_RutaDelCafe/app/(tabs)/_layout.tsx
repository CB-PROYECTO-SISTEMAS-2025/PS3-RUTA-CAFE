// app/(tabs)/_layout.tsx
import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  TouchableOpacity,
  Text,
  Platform,
  StyleSheet,
} from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

const ORANGE = "#f97316";

type BubbleProps = BottomTabBarButtonProps & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  size?: number;
};

function BubbleTabButton({
  accessibilityState,
  accessibilityLabel,
  onPress,
  onLongPress,
  testID,
  icon,
  label,
  size = 28,
}: BubbleProps) {
  const focused = !!accessibilityState?.selected;

  // Animación por estado (focus)
  const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  // Animación “press feedback”
  const pressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [focused]);

  const onPressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  // Elevación + escala por focus
  const translateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const focusScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  // Pequeño “shrink” al tocar
  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  // Escala final = focus * press
  const combinedScale = Animated.multiply(focusScale, pressScale);

  // Burbuja
  const bubbleOpacity = focusAnim; // 0 → 1
  const bubbleScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={styles.tabBtnTouch}
    >
      {/* Contenedor centrado para la burbuja */}
      <Animated.View
        style={[
          styles.bubbleWrap,
          { opacity: bubbleOpacity, transform: [{ scale: bubbleScale }] },
        ]}
        pointerEvents="none"
      >
        <Animated.View style={styles.bubbleCircle} />
      </Animated.View>

      {/* Ícono que se eleva y muestra borde naranja */}
      <Animated.View
        style={[
          styles.iconWrap,
          {
            transform: [{ translateY }, { scale: combinedScale }],
            borderColor: ORANGE,
            borderWidth: focused ? 2 : 0,
            backgroundColor: focused ? "#fff" : "transparent",
            shadowOpacity: focused ? 0.28 : 0,
            zIndex: 2,
          },
        ]}
      >
        <Ionicons name={icon} size={size} color={focused ? ORANGE : "#fff"} />
      </Animated.View>

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="advertisement"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: ORANGE,
          height: 70,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: "absolute",
          overflow: "hidden",
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="advertisement"
        options={{
          tabBarButton: (props) => (
            <BubbleTabButton {...props} icon="home-outline" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarButton: (props) => (
            <BubbleTabButton {...props} icon="settings-outline" label="Ajustes" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarButton: (props) => (
            <BubbleTabButton
              {...props}
              icon="fast-food-outline"
              label="Rutas"
              size={30}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarButton: (props) => (
            <BubbleTabButton
              {...props}
              icon="person-circle-outline"
              label="Perfil"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBtnTouch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  // Centra la burbuja detrás del icono
  bubbleWrap: {
    ...StyleSheet.absoluteFillObject,
    top: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  bubbleCircle: {
    width: 54,
    height: 54,
    backgroundColor: "#fff",
    borderRadius: 27,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  label: { fontSize: 10, marginTop: 2, fontWeight: "600", color: "#fff" },
});
