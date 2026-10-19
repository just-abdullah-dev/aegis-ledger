import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { BiometricAuthScreen } from '@/screens/BiometricAuthScreen';
import { AegisColors } from '@/constants/theme';

export type AuthStackParamList = {
  Login: undefined;
  BiometricAuth: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AegisColors.navy950 },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="BiometricAuth" component={BiometricAuthScreen} />
    </Stack.Navigator>
  );
};
