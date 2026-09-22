import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Appearance } from 'react-native';
import {
  UserProfile,
  VirtualAccount,
  TransactionRecord,
  TransactionType,
  KycTierInfo,
  MOCK_USER,
  MOCK_VIRTUAL_ACCOUNTS,
  MOCK_TRANSACTIONS,
  MOCK_KYC_TIERS,
} from '@/constants/mockData';
import { getPalette, DarkPalette, setActiveThemeMode, PaletteType } from '@/constants/theme';
import { apiGet, apiPost, ApiError, clearAuthToken, hasAuthToken } from '@/lib/api';
import { TelcoNetworkId, TELCO_LIST } from '@/constants/telco';

export type ThemePreference = 'system' | 'dark' | 'light';
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type VtuPlan = {
  label: string;
  price: number;
  code: string;
  category?: string | null;
  selectionToken?: string;
  provider?: 'vtpass' | 'smeplug';
};

interface AppContextType {
  user: UserProfile;
  sessionStatus: SessionStatus;
  refreshServerState: () => Promise<boolean>;
  logout: () => Promise<void>;
  vtuPlans: Partial<Record<TelcoNetworkId, VtuPlan[]>>;
  loadVtuPlans: (network: TelcoNetworkId, forceRefresh?: boolean) => Promise<VtuPlan[]>;
  mainBalance: number;
  referralCommissionBalance: number;
  isBalanceMasked: boolean;
  toggleBalanceMask: () => void;
  virtualAccounts: VirtualAccount[];
  transactions: TransactionRecord[];
  kycTiers: KycTierInfo[];
  addTransaction: (tx: Omit<TransactionRecord, 'id' | 'timestamp'>) => TransactionRecord;
  withdrawCommission: () => Promise<boolean>;
  updateKycTier: (tier: 'Tier 1' | 'Tier 2' | 'Tier 3') => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  unreadNotifications: number;
  clearNotifications: () => void;
  // Theme
  themePreference: ThemePreference;
  effectiveTheme: 'dark' | 'light';
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  cycleTheme: () => void;
  /** Live palette that updates on theme change — use this in JSX inline styles */
  theme: PaletteType;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(MOCK_USER);
  const [mainBalance, setMainBalance] = useState<number>(14850.0);
  const [referralCommissionBalance, setReferralCommissionBalance] = useState<number>(0);
  const [isBalanceMasked, setIsBalanceMasked] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(MOCK_TRANSACTIONS);
  const [kycTiers, setKycTiers] = useState<KycTierInfo[]>(MOCK_KYC_TIERS);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(3);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [vtuPlans, setVtuPlans] = useState<Partial<Record<TelcoNetworkId, VtuPlan[]>>>({});
  const vtuPlansRef = useRef<Partial<Record<TelcoNetworkId, VtuPlan[]>>>({});

  const loadVtuPlans = useCallback(async (network: TelcoNetworkId, forceRefresh = false): Promise<VtuPlan[]> => {
    if (!forceRefresh && vtuPlansRef.current[network]) return vtuPlansRef.current[network] || [];

    const response = await apiGet<{ plans: VtuPlan[] }>(`/vtu/plans?network=${encodeURIComponent(network)}`);
    const plans = (response.plans || []).map((plan) => ({
      ...plan,
      label: String(plan.label || 'Data plan'),
      price: Number(plan.price || 0),
      code: String(plan.code || ''),
    }));
    vtuPlansRef.current = { ...vtuPlansRef.current, [network]: plans };
    setVtuPlans((previous) => ({ ...previous, [network]: plans }));
    return plans;
  }, []);

  const preloadVtuPlans = async () => {
    await Promise.allSettled(TELCO_LIST.map(({ id }) => loadVtuPlans(id)));
  };

  const refreshServerState = async (): Promise<boolean> => {
    if (!hasAuthToken()) {
      setSessionStatus('unauthenticated');
      return false;
    }

    try {
      const [meResponse, walletResponse, transactionsResponse] = await Promise.all([
        apiGet<{ user: Record<string, unknown> }>('/me'),
        apiGet<{ balance: number }>('/wallet'),
        apiGet<{ transactions: Array<Record<string, unknown>> }>('/transactions'),
      ]);
      const serverUser = meResponse.user;
      const phone = String(serverUser.phone || '');
      setUser((previous) => ({
        ...previous,
        id: String(serverUser.id || previous.id),
        name: String(serverUser.full_name || serverUser.fullName || previous.name),
        email: String(serverUser.email || ''),
        phone,
        referralCode: phone.replace(/[^0-9]/g, ''),
        referralCount: Number(serverUser.referralCount || 0),
        referralEarnings: Number(serverUser.referralEarnings || 0),
        tierLabel: serverUser.agent_status === 'verified' ? 'VERIFIED AGENT' : previous.tierLabel,
        biometricsEnabled: serverUser.biometrics_enabled !== false,
        appLockEnabled: serverUser.app_lock_enabled !== false,
      }));
      setMainBalance(Number(walletResponse.balance || 0));
      setReferralCommissionBalance(Number(serverUser.referralCommissionBalance || 0));
      setTransactions(transactionsResponse.transactions.map((transaction) => {
        const type = String(transaction.type || '').toUpperCase();
        const normalizedType: TransactionType = type === 'DEPOSIT' ? 'FUND_WALLET' :
          type === 'AIRTIME' ? 'AIRTIME' :
          type === 'DATA' ? 'DATA' :
          type === 'ELECTRICITY' ? 'ELECTRICITY' :
          type === 'CABLE_TV' ? 'CABLE_TV' : 'FUND_WALLET';
        const status = String(transaction.status || '').toUpperCase();
        return {
          id: String(transaction.id),
          reference: String(transaction.id),
          type: normalizedType,
          title: String(transaction.label || 'Wallet transaction'),
          description: String(transaction.label || 'Wallet transaction'),
          amount: Number(transaction.amount || 0),
          fee: 0,
          status: status === 'SUCCESS' ? 'SUCCESSFUL' : status === 'FAILED' ? 'FAILED' : 'PENDING',
          date: String(transaction.date || ''),
          timestamp: Date.parse(String(transaction.date || '')) || Date.now(),
          recipient: String(transaction.label || ''),
        };
      }));
      setSessionStatus('authenticated');
      void preloadVtuPlans();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) {
        console.warn('Could not load account state:', error.message);
      }
      setSessionStatus('unauthenticated');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setSessionStatus('unauthenticated');
    setUser(MOCK_USER);
    setMainBalance(0);
    setTransactions(MOCK_TRANSACTIONS);
    setUnreadNotifications(0);
    vtuPlansRef.current = {};
    setVtuPlans({});

    try {
      await apiPost('/logout', {});
    } catch (error) {
      console.warn('Logout request failed, continuing local sign-out:', error);
    } finally {
      clearAuthToken();
    }
  };

  useEffect(() => {
    void refreshServerState();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;

    const verifyPayment = async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await apiGet(`/payments/paystack/verify/${encodeURIComponent(reference)}`);
          await refreshServerState();
          window.localStorage.removeItem('abbakano_pending_payment');
          break;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 202 || attempt === 4) {
            if (error instanceof ApiError && error.status !== 202) {
              console.warn('Could not verify Paystack payment:', error.message);
            }
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    void verifyPayment();
  }, []);

  // ── Theme State ──────────────────────────────────────────────────────────────
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<'dark' | 'light'>(
    Appearance.getColorScheme() === 'light' ? 'light' : 'dark'
  );

  // Listen to OS theme changes in real-time
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => subscription.remove();
  }, []);

  const effectiveTheme: 'dark' | 'light' =
    themePreference === 'system' ? systemScheme : themePreference;

  // Immediately sync active theme mode for Proxy and helper utilities
  setActiveThemeMode(effectiveTheme);

  /** Live palette object — re-computed on every effectiveTheme change */
  const theme = getPalette(effectiveTheme);

  const cycleTheme = () => {
    setThemePreference((curr) => {
      if (curr === 'system') return 'dark';
      if (curr === 'dark') return 'light';
      return 'system';
    });
  };

  // ── Wallet Logic ─────────────────────────────────────────────────────────────
  const toggleBalanceMask = () => setIsBalanceMasked((prev) => !prev);

  const addTransaction = (txData: Omit<TransactionRecord, 'id' | 'timestamp'>): TransactionRecord => {
    const newTx: TransactionRecord = {
      ...txData,
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    if (newTx.type === 'FUND_WALLET') {
      setMainBalance((prev) => prev + newTx.amount);
    } else {
      setMainBalance((prev) => Math.max(0, prev - newTx.amount));
    }
    return newTx;
  };

  const withdrawCommission = async (): Promise<boolean> => {
    try {
      await apiPost('/referrals/commission/withdraw', {});
      await refreshServerState();
      return true;
    } catch (error) {
      if (error instanceof ApiError) console.warn('Could not withdraw referral commission:', error.message);
      return false;
    }
  };

  const updateKycTier = (tier: 'Tier 1' | 'Tier 2' | 'Tier 3') => {
    setUser((prev) => ({
      ...prev,
      kycTier: tier,
      tierLabel:
        tier === 'Tier 3'
          ? 'VIP Master Distributor'
          : tier === 'Tier 2'
          ? 'Tier 2 Verified Agent'
          : 'Basic Starter',
      agentDiscount: tier === 'Tier 3' ? 3.5 : tier === 'Tier 2' ? 2.5 : 1.0,
    }));
    setKycTiers((prev) => prev.map((t) => (t.tier === tier ? { ...t, status: 'active' } : t)));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated = { ...prev, ...profile };
      if (profile.phone && !profile.referralCode) {
        // Referral code is now user's registered phone number
        const cleanPhone = profile.phone.replace(/[^0-9]/g, '');
        updated.referralCode = cleanPhone.startsWith('234') && cleanPhone.length > 10
          ? '0' + cleanPhone.slice(3)
          : cleanPhone;
      }
      return updated;
    });
  };

  const clearNotifications = () => setUnreadNotifications(0);

  return (
    <AppContext.Provider
      value={{
        user,
        sessionStatus,
        refreshServerState,
        logout,
        vtuPlans,
        loadVtuPlans,
        mainBalance,
        referralCommissionBalance,
        isBalanceMasked,
        toggleBalanceMask,
        virtualAccounts: MOCK_VIRTUAL_ACCOUNTS,
        transactions,
        kycTiers,
        addTransaction,
        withdrawCommission,
        updateKycTier,
        updateUserProfile,
        unreadNotifications,
        clearNotifications,
        themePreference,
        effectiveTheme,
        isDark: effectiveTheme === 'dark',
        setThemePreference,
        cycleTheme,
        theme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

/**
 * Convenience hook: returns just the live theme palette.
 * Use this inside any component that needs dynamic colors.
 * Example: const T = useTheme();  <View style={{ backgroundColor: T.canvas }} />
 */
export function useTheme() {
  return useApp().theme;
}
