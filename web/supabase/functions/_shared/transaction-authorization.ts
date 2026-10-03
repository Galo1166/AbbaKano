export type TransactionAuthorization = {
  userId: string;
  challenge: string;
  expiresAt: number;
  purchase: {
    network: string;
    phone: string;
    selectionToken: string;
    purchaseType?: string;
    amount?: number;
  };
};

export type AuthorizedPurchase = TransactionAuthorization["purchase"];

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );
}

export async function createTransactionAuthorization(
  authorization: Omit<TransactionAuthorization, "expiresAt">,
  secret: string,
): Promise<string> {
  const payload = encodeBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...authorization,
        expiresAt: Math.floor(Date.now() / 1000) + 120,
      }),
    ),
  );
  return `${payload}.${encodeBase64Url(await signature(payload, secret))}`;
}

export async function verifyTransactionAuthorization(
  token: string,
  expectedUserId: string,
  secret: string,
  expectedPurchase: AuthorizedPurchase,
): Promise<TransactionAuthorization | null> {
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;

  try {
    const expectedSignature = await signature(payload, secret);
    const actualSignature = decodeBase64Url(providedSignature);
    if (
      actualSignature.length !== expectedSignature.length ||
      actualSignature.some((byte, index) => byte !== expectedSignature[index])
    ) {
      return null;
    }

    const authorization = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as TransactionAuthorization;
    if (
      authorization.userId !== expectedUserId ||
      typeof authorization.challenge !== "string" ||
      authorization.purchase?.network !== expectedPurchase.network ||
      authorization.purchase?.phone !== expectedPurchase.phone ||
      authorization.purchase?.selectionToken !== expectedPurchase.selectionToken ||
        (expectedPurchase.purchaseType !== undefined &&
          authorization.purchase?.purchaseType !== expectedPurchase.purchaseType) ||
      (expectedPurchase.amount !== undefined &&
        authorization.purchase?.amount !== expectedPurchase.amount) ||
      authorization.expiresAt < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return authorization;
  } catch {
    return null;
  }
}
