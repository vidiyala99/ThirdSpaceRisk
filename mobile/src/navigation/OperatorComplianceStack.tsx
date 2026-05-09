import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OperatorComplianceScreen } from '../screens/OperatorComplianceScreen';
import { ComplianceItemDetailScreen } from '../screens/ComplianceItemDetailScreen';

const Stack = createNativeStackNavigator();

export function OperatorComplianceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ComplianceList" component={OperatorComplianceScreen} />
      <Stack.Screen name="ComplianceDetail" component={ComplianceItemDetailScreen} />
    </Stack.Navigator>
  );
}
