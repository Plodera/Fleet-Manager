import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptCredential, encryptCredential } from "./credentialEncryption";

describe("credential encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts a credential without storing its plaintext value", () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
    const encrypted = encryptCredential("graph-client-secret");

    expect(encrypted).not.toContain("graph-client-secret");
    expect(decryptCredential(encrypted)).toBe("graph-client-secret");
  });

  it("cannot decrypt a credential after the encryption key changes", () => {
    vi.stubEnv("SESSION_SECRET", "first-session-secret");
    const encrypted = encryptCredential("graph-client-secret");
    vi.stubEnv("SESSION_SECRET", "different-session-secret");

    expect(() => decryptCredential(encrypted)).toThrow();
  });
});