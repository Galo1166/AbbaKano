import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance } from 'react-native';
import {
  VirtualAccount,
  TransactionRecord,
  KycTierInfo,
  MOCK_KYC_TIERS,
  MOCK_VIRTUAL_ACCOUNTS,
} from '@/constants/mockData';
import { getPalette, setActiveThemeMode, PaletteType } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth, AuthUser } from './AuthContext';

export type ThemePreference = 'system' | 'dark' | 'light';

interface AppContextType {
  user: AuthUser;
  mainBalance: number;
  referralCommissionBalance: number;
  isBalanceMasked: boolean;
  toggleBalanceMask: () => void;
  virtualAccounts: VirtualAccount[];
  transactions: TransactionRecord[];
  kycTiers: KycTierInfo[];
  refreshData: () => Promise<void>;
  withdrawCommission: () => Promise<boolean>;
  updateKycTier: (tier: KycTierInfo | KycTierInfo['tier']) => void;
  unreadNotifications: number;
  clearNotifications: () => void;
  // Theme
  themePreference: ThemePreference;
  effectiveTheme: 'dark' | 'light';
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  cycleTheme: () => void;
  theme: PaletteType;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapServerTx(tx: any): TransactionRecord {
  const typeMap: Record<string, string> = {
    deposit: 'FUND_WALLET',
    data: 'DATA',
    airtime: 'AIRTIME',
    electricity: 'ELECTRICITY',
    cable_tv: 'CABLE_TV',
    commission: 'FUND_WALLET',
  };
  const statusMap: Record<string, string> = {
    success: 'SUCCESSFUL',
    pending: 'PENDING',
    failed: 'FAILED',
  };
  const rawRef = tx.reference ?? tx.id;
  const refString = rawRef != null ? String(rawRef) : `TX-${Date.now()}`;
  return {
    id: String(tx.id ?? refString),
    reference: refString,
    type: (typeMap[tx.type] || 'DATA') as any,
    title: String(tx.label || tx.type || 'Transaction'),
    description: String(tx.label || ''),
    amount: Number(tx.amount || 0),
    fee: 0,
    status: (statusMap[tx.status] || 'PENDING') as any,
    date: tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-NG') : 'Recently',
    timestamp: tx.created_at ? new Date(tx.created_at).getTime() : Date.now(),
    recipient: String(tx.recipient || tx.account_number || ''),
  };
}

function mapServerVirtualAccount(raw: any): VirtualAccount {
  return {
    bankName: raw.bankName || raw.bank_name || 'Bank',
    accountNumber: raw.accountNumber || raw.account_number || '',
    accountName: raw.accountName || raw.account_name || '',
    recommended: true,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const contextUser: AuthUser = user || { id: 'guest', name: 'Guest', phone: '', email: null, role: 'user' };

  const [mainBalance, setMainBalance] = useState<number>(0);
  const [referralCommissionBalance, setReferralCommissionBalance] = useState<number>(0);
  const [isBalanceMasked, setIsBalanceMasked] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>(MOCK_VIRTUAL_ACCOUNTS);
  const [kycTiers, setKycTiers] = useState<KycTierInfo[]>(MOCK_KYC_TIERS);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  // ── Theme State ──────────────────────────────────────────────────────────
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<'dark' | 'light'>(
    Appearance.getColorScheme() === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => subscription.remove();
  }, []);

  const effectiveTheme: 'dark' | 'light' =
    themePreference === 'system' ? systemScheme : themePreference;
  setActiveThemeMode(effectiveTheme);
  const theme = getPalette(effectiveTheme);

  const cycleTheme = () => {
    setThemePreference((curr) => {
      if (curr === 'system') return 'dark';
      if (curr === 'dark') return 'light';
      return 'system';
    });
  };

  // ── Fetch live data from backend ─────────────────────────────────────────
  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const [walletRes, txRes, depositRes, referralRes] = await Promise.allSettled([
        supabase.from('wallets').select('balance_kobo').eq('user_id', user.id).maybeSingle(),
        supabase.from('vtu_transactions').select('id, transaction_type, amount_kobo, status, created_at, account_number').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('deposits').select('id, amount_kobo, status, created_at, reference').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.functions.invoke('referral-services', { body: { action: 'summary' } }),
      ]);

      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();

      const isPendingExpired = (status?: string, createdAt?: string | number) => {
        const s = String(status || '').toLowerCase();
        if (s !== 'pending') return false;
        if (!createdAt) return false;
        const time = typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime();
        return !isNaN(time) && now - time > ONE_HOUR_MS;
      };

      if (walletRes.status === 'fulfilled' && !walletRes.value.error) {
        setMainBalance(Number(walletRes.value.data?.balance_kobo || 0) / 100);
      }
      if (txRes.status === 'fulfilled' && !txRes.value.error) {
        const vtuTransactions = (txRes.value.data || [])
          .filter((tx) => !isPendingExpired(tx.status, tx.created_at))
          .map((tx) => mapServerTx({
            ...tx,
            type: String(tx.transaction_type || '').toLowerCase(),
            amount: Number(tx.amount_kobo || 0) / 100,
            label: tx.account_number || tx.transaction_type,
            reference: String(tx.id),
          }));

        const rawDeposits = depositRes.status === 'fulfilled' && !depositRes.value.error
          ? (depositRes.value.data || [])
          : [];

        // Any pending deposit older than 1 hour is considered abandoned/cancelled and disappears from the UI
        const deposits = rawDeposits
          .filter((deposit) => !isPendingExpired(deposit.status, deposit.created_at))
          .map((deposit) => mapServerTx({
            ...deposit,
            type: 'deposit',
            amount: Number(deposit.amount_kobo || 0) / 100,
            label: deposit.reference ? `Deposit (${deposit.reference})` : 'Wallet funding',
            reference: deposit.reference || deposit.id,
          }));

        // Proactively update expired pending deposits to cancelled in Supabase
        const expiredDepositIds = rawDeposits
          .filter((d) => isPendingExpired(d.status, d.created_at))
          .map((d) => d.id);
        if (expiredDepositIds.length > 0) {
          supabase.from('deposits').update({ status: 'cancelled' }).in('id', expiredDepositIds).then(undefined, () => {});
        }

        setTransactions([...vtuTransactions, ...deposits].sort((a, b) => b.timestamp - a.timestamp));
      }
      if (referralRes.status === 'fulfilled' && !referralRes.value.error) {
        const referralData = referralRes.value.data as { referralCommissionBalance?: number } | null;
        setReferralCommissionBalance(Number(referralData?.referralCommissionBalance || 0));
      }
    } catch {
      // Keep previous state on error
    }
  }, [user]);

  // Refresh when user logs in/out
  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setMainBalance(0);
      setTransactions([]);
      setVirtualAccounts([]);
    }
  }, [user, refreshData]);

  const toggleBalanceMask = () => setIsBalanceMasked((prev) => !prev);
  const clearNotifications = () => setUnreadNotifications(0);
  const withdrawCommission = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('referral-services', {
      body: { action: 'withdraw' },
    });
    if (error) return false;
    const result = data as { walletBalance?: number };
    setReferralCommissionBalance(0);
    if (typeof result?.walletBalance === 'number') setMainBalance(result.walletBalance);
    return true;
  }, []);
  const updateKycTier = useCallback((tier: KycTierInfo | KycTierInfo['tier']) => {
    setKycTiers((current) => typeof tier === 'string'
      ? current.map((item) => item.tier === tier ? { ...item, status: 'active' } : item)
      : current.map((item) => item.tier === tier.tier ? tier : item));
  }, []);

  return (
    <AppContext.Provider
      value={{
        user: contextUser,
        mainBalance,
        referralCommissionBalance,
        isBalanceMasked,
        toggleBalanceMask,
        virtualAccounts,
        transactions,
        kycTiers,
        refreshData,
        withdrawCommission,
        updateKycTier,
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

export function useTheme() {
  return useApp().theme;
}
