export type DataPlanSelection = {
  provider: "vtugate";
  network: string;
  label: string;
  serviceId: string;
  planCode: string;
  price: number;
  accountNumber?: string;
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
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
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

export async function createDataPlanToken(
  selection: Omit<DataPlanSelection, "expiresAt">,
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

export async function verifyDataPlanToken(
  token: string,
  secret: string,
  requestedNetwork: string,
): Promise<DataPlanSelection | null> {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  try {
    const expectedSignature = await sign(payload, secret);
    const actualSignature = decodeBase64Url(signature);
    if (
      actualSignature.length !== expectedSignature.length ||
      actualSignature.some((byte, index) => byte !== expectedSignature[index])
    ) {
      return null;
    }

    const selection = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as DataPlanSelection;
    if (
      selection.provider !== "vtugate" ||
      selection.network !== requestedNetwork ||
      typeof selection.label !== "string" ||
      !selection.label.trim() ||
      !/^\d+$/.test(selection.serviceId) ||
      !selection.planCode ||
      (selection.accountNumber !== undefined &&
        !/^\d{8,14}$/.test(selection.accountNumber)) ||
      !Number.isFinite(selection.price) ||
      (selection.price <= 0 &&
        !(
          ["AEDC", "IKEDC", "KEDCO", "PHED", "JED"].includes(selection.network) &&
          selection.price === 0 &&
          selection.planCode.endsWith(":prepaid") &&
          Boolean(selection.accountNumber)
        )) ||
      selection.price > 100000 ||
      selection.expiresAt < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return selection;
  } catch {
    return null;
  }
}
