---
name: Notification audit reliability
description: Reliability rule for recording notification delivery outcomes without changing delivery semantics.
---

Notification delivery audit writes must remain best-effort and must not change whether a provider delivery is considered successful.

**Why:** A provider may accept a message before the audit database write occurs. Treating an audit-write failure as a delivery failure releases the idempotency claim and can send a duplicate notification.

**How to apply:** Record outcomes after the provider result, catch audit persistence errors separately, and complete delivery claims based only on the provider result.