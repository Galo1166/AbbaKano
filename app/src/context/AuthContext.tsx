import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import {
  authenticateBiometric,
  getBiometricLogin,
  saveBiometricLogin,
  clearBiometricLogin,
} from '@/services/biometricService';

export interface AuthUser {
  id: string;
  fullName?: string;
  name?: string;
  phone: string;
  email?: string | null;
  username?: string;
  role: string;
  tierLabel?: string;
  referralCode?: string;
  referralCount?: number;
  referralEarnings?: number;
  referralCommissionBalance?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  hydrate: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  biometricLogin: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  updatePassword: (password: string) => Promise<void>;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  pin: string;
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const metadata = user.user_metadata || {};
  const phone = typeof metadata.phone === 'string' ? metadata.phone : '';
  const fullName = typeof metadata.full_name === 'string'
    ? metadata.full_name
    : typeof metadata.name === 'string'
      ? metadata.name
      : undefined;

  return {
    id: user.id,
    fullName,
    name: fullName,
    phone,
    email: user.email || null,
    username: user.email || phone,
    role: typeof metadata.role === 'string' ? metadata.role : 'user',
    referralCode: typeof metadata.referral_code === 'string' ? metadata.referral_code : undefined,
  };
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('234')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  if (!/^[789]\d{9}$/.test(local)) {
    throw new Error('Enter a valid Nigerian phone number.');
  }
  return `+234${local}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const hydrate = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setUser(null);
    } else {
      setUser(mapUser(data.user));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void hydrate();
    const applyRecoveryUrl = async (url: string | null) => {
      if (!url) return;
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        setIsPasswordRecovery(true);
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.error('Could not establish password recovery session:', error);
      }
    };
    void Linking.getInitialURL().then(applyRecoveryUrl);
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      void applyRecoveryUrl(url);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setUser(session?.user ? mapUser(session.user) : null);
      setIsLoading(false);
    });
    return () => {
      subscription.subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, [hydrate]);

  const login = useCallback(async (identifier: string, password: string) => {
    const normalizedIdentifier = identifier.trim();
    const credentials = normalizedIdentifier.includes('@')
      ? { email: normalizedIdentifier.toLowerCase(), password }
      : { phone: normalizePhone(normalizedIdentifier), password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error || !data.user) throw error || new Error('Sign in failed.');
    await saveBiometricLogin(normalizedIdentifier, password);
    setUser(mapUser(data.user));
  }, []);

  const biometricLogin = useCallback(async () => {
    await authenticateBiometric('Sign in to AbbaKano');
    const credentials = await getBiometricLogin();
    if (!credentials) throw new Error('Sign in with your email and password once before using biometrics.');
    const normalizedIdentifier = credentials.identifier.trim();
    const signInCredentials = normalizedIdentifier.includes('@')
      ? { email: normalizedIdentifier.toLowerCase(), password: credentials.password }
      : { phone: normalizePhone(normalizedIdentifier), password: credentials.password };
    const { data, error } = await supabase.auth.signInWithPassword(signInCredentials);
    if (error || !data.user) {
      await clearBiometricLogin();
      throw error || new Error('Biometric sign-in could not be completed.');
    }
    setUser(mapUser(data.user));
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const email = payload.email?.trim().toLowerCase();
    if (!email) throw new Error('Email address is required to create a Supabase account.');

    const { error: registrationError } = await supabase.functions.invoke('register-user', {
      body: {
        fullName: payload.fullName,
        phone: payload.phone,
        email,
        password: payload.password,
        pin: payload.pin,
        referralCode: payload.referralCode,
      },
    });
    if (registrationError) throw registrationError;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: payload.password,
    });
    if (error || !data.user) throw error || new Error('Account created, but sign in failed.');
    await saveBiometricLogin(email, payload.password);
    setUser(mapUser(data.user));
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<string> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      throw new Error('Enter the email address linked to your account to reset your password.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: Linking.createURL('reset-password'),
    });
    if (error) throw error;
    return 'Password reset instructions have been sent. Open the email link in this app to choose a new password.';
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setIsPasswordRecovery(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isPasswordRecovery, hydrate, login, biometricLogin, register, logout, requestPasswordReset, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
