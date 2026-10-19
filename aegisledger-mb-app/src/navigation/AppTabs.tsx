import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { TransferScreen } from '@/screens/TransferScreen';
import { HoldsScreen } from '@/screens/HoldsScreen';
import { TransactionHistoryScreen } from '@/screens/TransactionHistoryScreen';
import { AccountDetailsScreen } from '@/screens/AccountDetailsScreen';
import { AegisColors } from '@/constants/theme';
import { LayoutDashboard, Send, Lock, History, Shield } from 'lucide-react-native';
import { useAccountStore } from '@/store/accountStore';

export type AppTabsParamList = {
  Dashboard: undefined;
  Transfer: undefined;
  Holds: undefined;
  History: undefined;
  AccountDetails: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export const AppTabs: React.FC = () => {
  const { selectedAccountNumber } = useAccountStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: AegisColors.navy900,
          borderTopColor: AegisColors.navy800,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: AegisColors.primary400,
        tabBarInactiveTintColor: AegisColors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Vault Core',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Transfer"
        component={TransferScreen}
        options={{
          tabBarLabel: 'Transfer',
          tabBarIcon: ({ color, size }) => <Send size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Holds"
        component={HoldsScreen}
        options={{
          tabBarLabel: 'Holds',
          tabBarIcon: ({ color, size }) => <Lock size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={TransactionHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AccountDetails"
        children={() => (
          <AccountDetailsScreen
            accountNumber={selectedAccountNumber}
            onBack={() => {}}
          />
        )}
        options={{
          tabBarLabel: 'Ledger Audit',
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
