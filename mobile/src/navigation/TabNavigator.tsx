import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { IncidentListScreen } from '../screens/IncidentListScreen';
import { ReportIncidentScreen } from '../screens/ReportIncidentScreen';
import { LiveTerminalScreen } from '../screens/LiveTerminalScreen';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Dashboard: '◈',
  Incidents: '⊞',
  Report: '＋',
  Live: '◉',
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0b0c15', shadowColor: 'transparent', elevation: 0 },
        headerTintColor: '#f9fafb',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: '#0d0e18',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#c8f000',
        tabBarInactiveTintColor: '#4b5563',
        tabBarLabel: route.name,
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Incidents" component={IncidentListScreen} />
      <Tab.Screen name="Report" component={ReportIncidentScreen} />
      <Tab.Screen name="Live" component={LiveTerminalScreen} />
    </Tab.Navigator>
  );
}
