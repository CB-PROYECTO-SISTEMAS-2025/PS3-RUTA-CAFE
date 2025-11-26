  import React, { useEffect, useState } from "react";
  import { useRouter } from "expo-router";
  import AsyncStorage from "@react-native-async-storage/async-storage";
  import { ActivityIndicator, View } from "react-native";

  export function withAuth(Component: React.ComponentType) {
    return function AuthWrapper(props: any) {
      const [loading, setLoading] = useState(true);
      const [isLoggedIn, setIsLoggedIn] = useState(false);
      const router = useRouter();

      useEffect(() => {
        const checkLogin = async () => {
          const token = await AsyncStorage.getItem("userToken");
          if (token) {
            setIsLoggedIn(true);
          } else {
            router.replace("/login"); // 👈 redirige directo al login
          }
          setLoading(false);
        };
        checkLogin();
      }, []);

      if (loading) {
        return (
          <View className="flex-1 justify-center items-center bg-orange-50">
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        );
      }

      if (!isLoggedIn) return null;

      return <Component {...props} />;
    };
  }
