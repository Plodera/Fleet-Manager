import { beforeEach, describe, expect, it, vi } from "vitest";
import { maskEmailAddress, sanitizeEmailProviderError } from "./email";

describe("sanitizeEmailProviderError", () => {
  it("masks email addresses in provider errors", () => {
    expect(sanitizeEmailProviderError(new Error("Mailbox admin@example.com rejected the message"))).toBe(
      "Mailbox a***@example.com rejected the message",
    );
  });

  it("redacts credentials and bearer tokens from provider messages", () => {
    const result = sanitizeEmailProviderError(
      new Error("client_secret=super-secret Authorization: Bearer abc.def.ghi https://user:password@mail.example.com failed"),
    );
    expect(result).not.toContain("super-secret");
    expect(result).not.toContain("abc.def.ghi");
    expect(result).not.toContain("user:password");
    expect(result).toContain("[redacted]");
  });

  it("redacts quoted JSON secrets and common API key labels", () => {
    const result = sanitizeEmailProviderError(
      new Error('{"client_secret":"json-secret","api_key":"api-secret"} X-Api-Key=header-secret client secret plain-secret'),
    );
    expect(result).not.toContain("json-secret");
    expect(result).not.toContain("api-secret");
    expect(result).not.toContain("header-secret");
    expect(result).not.toContain("plain-secret");
  });

  it("redacts credentials introduced by natural-language connector words", () => {
    const result = sanitizeEmailProviderError(
      new Error("password is hunter2; client secret was abc123; API key provided xyz789"),
    );
    expect(result).not.toContain("hunter2");
    expect(result).not.toContain("abc123");
    expect(result).not.toContain("xyz789");
  });
});

describe("email provider error sinks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the sanitizer for unknown error values", () => {
    expect(sanitizeEmailProviderError({ client_secret: "not-visible" })).toBe("Unknown email provider error");
  });
});

describe("maskEmailAddress", () => {
  it("keeps the first local-part character and domain", () => {
    expect(maskEmailAddress("Admin@Example.com")).toBe("a***@example.com");
  });

  it("does not return malformed addresses", () => {
    expect(maskEmailAddress("not-an-address")).toBe("***");
  });
});