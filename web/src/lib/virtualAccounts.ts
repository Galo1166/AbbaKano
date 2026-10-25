import { invokeSupabaseFunction, supabase } from "@/lib/supabase";

export interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export type VirtualAccountIdentity = {
  type: "bvn" | "nin";
  value: string;
};

export interface VirtualAccountResult {
  accounts: VirtualAccount[];
  requiresIdentity: boolean;
}

const VIRTUAL_ACCOUNT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — DVAs don't change
const virtualAccountCache = new Map<string, { accounts: VirtualAccount[]; expiresAt: number }>();
const virtualAccountRequests = new Map<string, Promise<VirtualAccountResult>>();

/**
 * Synchronously returns cached virtual accounts for the given userId,
 * or null if the cache is empty / expired. Used to skip loading spinners.
 */
export function getCachedVirtualAccounts(userId: string): VirtualAccountResult | null {
  const cached = virtualAccountCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { accounts: cached.accounts, requiresIdentity: false };
  }
  return null;
}

/**
 * Fire-and-forget prefetch — call on app/dashboard mount so accounts are
 * ready by the time the user opens Fund Wallet.
 */
export function preloadVirtualAccounts(): void {
  void fetchVirtualAccounts().catch(() => {
    // Silently swallow — this is a background optimization only
  });
}


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

export async function fetchVirtualAccounts(
  identity?: VirtualAccountIdentity,
): Promise<VirtualAccountResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session) throw new Error("Authentication required to load virtual accounts.");

  const userId = session.user.id;
  const cached = virtualAccountCache.get(userId);
  if (!identity && cached && cached.expiresAt > Date.now()) {
    return { accounts: cached.accounts, requiresIdentity: false };
  }
  if (cached) virtualAccountCache.delete(userId);

  const requestKey = `${userId}:${identity ? "create" : "load"}`;
  const pending = virtualAccountRequests.get(requestKey);
  if (pending) return pending;

  const body = identity ? { [identity.type]: identity.value } : {};
  const request = invokeSupabaseFunction<{
    accounts?: unknown;
    requiresIdentity?: boolean;
  }>("virtual-accounts", body)
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

      if (response.requiresIdentity === true) {
        return { accounts, requiresIdentity: true };
      }
      if (identity && accounts.length === 0) {
        throw new Error("No virtual accounts were returned. Please try again.");
      }

      if (accounts.length > 0) {
        virtualAccountCache.set(userId, {
          accounts,
          expiresAt: Date.now() + VIRTUAL_ACCOUNT_CACHE_TTL_MS,
        });
      }
      return { accounts, requiresIdentity: false };
    })
    .finally(() => virtualAccountRequests.delete(requestKey));

  virtualAccountRequests.set(requestKey, request);
  return request;
}
