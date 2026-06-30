import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter } from "./rateLimiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  afterEach(() => {
    limiter?.destroy();
    vi.useRealTimers();
  });

  describe("check() — requests within limit pass", () => {
    beforeEach(() => {
      limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
    });

    it("allows the first request for a new key", () => {
      expect(limiter.check("user-1")).toBe(true);
    });

    it("allows requests up to maxRequests within the window", () => {
      expect(limiter.check("user-1")).toBe(true);
      expect(limiter.check("user-1")).toBe(true);
      expect(limiter.check("user-1")).toBe(true);
    });

    it("tracks different keys independently", () => {
      expect(limiter.check("user-a")).toBe(true);
      expect(limiter.check("user-b")).toBe(true);
      expect(limiter.check("user-a")).toBe(true);
      expect(limiter.check("user-b")).toBe(true);
    });
  });

  describe("check() — requests over limit are blocked", () => {
    beforeEach(() => {
      limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
    });

    it("blocks the request that exceeds maxRequests", () => {
      limiter.check("user-1");
      limiter.check("user-1");
      limiter.check("user-1");
      expect(limiter.check("user-1")).toBe(false);
    });

    it("continues blocking on subsequent requests within the same window", () => {
      for (let i = 0; i < 5; i++) limiter.check("user-1");
      expect(limiter.check("user-1")).toBe(false);
    });

    it("only blocks the key that exceeded the limit, not other keys", () => {
      limiter.check("user-1");
      limiter.check("user-1");
      limiter.check("user-1");
      limiter.check("user-1");
      expect(limiter.check("user-2")).toBe(true);
    });
  });

  describe("window resets correctly after TTL", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3, sweepIntervalMs: 60_000 });
    });

    it("resets the counter after the window expires", () => {
      limiter.check("user-1");
      limiter.check("user-1");
      limiter.check("user-1");
      expect(limiter.check("user-1")).toBe(false);

      vi.advanceTimersByTime(1001);

      expect(limiter.check("user-1")).toBe(true);
    });

    it("starts a fresh window after reset, allowing maxRequests again", () => {
      for (let i = 0; i < 3; i++) limiter.check("user-1");

      vi.advanceTimersByTime(1001);

      expect(limiter.check("user-1")).toBe(true);
      expect(limiter.check("user-1")).toBe(true);
      expect(limiter.check("user-1")).toBe(true);
      expect(limiter.check("user-1")).toBe(false);
    });

    it("does not reset early (before TTL)", () => {
      for (let i = 0; i < 3; i++) limiter.check("user-1");

      vi.advanceTimersByTime(500);

      expect(limiter.check("user-1")).toBe(false);
    });
  });

  describe("isLimited() — non-mutating limit check", () => {
    beforeEach(() => {
      limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
    });

    it("returns false for a key that has not been seen", () => {
      expect(limiter.isLimited("unknown")).toBe(false);
    });

    it("returns false when under the limit", () => {
      limiter.consume("user-1");
      limiter.consume("user-1");
      expect(limiter.isLimited("user-1")).toBe(false);
    });

    it("returns true once the count reaches maxRequests", () => {
      limiter.consume("user-1");
      limiter.consume("user-1");
      limiter.consume("user-1");
      expect(limiter.isLimited("user-1")).toBe(true);
    });

    it("does not increment the counter", () => {
      limiter.consume("user-1");
      limiter.consume("user-1");
      limiter.isLimited("user-1");
      limiter.isLimited("user-1");
      expect(limiter.isLimited("user-1")).toBe(false);
    });
  });

  describe("consume() — selective counting", () => {
    beforeEach(() => {
      limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
    });

    it("starts a new entry on first consume", () => {
      limiter.consume("user-1");
      expect(limiter.isLimited("user-1")).toBe(false);
    });

    it("accumulates counts across multiple consume calls", () => {
      limiter.consume("user-1");
      limiter.consume("user-1");
      limiter.consume("user-1");
      expect(limiter.isLimited("user-1")).toBe(true);
    });
  });

  describe("sweep() — expired entries are removed from memory", () => {
    function internalMap(rl: RateLimiter): Map<string, unknown> {
      return (rl as unknown as { map: Map<string, unknown> }).map;
    }

    it("removes expired entries from the internal map when sweep fires", () => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ windowMs: 300, maxRequests: 5, sweepIntervalMs: 200 });

      limiter.check("user-sweep");
      expect(internalMap(limiter).has("user-sweep")).toBe(true);

      vi.advanceTimersByTime(600);

      expect(internalMap(limiter).has("user-sweep")).toBe(false);
    });

    it("entry remains in map before it expires even though isLimited returns false", () => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3, sweepIntervalMs: 60_000 });

      limiter.check("user-pre-sweep");

      vi.advanceTimersByTime(1100);

      expect(internalMap(limiter).has("user-pre-sweep")).toBe(true);
    });

    it("does not remove entries that are still within their window", () => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ windowMs: 2000, maxRequests: 5, sweepIntervalMs: 200 });

      limiter.consume("user-alive");
      limiter.consume("user-alive");
      limiter.consume("user-alive");
      limiter.consume("user-alive");
      limiter.consume("user-alive");

      vi.advanceTimersByTime(400);

      expect(internalMap(limiter).has("user-alive")).toBe(true);
      expect(limiter.isLimited("user-alive")).toBe(true);
    });

    it("map size shrinks after sweep removes expired entries", () => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ windowMs: 300, maxRequests: 10, sweepIntervalMs: 200 });

      limiter.check("key-a");
      limiter.check("key-b");
      limiter.check("key-c");
      expect(internalMap(limiter).size).toBe(3);

      vi.advanceTimersByTime(600);

      expect(internalMap(limiter).size).toBe(0);
    });

    it("resets a swept key's counter to 1 on next access (fresh window)", () => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ windowMs: 300, maxRequests: 2, sweepIntervalMs: 100 });

      limiter.consume("user-1");
      limiter.consume("user-1");
      expect(limiter.isLimited("user-1")).toBe(true);

      vi.advanceTimersByTime(500);

      expect(internalMap(limiter).has("user-1")).toBe(false);
      expect(limiter.check("user-1")).toBe(true);
      expect(internalMap(limiter).has("user-1")).toBe(true);
    });
  });

  describe("destroy()", () => {
    it("clears all entries and stops the sweep timer", () => {
      limiter = new RateLimiter({ windowMs: 1000, maxRequests: 2 });
      limiter.consume("user-1");
      limiter.consume("user-1");
      limiter.destroy();
      expect(limiter.isLimited("user-1")).toBe(false);
    });
  });
});
