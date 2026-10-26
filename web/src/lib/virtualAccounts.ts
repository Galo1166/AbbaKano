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
export function getCachedVirtualAccounts(userId?: string): VirtualAccountResult | null {
  if (userId) {
    const cached = virtualAccountCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return { accounts: cached.accounts, requiresIdentity: false };
    }
    return null;
  }
  for (const cached of virtualAccountCache.values()) {
    if (cached && cached.expiresAt > Date.now()) {
      return { accounts: cached.accounts, requiresIdentity: false };
    }
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



export function formatBeneficiaryAccountName(rawAccountName?: string, userFullName?: string): string {
  const PREFIX = "ABBA KANO INVESTMENTS LMITED- ";
  const raw = (rawAccountName || "").trim();
  if (raw) {
    const namePart = raw
      .replace(/^ABBA\s*KANO\s*INVESTMENTS?\s*(?:LIMITED|LMITED)?\s*[-–:]*\s*/i, "")
      .replace(/^AbbaKano\s*[-–:]*\s*/i, "")
      .replace(/\s*\([^)]*\)$/, "")
      .trim();
    const first = namePart.split(/\s+/)[0] || "";
    if (first) {
      return `${PREFIX}${first.toUpperCase()}`;
    }
  }
  const fallbackFirst = (userFullName || "CUSTOMER").trim().split(/\s+/)[0] || "CUSTOMER";
  return `${PREFIX}${fallbackFirst.toUpperCase()}`;
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
    accountName: formatBeneficiaryAccountName(accountName),
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
  if (!identity && cached && cached.expiresAt > Date.now() && cached.accounts.length > 0) {
    return { accounts: cached.accounts, requiresIdentity: false };
  }
  if (cached) virtualAccountCache.delete(userId);

  const requestKey = `${userId}:${identity ? "create" : "load"}`;
  const pending = virtualAccountRequests.get(requestKey);
  if (pending) return pending;

  const checkDatabaseFallback = async (): Promise<VirtualAccount[]> => {
    try {
      const { data: tableData } = await supabase
        .from("user_virtual_accounts")
        .select("bank_name, account_number, account_name")
        .eq("user_id", userId);

      if (Array.isArray(tableData) && tableData.length > 0) {
        return tableData
          .map(normalizeVirtualAccount)
          .filter((account): account is VirtualAccount => account !== null);
      }
    } catch {
      // ignore table fallback failure
    }
    return [];
  };

  const body = identity ? { [identity.type]: identity.value } : {};

  // 10s timeout to prevent indefinite hangs
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out. Please try again.")), 10000)
  );

  const request = Promise.race([
    invokeSupabaseFunction<{
      accounts?: unknown;
      requiresIdentity?: boolean;
    }>("virtual-accounts", body),
    timeoutPromise
  ])
    .then(async (response) => {
      let accounts: VirtualAccount[] = [];
      if (Array.isArray(response.accounts)) {
        accounts = response.accounts
          .map(normalizeVirtualAccount)
          .filter((account): account is VirtualAccount => account !== null);
      }

      // If edge function returned 0 accounts, check database fallback
      if (accounts.length === 0 && !identity) {
        accounts = await checkDatabaseFallback();
      }

      if (accounts.length > 0) {
        virtualAccountCache.set(userId, {
          accounts,
          expiresAt: Date.now() + VIRTUAL_ACCOUNT_CACHE_TTL_MS,
        });
        return { accounts, requiresIdentity: false };
      }

      if (response.requiresIdentity === true) {
        return { accounts: [], requiresIdentity: true };
      }

      if (identity && accounts.length === 0) {
        throw new Error("No virtual accounts were returned. Please verify your details.");
      }

      return { accounts: [], requiresIdentity: true };
    })
    .catch(async (err) => {
      if (!identity) {
        const fallbackAccounts = await checkDatabaseFallback();
        if (fallbackAccounts.length > 0) {
          virtualAccountCache.set(userId, {
            accounts: fallbackAccounts,
            expiresAt: Date.now() + VIRTUAL_ACCOUNT_CACHE_TTL_MS,
          });
          return { accounts: fallbackAccounts, requiresIdentity: false };
        }
      }
      throw err;
    })
    .finally(() => {
      virtualAccountRequests.delete(requestKey);
    });

  virtualAccountRequests.set(requestKey, request);
  return request;
}
