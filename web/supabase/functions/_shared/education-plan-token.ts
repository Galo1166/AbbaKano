export type EducationPlanSelection = {
  billerSlug: string;
  billerName: string;
  productId: string;
  productName: string;
  unitPrice: number;
  expiresAt: number;
};

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
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
}

export async function createEducationPlanToken(
  selection: Omit<EducationPlanSelection, "expiresAt">,
  secret: string,
): Promise<string> {
  const payload = encodeBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...selection,
        expiresAt: Math.floor(Date.now() / 1000) + 900,
      }),
    ),
  );
  return `${payload}.${encodeBase64Url(await sign(payload, secret))}`;
}

export async function verifyEducationPlanToken(
  token: string,
  secret: string,
): Promise<EducationPlanSelection | null> {
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;

  try {
    const expectedSignature = await sign(payload, secret);
    const actualSignature = decodeBase64Url(providedSignature);
    if (
      actualSignature.length !== expectedSignature.length ||
      actualSignature.some((byte, index) => byte !== expectedSignature[index])
    ) {
      return null;
    }

    const selection = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as EducationPlanSelection;
    if (
      !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(selection.billerSlug) ||
      !selection.billerName.trim() ||
      !selection.productId.trim() ||
      !selection.productName.trim() ||
      !Number.isFinite(selection.unitPrice) ||
      selection.unitPrice <= 0 ||
      selection.unitPrice > 100000 ||
      !Number.isSafeInteger(selection.expiresAt) ||
      selection.expiresAt < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return selection;
  } catch {
    return null;
  }
}
