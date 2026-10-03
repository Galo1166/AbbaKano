import React, { createContext, useContext, useState, useCallback } from 'react';
import { TransactionRecord, TransactionType } from '@/constants/mockData';
import { TelcoNetworkId } from '@/constants/telco';
import { ApiError, createIdempotencyKey } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useApp } from './AppContext';

export interface CheckoutDraft {
  type: TransactionType;
  title: string;
  serviceName: string;
  network?: TelcoNetworkId;
  recipient: string;
  planName?: string;
  amount: number;
  fee: number;
  billerName?: string;
  units?: string;
  /** Backend-encoded plan token (from /vtu/plans or /vtu/service-plans) */
  planToken?: string;
  /** Meter / smartcard / decoder number for electricity & cable */
  meterNumber?: string;
  /** Electricity meter type (prepaid / postpaid) */
  meterType?: string;
  onSuccess?: () => void;
}

interface CheckoutContextType {
  isSheetOpen: boolean;
  isPinModalOpen: boolean;
  isReceiptOpen: boolean;
  paymentSuccessCount: number;
  draft: CheckoutDraft | null;
  activeReceipt: TransactionRecord | null;
  purchaseError: string | null;
  startCheckout: (draft: CheckoutDraft) => void;
  closeSheet: () => void;
  proceedToPin: () => void;
  cancelPin: () => void;
  verifyPinAndExecute: (pin: string) => Promise<boolean>;
  closeReceipt: () => void;
  quickRepeatLast: () => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refreshData } = useApp();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [paymentSuccessCount, setPaymentSuccessCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<TransactionRecord | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const startCheckout = (newDraft: CheckoutDraft) => {
    setDraft(newDraft);
    setPurchaseError(null);
    setIsSheetOpen(true);
    setIsPinModalOpen(false);
    setIsReceiptOpen(false);
  };

  const closeSheet = () => setIsSheetOpen(false);

  const proceedToPin = () => {
    setIsSheetOpen(false);
    setIsPinModalOpen(true);
  };

  const cancelPin = () => setIsPinModalOpen(false);

  const verifyPinAndExecute = useCallback(async (pin: string): Promise<boolean> => {
    if (!draft || pin.length !== 4) return false;
    setPurchaseError(null);

    try {
      const typeToFunction: Record<TransactionType, string> = {
        DATA: 'data-purchase',
        AIRTIME: 'purchase-airtime',
        ELECTRICITY: 'electricity-purchase',
        CABLE_TV: 'cable-purchase',
        FUND_WALLET: 'data-purchase',
      };

      const functionName = typeToFunction[draft.type];
      if (!functionName || draft.type === 'FUND_WALLET') return false;

      const idempotencyKey = createIdempotencyKey();

      // Build the body based on transaction type
      const body: Record<string, unknown> = {
        pin,
        phone: draft.recipient,
        amount: draft.amount,
        network: draft.network?.toUpperCase(),
        idempotencyKey,
        selectionToken: draft.planToken,
      };

      if (draft.planToken) body.planToken = draft.planToken;
      if (draft.meterNumber && draft.type === 'ELECTRICITY') body.meterNumber = draft.meterNumber;
      if (draft.meterNumber && draft.type === 'CABLE_TV') body.smartcardNumber = draft.meterNumber;
      if (draft.meterType) body.meterType = draft.meterType;
      if (draft.type === 'CABLE_TV' && draft.billerName) body.provider = draft.billerName;
      if (draft.type === 'ELECTRICITY' && draft.network) body.provider = draft.network;

      const { data: result, error } = await supabase.functions.invoke<{
        reference?: string;
        status?: string;
        token?: string;
        message?: string;
      }>(functionName, { body });
      if (error) throw error;
      if (!result) throw new Error('We could not confirm your purchase. Please check your transaction history.');

      const txStatusMap: Record<string, 'SUCCESSFUL' | 'PENDING' | 'FAILED'> = {
        success: 'SUCCESSFUL',
        pending: 'PENDING',
        failed: 'FAILED',
      };

      const newTx: TransactionRecord = {
        id: result.reference || `tx-${Date.now()}`,
        reference: result.reference || `ABK-${Date.now()}`,
        type: draft.type,
        title: draft.title,
        description: `${draft.serviceName} to ${draft.recipient}`,
        amount: draft.amount,
        fee: draft.fee,
        status: txStatusMap[result.status || 'success'] || 'SUCCESSFUL',
        date: 'Just now',
        timestamp: Date.now(),
        network: draft.network,
        recipient: draft.recipient,
        billerName: draft.billerName,
        token: result.token,
        units: draft.units,
      };

      setActiveReceipt(newTx);
      setIsPinModalOpen(false);
      setIsReceiptOpen(true);
      setPaymentSuccessCount((prev) => prev + 1);

      // Refresh wallet balance & transactions in the background
      refreshData().catch(() => {});

      if (draft.onSuccess) {
        try { draft.onSuccess(); } catch {}
      }
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Purchase failed. Please try again.';
      setPurchaseError(msg);
      return false;
    }
  }, [draft, refreshData]);

  const closeReceipt = () => {
    setIsReceiptOpen(false);
    setDraft(null);
    setPurchaseError(null);
  };

  const quickRepeatLast = () => {
    if (activeReceipt) {
      setIsReceiptOpen(false);
      startCheckout({
        type: activeReceipt.type,
        title: activeReceipt.title,
        serviceName: activeReceipt.title,
        network: activeReceipt.network,
        recipient: activeReceipt.recipient,
        amount: activeReceipt.amount,
        fee: activeReceipt.fee,
        billerName: activeReceipt.billerName,
      });
    }
  };

  return (
    <CheckoutContext.Provider
      value={{
        isSheetOpen,
        isPinModalOpen,
        isReceiptOpen,
        paymentSuccessCount,
        draft,
        activeReceipt,
        purchaseError,
        startCheckout,
        closeSheet,
        proceedToPin,
        cancelPin,
        verifyPinAndExecute,
        closeReceipt,
        quickRepeatLast,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckout must be used within a CheckoutProvider');
  return context;
}
