import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required to securely store Microsoft Graph credentials.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptCredential(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptCredential(value: string): string {
  const [version, ivValue, authTagValue, encryptedValue] = value.split(".");
  if (version !== VERSION || !ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Stored Microsoft Graph client secret is invalid.");
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
