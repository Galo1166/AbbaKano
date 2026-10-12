import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  AppState,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useTheme } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
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
import { AppLockView } from '@/views/AppLockView';
import { ForgotPasswordView } from '@/views/ForgotPasswordView';

// Global Transaction Overlays
import { CheckoutSheet } from '@/components/modals/CheckoutSheet';
import { PinAuthModal } from '@/components/modals/PinAuthModal';
import { saveBiometricTransactionPin, isAppLockEnabled } from '@/services/biometricService';
import { supabase, extractFunctionError } from '@/lib/supabase';
import { ReceiptModal } from '@/components/modals/ReceiptModal';

type AuthState = 'authenticated' | 'welcome' | 'login' | 'register' | 'pin_setup' | 'forgot_password';
type DedicatedService = 'airtime' | 'electricity' | 'cable' | null;

export default function App() {
  const { user, isLoading: authLoading, isPasswordRecovery, logout } = useAuth();
  // Derive initial auth screen from token hydration
  const [authState, setAuthState] = useState<AuthState>('welcome');
  const [isAppLocked, setIsAppLocked] = useState(true);
  const [changingPin, setChangingPin] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTabKey>('home');
  const [activeDedicatedService, setActiveDedicatedService] = useState<DedicatedService>(null);
  const [showFundWallet, setShowFundWallet] = useState(false);
  const [showReferEarn, setShowReferEarn] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const { effectiveTheme } = useApp();
  const T = useTheme();
  const bg = { backgroundColor: T.canvas };

  // When auth hydration resolves, update authState
  useEffect(() => {
    if (!authLoading) {
      setAuthState(isPasswordRecovery ? 'forgot_password' : user ? 'authenticated' : 'welcome');
    }
  }, [authLoading, user, isPasswordRecovery]);

  // Check if app lock is enabled for the logged-in session
  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (user) {
        const enabled = await isAppLockEnabled();
        if (mounted) setIsAppLocked(enabled);
      } else {
        if (mounted) setIsAppLocked(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  // Lock app only after at least 3 minutes of background inactivity
  const backgroundTimeRef = useRef<number | null>(null);
  const APP_LOCK_INACTIVITY_MS = 3 * 60 * 1000; // 3 minutes

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!backgroundTimeRef.current) {
          backgroundTimeRef.current = Date.now();
        }
      } else if (nextAppState === 'active') {
        const bgTime = backgroundTimeRef.current;
        backgroundTimeRef.current = null;

        if (bgTime && user) {
          const elapsed = Date.now() - bgTime;
          if (elapsed >= APP_LOCK_INACTIVITY_MS) {
            void isAppLockEnabled().then((enabled) => {
              if (enabled) {
                setIsAppLocked(true);
              }
            });
          }
        }
      }
    });
    return () => subscription.remove();
  }, [user]);

  // Hardware Android Back button handler to provide native navigation and prevent abrupt app exits
  const lastBackPressRef = useRef<number>(0);
  useEffect(() => {
    const onHardwareBack = () => {
      // 1. If inside non-welcome auth sub-screens, return to welcome
      if (authState === 'login' || authState === 'register' || authState === 'forgot_password') {
        setAuthState('welcome');
        return true;
      }

      // If app is locked or in welcome/loading, allow default back behavior
      if (authState !== 'authenticated' || isAppLocked) {
        return false;
      }

      // 2. Overlay sub-screens: close overlay first
      if (showFundWallet) {
        setShowFundWallet(false);
        return true;
      }
      if (showReferEarn) {
        setShowReferEarn(false);
        return true;
      }
      if (showSupport) {
        setShowSupport(false);
        return true;
      }
      if (activeDedicatedService !== null) {
        setActiveDedicatedService(null);
        return true;
      }

      // 3. Bottom tabs: switch back to Home tab before exiting
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }

      // 4. On Home dashboard: double-press back within 2 seconds to exit app
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false; // Exit app
      }
      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backHandler.remove();
  }, [
    authState,
    isAppLocked,
    showFundWallet,
    showReferEarn,
    showSupport,
    activeDedicatedService,
    activeTab,
  ]);

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

  // Show a loading screen while we hydrate auth from storage
  if (authLoading) {
    return (
      <SafeAreaView style={[styles.fill, bg]}>
        <View style={[styles.fill, styles.centered, bg]}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
            setActiveTab('home');
            setShowFundWallet(false);
            setShowReferEarn(false);
            setShowSupport(false);
            setActiveDedicatedService(null);
            setIsAppLocked(false);
            setAuthState('authenticated');
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
          onRegisterSuccess={() => setAuthState('pin_setup')}
          onLoginPress={() => setAuthState('login')}
        />
      </SafeAreaView>
    );
  }

  if (authState === 'pin_setup') {
    return (
      <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
        <AuthPinSetupView
          requireCurrentPin={changingPin}
          onPinCompleted={async (pin, currentPin) => {
            const body: Record<string, unknown> = { newPin: pin };
            if (changingPin && currentPin) {
              body.currentPin = currentPin;
            }
            const { error } = await supabase.functions.invoke('update-transaction-pin', { body });
            if (error) {
              const errorMsg = await extractFunctionError(error, 'Could not save your transaction PIN.');
              throw new Error(errorMsg);
            }
            await saveBiometricTransactionPin(pin);
            setChangingPin(false);
            setActiveTab('home');
            setIsAppLocked(false);
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

  // ── App Lock challenge screen when authenticated session is locked ──
  if (authState === 'authenticated' && isAppLocked) {
    return (
      <SafeAreaView key={effectiveTheme} style={[styles.fill, bg]}>
        <AppLockView
          onUnlock={() => setIsAppLocked(false)}
          onSignOut={async () => {
            await logout();
            setIsAppLocked(false);
            setActiveTab('home');
            setShowFundWallet(false);
            setShowReferEarn(false);
            setShowSupport(false);
            setActiveDedicatedService(null);
            setAuthState('welcome');
          }}
        />
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
                onNavigateToPinSetup={(hasExistingPin) => {
                  setChangingPin(Boolean(hasExistingPin));
                  setAuthState('pin_setup');
                }}
                onSignOut={async () => {
                  await logout();
                  setIsAppLocked(false);
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
  centered: { alignItems: 'center', justifyContent: 'center' },
});
