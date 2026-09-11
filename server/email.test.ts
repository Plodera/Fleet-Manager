import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransportMock, getEmailSettingsMock, healthState, sendMailMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const healthState = { current: undefined as any };
  return {
    createTransportMock: vi.fn(() => ({ sendMail: sendMailMock })),
    getEmailSettingsMock: vi.fn(),
    healthState,
    sendMailMock,
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

vi.mock("./storage", () => ({
  storage: {
    getEmailSettings: getEmailSettingsMock,
    getEmailDeliveryHealth: vi.fn(async () => healthState.current),
    recordEmailDeliveryFailure: vi.fn(async (error: string, threshold: number) => {
      const now = new Date();
      const consecutiveFailures = (healthState.current?.consecutiveFailures ?? 0) + 1;
      healthState.current = {
        id: 1,
        consecutiveFailures,
        warningSince: consecutiveFailures >= threshold
          ? (healthState.current?.warningSince ?? now)
          : null,
        lastFailureAt: now,
        lastSuccessAt: healthState.current?.lastSuccessAt ?? null,
        lastError: error,
        updatedAt: now,
      };
      return healthState.current;
    }),
    recordEmailDeliverySuccess: vi.fn(async () => {
      const now = new Date();
      healthState.current = {
        id: 1,
        consecutiveFailures: 0,
        warningSince: null,
        lastFailureAt: healthState.current?.lastFailureAt ?? null,
        lastSuccessAt: now,
        lastError: null,
        updatedAt: now,
      };
      return healthState.current;
    }),
    resetEmailDeliveryHealth: vi.fn(async () => {
      healthState.current = undefined;
    }),
  },
}));

import {
  EMAIL_DELIVERY_FAILURE_THRESHOLD,
  getEmailDeliveryHealth,
  sendTestEmail,
} from "./email";

const graphSettings = {
  id: 1,
  provider: "microsoft_graph",
  smtpHost: "",
  smtpPort: 465,
  smtpUser: "",
  smtpPass: "",
  smtpSecure: true,
  fromName: "FleetCmd",
  fromEmail: "fleet@example.com",
  enabled: true,
  updatedAt: new Date(),
};

const smtpSettings = {
  ...graphSettings,
  provider: "smtp",
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  smtpUser: "fleet@example.com",
  smtpPass: "smtp-password",
  smtpSecure: false,
};

function mockJsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  };
}

describe("email delivery providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthState.current = undefined;
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("MICROSOFT_GRAPH_TENANT_ID", "tenant-id");
    vi.stubEnv("MICROSOFT_GRAPH_CLIENT_ID", "client-id");
    vi.stubEnv("MICROSOFT_GRAPH_CLIENT_SECRET", "client-secret");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("acquires a token and sends mail through Microsoft Graph", async () => {
    getEmailSettingsMock.mockResolvedValue(graphSettings);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(200, { access_token: "access-token" }) as Response)
      .mockResolvedValueOnce(mockJsonResponse(202, {}) as Response);

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
    );
    const tokenRequest = fetchMock.mock.calls[0][1];
    expect(tokenRequest).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(tokenRequest?.body?.toString()).toContain("grant_type=client_credentials");
    expect(tokenRequest?.body?.toString()).toContain(
      "scope=https%3A%2F%2Fgraph.microsoft.com%2F.default",
    );

    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://graph.microsoft.com/v1.0/users/fleet%40example.com/sendMail",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      message: {
        toRecipients: [{ emailAddress: { address: "recipient@example.com" } }],
        from: { emailAddress: { name: "FleetCmd", address: "fleet@example.com" } },
      },
      saveToSentItems: true,
    });
  });

  it("reports missing Microsoft Graph configuration before making a request", async () => {
    getEmailSettingsMock.mockResolvedValue(graphSettings);
    vi.stubEnv("MICROSOFT_GRAPH_CLIENT_SECRET", "");

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
      success: false,
      error: "Microsoft Graph is not fully configured. Set the tenant ID, client ID, and client secret.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports invalid Microsoft Graph client credentials", async () => {
    getEmailSettingsMock.mockResolvedValue(graphSettings);
    vi.mocked(fetch).mockResolvedValueOnce(
      mockJsonResponse(401, {
        error: "invalid_client",
        error_description: "Invalid client secret provided.",
      }) as Response,
    );

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
      success: false,
      error: "Invalid client secret provided.",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports a missing Mail.Send application permission", async () => {
    getEmailSettingsMock.mockResolvedValue(graphSettings);
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockJsonResponse(200, { access_token: "access-token" }) as Response)
      .mockResolvedValueOnce(
        mockJsonResponse(403, {
          error: {
            code: "Authorization_RequestDenied",
            message: "Insufficient privileges to complete the operation.",
          },
        }) as Response,
      );

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
      success: false,
      error: "Insufficient privileges to complete the operation.",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reports when Microsoft Graph authentication times out", async () => {
    getEmailSettingsMock.mockResolvedValue(graphSettings);
    const fetchMock = vi.fn().mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
      success: false,
      error: "Microsoft Graph authentication request timed out after 10 seconds. Check Microsoft service availability and network connectivity, then try again.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("reports when Microsoft Graph sendMail times out", async () => {
    getEmailSettingsMock.mockResolvedValue(graphSettings);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse(200, { access_token: "access-token" }) as Response)
      .mockRejectedValueOnce(
        new DOMException("The operation was aborted due to timeout", "TimeoutError"),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
      success: false,
      error: "Microsoft Graph sendMail request timed out after 10 seconds. Check Microsoft service availability and network connectivity, then try again.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("continues to deliver through SMTP when SMTP is selected", async () => {
    getEmailSettingsMock.mockResolvedValue(smtpSettings);
    sendMailMock.mockResolvedValue({ messageId: "message-id" });

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({ success: true });

    expect(fetch).not.toHaveBeenCalled();
    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: {
        user: "fleet@example.com",
        pass: "smtp-password",
      },
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"FleetCmd" <fleet@example.com>',
        to: "recipient@example.com",
        subject: "Test Email - FleetCmd Transport Management",
      }),
    );
  });

  it("reports an actionable error when the SMTP connection times out", async () => {
    getEmailSettingsMock.mockResolvedValue(smtpSettings);
    sendMailMock.mockRejectedValue(
      Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" }),
    );

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
      success: false,
      error: "SMTP connection to smtp.example.com:587 timed out. Check the SMTP host, port, firewall, and network connectivity, then try again.",
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it("reports an actionable error when the SMTP socket times out", async () => {
    getEmailSettingsMock.mockResolvedValue(smtpSettings);
    sendMailMock.mockRejectedValue(
      Object.assign(new Error("Socket timed out while sending"), { code: "ESOCKET" }),
    );

    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
      success: false,
      error: "SMTP connection to smtp.example.com:587 timed out. Check the SMTP host, port, firewall, and network connectivity, then try again.",
    });
  });

  it("raises a warning after repeated provider failures without throwing", async () => {
    getEmailSettingsMock.mockResolvedValue(smtpSettings);
    sendMailMock.mockRejectedValue(new Error("Provider unavailable"));

    for (let attempt = 1; attempt <= EMAIL_DELIVERY_FAILURE_THRESHOLD; attempt += 1) {
      await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({
        success: false,
        error: "Provider unavailable",
      });
    }

    expect(await getEmailDeliveryHealth()).toMatchObject({
      status: "warning",
      consecutiveFailures: EMAIL_DELIVERY_FAILURE_THRESHOLD,
      failureThreshold: EMAIL_DELIVERY_FAILURE_THRESHOLD,
      lastError: "Provider unavailable",
    });
    expect((await getEmailDeliveryHealth()).warningSince).not.toBeNull();
  });

  it("clears the warning after a successful delivery", async () => {
    getEmailSettingsMock.mockResolvedValue(smtpSettings);
    sendMailMock.mockRejectedValue(new Error("Provider unavailable"));

    for (let attempt = 0; attempt < EMAIL_DELIVERY_FAILURE_THRESHOLD; attempt += 1) {
      await sendTestEmail("recipient@example.com");
    }
    expect((await getEmailDeliveryHealth()).status).toBe("warning");

    sendMailMock.mockResolvedValueOnce({ messageId: "recovered" });
    await expect(sendTestEmail("recipient@example.com")).resolves.toEqual({ success: true });

    expect(await getEmailDeliveryHealth()).toMatchObject({
      status: "healthy",
      consecutiveFailures: 0,
      warningSince: null,
      lastError: null,
    });
    expect((await getEmailDeliveryHealth()).lastSuccessAt).not.toBeNull();
  });

  it("reads persisted failures after a simulated server restart", async () => {
    const failedAt = new Date("2026-09-11T10:00:00.000Z");
    healthState.current = {
      id: 1,
      consecutiveFailures: EMAIL_DELIVERY_FAILURE_THRESHOLD,
      warningSince: failedAt,
      lastFailureAt: failedAt,
      lastSuccessAt: null,
      lastError: "Provider unavailable",
      updatedAt: failedAt,
    };

    await vi.resetModules();
    const restartedEmailModule = await import("./email");

    await expect(restartedEmailModule.getEmailDeliveryHealth()).resolves.toMatchObject({
      status: "warning",
      consecutiveFailures: EMAIL_DELIVERY_FAILURE_THRESHOLD,
      warningSince: failedAt.toISOString(),
      lastError: "Provider unavailable",
    });
  });
});