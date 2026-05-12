import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClaimsListScreen } from '../screens/ClaimsListScreen';
import { ClaimDetailScreen } from '../screens/ClaimDetailScreen';

const Stack = createNativeStackNavigator();

export function ClaimsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClaimsList" component={ClaimsListScreen} />
      <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
    </Stack.Navigator>
  );
}
