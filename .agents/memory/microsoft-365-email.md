---
name: Microsoft 365 email provider
description: Provider choice and configuration boundary for Microsoft 365 email delivery.
---

Use app-only Microsoft Graph OAuth for Microsoft 365 email when SMTP AUTH is disabled, while retaining SMTP as a selectable fallback.

**Why:** The Microsoft 365 mailbox rejects basic SMTP authentication, and Graph with application permission `Mail.Send` is the supported modern-auth path.

**How to apply:** Keep provider selection explicit. Graph credentials belong in environment configuration, with the client secret stored only as a secret; never persist Graph credentials in application database settings.