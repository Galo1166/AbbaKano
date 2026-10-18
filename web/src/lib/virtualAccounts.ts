import { invokeSupabaseFunction, supabase } from "@/lib/supabase";

export interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

const VIRTUAL_ACCOUNT_CACHE_TTL_MS = 5 * 60 * 1000;
const virtualAccountCache = new Map<string, { accounts: VirtualAccount[]; expiresAt: number }>();
const virtualAccountRequests = new Map<string, Promise<VirtualAccount[]>>();

function normalizeVirtualAccount(value: unknown): VirtualAccount | null {
  if (!value || typeof value !== "object") return null;

  const account = value as Record<string, unknown>;
  const bankName = account.bankName ?? account.bank_name;
  const accountNumber = account.accountNumber ?? account.account_number;
  const accountName = account.accountName ?? account.account_name;

  if (
    typeof bankName !== "string" ||
    typeof accountNumber !== "string" ||
    typeof accountName !== "string" ||
    !bankName.trim() ||
    !accountNumber.trim() ||
    !accountName.trim()
  ) {
    return null;
  }

  return {
    bankName: bankName.trim(),
    accountNumber: accountNumber.trim(),
    accountName: accountName.trim(),
  };
}

export async function fetchVirtualAccounts(): Promise<VirtualAccount[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session) throw new Error("Authentication required to load virtual accounts.");

  const userId = session.user.id;
  const cached = virtualAccountCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.accounts;
  if (cached) virtualAccountCache.delete(userId);

  const pending = virtualAccountRequests.get(userId);
  if (pending) return pending;

  const request = invokeSupabaseFunction<{ accounts?: unknown }>("virtual-accounts", {})
    .then((response) => {
      if (!Array.isArray(response.accounts)) {
        throw new Error("The virtual account response was invalid.");
      }

      const accounts = response.accounts
        .map(normalizeVirtualAccount)
        .filter((account): account is VirtualAccount => account !== null);

      if (accounts.length !== response.accounts.length) {
        throw new Error("The virtual account details could not be read.");
      }

      virtualAccountCache.set(userId, {
        accounts,
        expiresAt: Date.now() + VIRTUAL_ACCOUNT_CACHE_TTL_MS,
      });
      return accounts;
    })
    .finally(() => virtualAccountRequests.delete(userId));

  virtualAccountRequests.set(userId, request);
  return request;
}
