---
name: Microsoft 365 email provider
description: Provider choice and configuration boundary for Microsoft 365 email delivery.
---

Use app-only Microsoft Graph OAuth for Microsoft 365 email when SMTP AUTH is disabled, while retaining SMTP as a selectable fallback. Administrators may configure Graph credentials in the email settings UI; the client secret is encrypted using the server session secret. Environment variables remain a fallback.

**Why:** The Microsoft 365 mailbox rejects basic SMTP authentication, and Graph with application permission `Mail.Send` is the supported modern-auth path.

**How to apply:** Keep provider selection explicit. Do not change `SESSION_SECRET` without planning to re-enter any UI-managed Graph client secret, because it is also the encryption key. Never return the stored ciphertext or plaintext through the API.