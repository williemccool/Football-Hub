import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () => (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
          />
        ),
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hub",
          tabBarIcon: ({ color }) => <Feather name="zap" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: "Squad",
          tabBarIcon: ({ color }) => <Feather name="users" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="league"
        options={{
          title: "League",
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          title: "Fixtures",
          tabBarIcon: ({ color }) => <Feather name="calendar" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="club"
        options={{
          title: "Club",
          tabBarIcon: ({ color }) => <Feather name="award" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
