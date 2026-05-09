import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrokerComplianceScreen } from '../screens/BrokerComplianceScreen';
import { BrokerVenueDetailScreen } from '../screens/BrokerVenueDetailScreen';

const Stack = createNativeStackNavigator();

export function BrokerComplianceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ComplianceList" component={BrokerComplianceScreen} />
      <Stack.Screen name="VenueDetail" component={BrokerVenueDetailScreen} />
    </Stack.Navigator>
  );
}
