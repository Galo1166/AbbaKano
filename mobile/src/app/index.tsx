import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useTheme } from '@/context/AppContext';
import { AppBottomNav, AppTabKey } from '@/components/navigation/AppBottomNav';
import { DashboardView } from '@/views/DashboardView';
import { VtuView } from '@/views/VtuView';
import { AirtimeView } from '@/views/AirtimeView';
import { ElectricityView } from '@/views/ElectricityView';
import { CableTvView } from '@/views/CableTvView';
import { FundWalletView } from '@/views/FundWalletView';
import { LedgerView } from '@/views/LedgerView';
import { ProfileView } from '@/views/ProfileView';
import { ReferEarnView } from '@/views/ReferEarnView';
import { SupportView } from '@/views/SupportView';

// Auth & Onboarding Views
import { AuthWelcomeView } from '@/views/AuthWelcomeView';
import { AuthLoginView } from '@/views/AuthLoginView';
import { AuthRegisterView } from '@/views/AuthRegisterView';
import { AuthPinSetupView } from '@/views/AuthPinSetupView';
import { ForgotPasswordView } from '@/views/ForgotPasswordView';

// Global Transaction Overlays
import { CheckoutSheet } from '@/components/modals/CheckoutSheet';
import { PinAuthModal } from '@/components/modals/PinAuthModal';
import { ReceiptModal } from '@/components/modals/ReceiptModal';
import { apiPost } from '@/lib/api';

type AuthState = 'authenticated' | 'welcome' | 'login' | 'register' | 'pin_setup' | 'forgot_password';
type DedicatedService = 'airtime' | 'electricity' | 'cable' | null;

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('welcome');
  const [activeTab, setActiveTab] = useState<AppTabKey>('home');
  const [activeDedicatedService, setActiveDedicatedService] = useState<DedicatedService>(null);
  const [showFundWallet, setShowFundWallet] = useState(false);
  const [showReferEarn, setShowReferEarn] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const { effectiveTheme, sessionStatus, refreshServerState, logout } = useApp();
  const T = useTheme();

  const bg = { backgroundColor: T.canvas };

  useEffect(() => {
    if (sessionStatus === 'authenticated') setAuthState('authenticated');
    if (sessionStatus === 'unauthenticated' && authState === 'authenticated') setAuthState('welcome');
  }, [sessionStatus, authState]);

  if (sessionStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.fill, bg]}>
        <ActivityIndicator color={T.primary} size="large" />
      </SafeAreaView>
    );
  }

  const handleSelectService = (serviceKey: string) => {
    setShowFundWallet(false);
    setShowReferEarn(false);
    setShowSupport(false);

    if (serviceKey === 'airtime') {
      setActiveDedicatedService('airtime');
    } else if (serviceKey === 'electricity') {
      setActiveDedicatedService('electricity');
    } else if (serviceKey === 'cable') {
      setActiveDedicatedService('cable');
    } else {
      // 'data' or default: open dedicated Data Bundles view
      setActiveDedicatedService(null);
      setActiveTab('vtu');
    }
  };

  const handleNavigateTab = (tab: AppTabKey) => {
    setShowFundWallet(false);
    setShowReferEarn(false);
    setShowSupport(false);
    setActiveDedicatedService(null);
    setActiveTab(tab);
  };

  // ── Auth screens — use effectiveTheme as key so re-mounting picks up T.canvas ──
  if (authState === 'welcome') {
    return (
      <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
        <AuthWelcomeView
          onLoginPress={() => setAuthState('login')}
          onRegisterPress={() => setAuthState('register')}
        />
      </SafeAreaView>
    );
  }

  if (authState === 'login') {
    return (
      <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
        <AuthLoginView
          onLoginSuccess={() => {
            void refreshServerState().then((authenticated) => {
              if (authenticated) {
                setActiveTab('home');
                setShowFundWallet(false);
                setShowReferEarn(false);
                setShowSupport(false);
                setActiveDedicatedService(null);
                setAuthState('authenticated');
              }
            });
          }}
          onRegisterPress={() => setAuthState('register')}
          onForgotPasswordPress={() => setAuthState('forgot_password')}
        />
      </SafeAreaView>
    );
  }

  if (authState === 'register') {
    return (
      <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
        <AuthRegisterView
          onRegisterSuccess={() => {
            void refreshServerState().then((authenticated) => {
              if (authenticated) setAuthState('authenticated');
            });
          }}
          onLoginPress={() => setAuthState('login')}
        />
      </SafeAreaView>
    );
  }

  if (authState === 'pin_setup') {
    return (
      <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
        <AuthPinSetupView
          onPinCompleted={() => {
            setActiveTab('home');
            setAuthState('authenticated');
          }}
        />
      </SafeAreaView>
    );
  }

  if (authState === 'forgot_password') {
    return (
      <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
        <ForgotPasswordView onBackToLogin={() => setAuthState('login')} />
      </SafeAreaView>
    );
  }

  // ── Main authenticated shell ──────────────────────────────────────────────────
  return (
    <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
      <View style={[styles.fill, bg]}>
        {showFundWallet ? (
          <FundWalletView onBackPress={() => setShowFundWallet(false)} />
        ) : showReferEarn ? (
          <ReferEarnView onBackPress={() => setShowReferEarn(false)} />
        ) : showSupport ? (
          <SupportView onBackPress={() => setShowSupport(false)} />
        ) : activeDedicatedService === 'airtime' ? (
          <AirtimeView onBackPress={() => setActiveDedicatedService(null)} />
        ) : activeDedicatedService === 'electricity' ? (
          <ElectricityView onBackPress={() => setActiveDedicatedService(null)} />
        ) : activeDedicatedService === 'cable' ? (
          <CableTvView onBackPress={() => setActiveDedicatedService(null)} />
        ) : (
          <>
            {activeTab === 'home' && (
              <DashboardView
                onNavigateTab={(tab) => {
                  if (tab === 'home') setShowFundWallet(true);
                  else handleNavigateTab(tab);
                }}
                onSelectService={handleSelectService}
                onNavigateToSupport={() => setShowSupport(true)}
              />
            )}
            {activeTab === 'vtu' && (
              <VtuView onBackPress={() => setActiveTab('home')} />
            )}
            {activeTab === 'ledger' && <LedgerView />}
            {activeTab === 'account' && (
              <ProfileView
                onNavigateToReferEarn={() => setShowReferEarn(true)}
                onNavigateToFundWallet={() => setShowFundWallet(true)}
                onNavigateToSupport={() => setShowSupport(true)}
                onNavigateToPinSetup={() => setAuthState('pin_setup')}
                onSignOut={() => {
                  void logout();
                  setActiveTab('home');
                  setShowFundWallet(false);
                  setShowReferEarn(false);
                  setShowSupport(false);
                  setActiveDedicatedService(null);
                  setAuthState('welcome');
                }}
              />
            )}
          </>
        )}
      </View>

      <AppBottomNav activeTab={activeTab} onTabChange={handleNavigateTab} />

      {/* Global Overlays */}
      <CheckoutSheet />
      <PinAuthModal />
      <ReceiptModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
