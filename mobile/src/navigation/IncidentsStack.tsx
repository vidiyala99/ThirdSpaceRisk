import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IncidentListScreen } from '../screens/IncidentListScreen';
import { IncidentDetailScreen } from '../screens/IncidentDetailScreen';
import { ReportIncidentScreen } from '../screens/ReportIncidentScreen';
import { ClaimDetailScreen } from '../screens/ClaimDetailScreen';

const Stack = createNativeStackNavigator();

export function IncidentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="IncidentList" component={IncidentListScreen} />
      <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
      <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
      <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
    </Stack.Navigator>
  );
}
