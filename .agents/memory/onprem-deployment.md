---
name: On-prem deployment workflow
description: Established deployment convention for the Ubuntu production server.
---

The on-prem Ubuntu installation lives at `/opt/fleetcmd`, uses pnpm for dependencies and project scripts, and runs under the existing PM2 process named `fleetcmd`. Do not direct the user to a placeholder path or create a systemd service.

**Why:** This is the server's existing working deployment arrangement. Introducing systemd would create a competing service, and placeholder paths caused failed commands.

**How to apply:** For deployments, use `cd /opt/fleetcmd`, pull from Git, run pnpm install/check/build/db:push, and restart with `pm2 restart fleetcmd --update-env`. Use PM2 logs for verification.