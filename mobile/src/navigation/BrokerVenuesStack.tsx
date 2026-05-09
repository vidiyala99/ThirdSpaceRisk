import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrokerVenuesScreen } from '../screens/BrokerVenuesScreen';
import { BrokerVenueDetailScreen } from '../screens/BrokerVenueDetailScreen';

const Stack = createNativeStackNavigator();

export function BrokerVenuesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BrokerVenuesList" component={BrokerVenuesScreen} />
      <Stack.Screen name="VenueDetail" component={BrokerVenueDetailScreen} />
    </Stack.Navigator>
  );
}
