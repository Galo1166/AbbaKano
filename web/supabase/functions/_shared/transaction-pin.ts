function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) {
    throw new Error("Invalid transaction PIN salt.");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeHexEqual(actual: string, expected: string): boolean {
  if (
    !/^[0-9a-fA-F]+$/.test(actual) ||
    !/^[0-9a-fA-F]+$/.test(expected) ||
    actual.length !== expected.length
  ) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyTransactionPinHash(
  pin: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  if (!/^[0-9a-fA-F]+$/.test(expectedHash)) return false;

  if (expectedHash.length === 64) {
    const passwordBytes = new TextEncoder().encode(pin);
    const saltBytes = hexToBytes(salt);
    const input = new Uint8Array(passwordBytes.length + saltBytes.length);
    input.set(passwordBytes);
    input.set(saltBytes, passwordBytes.length);
    const digest = await crypto.subtle.digest("SHA-256", input);
    return safeHexEqual(bytesToHex(new Uint8Array(digest)), expectedHash);
  }

  if (expectedHash.length !== 128) return false;
  const { scrypt } = await import("npm:@noble/hashes@2.4.0/scrypt.js");
  const digest = scrypt(
    new TextEncoder().encode(pin),
    new TextEncoder().encode(salt),
    { N: 16384, r: 8, p: 1, dkLen: 64 },
  );
  if (safeHexEqual(bytesToHex(digest), expectedHash)) return true;

  const legacyDigest = scrypt(
    new TextEncoder().encode(pin),
    hexToBytes(salt),
    { N: 16384, r: 8, p: 1, dkLen: 64 },
  );
  return safeHexEqual(bytesToHex(legacyDigest), expectedHash);
}
