
/**
 * Microsoft Teams Sync for TV Dashboard KPI values.
 *
 * Uses the Microsoft Graph API (app-only, client credentials flow) to fetch
 * the latest message from a configured Teams channel, then extracts numeric
 * fields via a set of flexible regex patterns.
 *
 * Authentication: Azure AD App Registration with the following API permissions
 *   ChannelMessage.Read.All  (application permission, requires admin consent)
 */

import { storage } from "./storage";

export interface ExtractedField {
  key: string;        // normalised key, e.g. "total_kwh"
  label: string;      // original label from message, e.g. "Total kwh"
  value: string;      // numeric value as string, e.g. "7000"
}

export interface TeamsSyncResult {
  ok: boolean;
  messageId?: string;
  messageDate?: string;
  messageText?: string;
  fields: ExtractedField[];
  error?: string;
}

// ── Graph API helpers ────────────────────────────────────────────────────────

async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { access_token?: string; error_description?: string };
  if (!json.access_token) throw new Error(`No access_token in response: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function fetchLatestMessage(
  token: string,
  teamId: string,
  channelId: string
): Promise<{ id: string; createdDateTime: string; body: { content: string } } | null> {
  // Fetch the 10 most recent messages and pick the newest with non-empty body
  const url = `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages?$top=10&$orderby=createdDateTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph messages request failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { value?: any[] };
  const messages = json.value ?? [];

  for (const msg of messages) {
    const text = stripHtml(msg?.body?.content ?? "");
    if (text.trim().length > 0 && msg.messageType === "message") return msg;
  }
  return null;
}

// Strip HTML tags from Teams message body (which is HTML)
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

// ── Field extraction ─────────────────────────────────────────────────────────

/**
 * Parses a free-text shift report message and extracts "Label: value" or
 * "Label value" pairs where the value is numeric.
 *
 * Examples matched:
 *   "Total kwh 7000"
 *   "Taping temp 1680"
 *   "F/C B 22.480 ton"  →  label="F/C B", value="22.480"
 *   "mn 250 kg"         →  label="mn", value="250"
 */
export function extractFields(text: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip pure numbering lines like "1)", "2)", "3)"
    if (/^\d+\)?\s*$/.test(line)) continue;

    // Pattern: optional list prefix "N)" then a label, then a number (possibly with decimals)
    // e.g. "3)F/C B 22.480 ton" → label="F/C B", value="22.480"
    // e.g. "Total kwh 7000"     → label="Total kwh", value="7000"
    const match = line.match(/^(?:\d+\)\s*)?(.+?)\s+([\d]+(?:[.,]\d+)?)\s*(?:ton|kg|kwh|kw|°c|c|minutes?|min|%|hrs?)?$/i);
    if (match) {
      const rawLabel = match[1].trim();
      const rawValue = match[2].replace(",", ".");
      // Skip if label is purely numeric or too short
      if (!rawLabel || /^\d+$/.test(rawLabel) || rawLabel.length < 2) continue;
      // Skip metadata lines
      if (/^(date|heat no|start time|taping time|tap to tap|remarks)/i.test(rawLabel)) continue;

      const key = rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      fields.push({ key, label: rawLabel, value: rawValue });
    }
  }

  return fields;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the latest Teams channel message and extract numeric fields from it.
 * Does NOT save anything — returns a preview for the user to review.
 */
export async function fetchTeamsFields(): Promise<TeamsSyncResult> {
  const settings = await storage.getTeamsSettings();
  if (!settings || !settings.enabled) {
    return { ok: false, fields: [], error: "Teams sync is not enabled. Configure it in the Teams Sync tab." };
  }
  if (!settings.tenantId || !settings.clientId || !settings.clientSecret || !settings.teamId || !settings.channelId) {
    return { ok: false, fields: [], error: "Teams sync configuration is incomplete. Please fill in all Azure credentials." };
  }

  try {
    const token = await getAccessToken(settings.tenantId, settings.clientId, settings.clientSecret);
    const message = await fetchLatestMessage(token, settings.teamId, settings.channelId);

    if (!message) {
      return { ok: false, fields: [], error: "No messages found in the configured Teams channel." };
    }

    const text = stripHtml(message.body.content);
    const fields = extractFields(text);

    return {
      ok: true,
      messageId: message.id,
      messageDate: message.createdDateTime,
      messageText: text,
      fields,
    };
  } catch (err: any) {
    return { ok: false, fields: [], error: err.message ?? "Unknown error" };
  }
}
