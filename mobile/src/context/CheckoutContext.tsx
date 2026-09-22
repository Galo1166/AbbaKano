import React, { createContext, useContext, useState } from 'react';
import { TransactionRecord, TransactionType } from '@/constants/mockData';
import { TelcoNetworkId } from '@/constants/telco';
import { useApp } from './AppContext';
import { apiPost, createIdempotencyKey, ApiError } from '@/lib/api';
import { saveTransactionPin } from '@/lib/biometricAuth';

export interface CheckoutDraft {
  type: TransactionType;
  title: string;
  serviceName: string;
  network?: TelcoNetworkId | string;
  recipient: string;
  planName?: string;
  planCode?: string;
  planToken?: string;
  provider?: 'vtpass' | 'smeplug';
  amount: number;
  fee: number;
  billerName?: string;
  units?: string;
  onSuccess?: () => void;
}

interface CheckoutContextType {
  isSheetOpen: boolean;
  isPinModalOpen: boolean;
  pinError: string | null;
  isReceiptOpen: boolean;
  paymentSuccessCount: number;
  draft: CheckoutDraft | null;
  activeReceipt: TransactionRecord | null;
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
  const { refreshServerState } = useApp();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [paymentSuccessCount, setPaymentSuccessCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<TransactionRecord | null>(null);

  const startCheckout = (newDraft: CheckoutDraft) => {
    setDraft(newDraft);
    setIsSheetOpen(true);
    setIsPinModalOpen(false);
    setPinError(null);
    setIsReceiptOpen(false);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
  };

  const proceedToPin = () => {
    setIsSheetOpen(false);
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const cancelPin = () => {
    setIsPinModalOpen(false);
    setPinError(null);
  };

  const verifyPinAndExecute = async (pin: string): Promise<boolean> => {
    if (!draft) return false;
    setPinError(null);
    if (!/^\d{4}$/.test(pin)) {
      setPinError('Enter your 4-digit transaction PIN.');
      return false;
    }

    const endpoint = draft.type === 'DATA' ? '/vtu/data' :
      draft.type === 'AIRTIME' ? '/vtu/airtime' :
      draft.type === 'ELECTRICITY' ? '/vtu/electricity' : '/vtu/cable_tv';

    try {
      const response = await apiPost<{
        status: 'success' | 'pending';
        reference: string;
        message?: string;
      }>(endpoint, {
        network: draft.network,
        phone: draft.recipient,
        amount: draft.amount,
        planCode: draft.planCode,
        planToken: draft.planToken,
        pin,
      }, { idempotencyKey: createIdempotencyKey() });

      await refreshServerState();
      await saveTransactionPin(pin).catch(() => {});
      const newTx: TransactionRecord = {
        id: response.reference,
        reference: response.reference,
        type: draft.type,
        title: draft.title,
        description: `${draft.serviceName} to ${draft.recipient}`,
        amount: draft.amount,
        fee: draft.fee,
        status: response.status === 'success' ? 'SUCCESSFUL' : 'PENDING',
        date: 'Just now',
        timestamp: Date.now(),
        network: draft.network,
        recipient: draft.recipient,
        billerName: draft.billerName,
        units: draft.units,
      };
      draft.onSuccess?.();
      setPaymentSuccessCount((prev) => prev + 1);
      setActiveReceipt(newTx);
      setIsPinModalOpen(false);
      setIsReceiptOpen(true);
      return true;
    } catch (error) {
      console.warn('VTU purchase failed:', error);
      const message = error instanceof ApiError ? error.message : 'Could not authorize this purchase.';
      if (error instanceof ApiError) console.warn(error.message);
      setPinError(message);
      return false;
    }
  };

  const closeReceipt = () => {
    setIsReceiptOpen(false);
    setDraft(null);
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
        pinError,
        isReceiptOpen,
        paymentSuccessCount,
        draft,
        activeReceipt,
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
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
}
