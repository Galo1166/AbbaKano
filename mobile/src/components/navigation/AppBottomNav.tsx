import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Rounded, Spacing, Layout } from '@/constants/theme';
import { useTheme } from '@/context/AppContext';

export type AppTabKey = 'home' | 'vtu' | 'ledger' | 'account';

interface AppBottomNavProps {
  activeTab: AppTabKey;
  onTabChange: (tab: AppTabKey) => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const T = useTheme();

  const iconColor = (tab: AppTabKey) =>
    activeTab === tab ? T.primary : T.onSurfaceMuted;

  const labelStyle = (tab: AppTabKey) =>
    [styles.tabLabel, { color: activeTab === tab ? T.primary : T.onSurfaceMuted }];

  return (
    <View
      style={[
        styles.navContainer,
        { backgroundColor: T.canvas, borderTopColor: T.border },
      ]}
    >
      {/* Home Tab */}
      <Pressable
        style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
        onPress={() => onTabChange('home')}
        accessible accessibilityLabel="Home"
        accessibilityState={{ selected: activeTab === 'home' }}
      >
        <MaterialIcons name="home" size={24} color={iconColor('home')} />
        <Text style={labelStyle('home')}>Home</Text>
      </Pressable>

      {/* Center Elevated FAB - Buy Data */}
      <Pressable
        style={({ pressed }) => [styles.fabContainer, pressed && styles.tabPressed]}
        onPress={() => onTabChange('vtu')}
        accessible accessibilityLabel="Buy Data"
      >
        <View
          style={[
            styles.fab,
            {
              backgroundColor: activeTab === 'vtu' ? T.primary : T.primaryContainer,
              shadowColor: T.primary,
              borderColor: T.canvas,
            },
          ]}
        >
          <MaterialIcons name="bolt" size={28} color="#FFFFFF" />
        </View>
        <Text style={labelStyle('vtu')}>Buy Data</Text>
      </Pressable>

      {/* History Tab */}
      <Pressable
        style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
        onPress={() => onTabChange('ledger')}
        accessible accessibilityLabel="History"
        accessibilityState={{ selected: activeTab === 'ledger' }}
      >
        <MaterialIcons name="receipt-long" size={24} color={iconColor('ledger')} />
        <Text style={labelStyle('ledger')}>History</Text>
      </Pressable>

      {/* Profile Tab */}
      <Pressable
        style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
        onPress={() => onTabChange('account')}
        accessible accessibilityLabel="Profile"
        accessibilityState={{ selected: activeTab === 'account' }}
      >
        <MaterialIcons name="person" size={24} color={iconColor('account')} />
        <Text style={labelStyle('account')}>Profile</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.select({ ios: 24, default: 8 }),
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    zIndex: 100,
    height: Platform.select({ ios: 88, default: 68 }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    minHeight: Layout.minTouchTarget,
  },
  tabPressed: { opacity: 0.7 },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    marginTop: -20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 3,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
});
