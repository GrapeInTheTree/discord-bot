<p align="center">
  <h1 align="center">discord-bot</h1>
  <p align="center">
    <strong>A white-label Discord community bot.</strong>
  </p>
  <p align="center">
    One codebase. Deploy per community. MEE6 / Ticket Tool class — built to last.
  </p>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22.22%20LTS-339933?logo=node.js" alt="Node.js" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-10.14-F69220?logo=pnpm" alt="pnpm" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.8%20strict-3178C6?logo=typescript" alt="TypeScript" /></a>
  <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-14.26-5865F2?logo=discord" alt="discord.js" /></a>
  <a href="https://www.sapphirejs.dev/"><img src="https://img.shields.io/badge/Sapphire-5.5-2E2E2E" alt="Sapphire" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma" alt="Prisma" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" alt="Postgres" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker" /></a>
</p>

---

## Table of Contents

- [Why](#why)
- [Status](#status)
- [Architecture](#architecture)
- [Feature Roadmap](#feature-roadmap)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Operator Setup](#operator-setup)
- [White-label Branding](#white-label-branding)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Quality Gates](#quality-gates)
- [License](#license)

---

## Why

Most off-the-shelf Discord bots either lock you into a hosted SaaS (MEE6 Premium) or ship as a single-tenant codebase that requires a fork to rebrand. Neither fits a multi-community operator.

This project is structured around three principles:

- **One codebase, many deployments.** Each community runs its own instance with its own Discord application token. No shared state, no central control plane, full operational isolation.
- **Brand via configuration.** Bot name, color, icon, footer, locale, and copy are env-driven. Onboarding a new community is `cp .env.example .env && docker compose up -d` — zero code changes.
- **Operator-driven configuration.** Panels, ticket types, support roles, and routing categories are configured via Discord slash commands at runtime — not redeployed.

The result is a bot that feels like MEE6 to end users but is operated like infrastructure: versioned, auditable, and reproducible.

---

## Status

**Phase 1 (Tickets MVP) — shipped.** End-to-end ticket lifecycle (open / claim / close / reopen / delete) verified on a live Discord server. Multi-type panels with operator-driven slash command CRUD. Race-safe concurrency via Postgres advisory locks plus a partial unique index.

| Metric                                      | Value                                                          |
| ------------------------------------------- | -------------------------------------------------------------- |
| Unit tests                                  | **92 / 92** passing                                            |
| Integration tests                           | **5 / 5** passing (testcontainers + Postgres 16)               |
| Coverage (lines / branches / funcs / stmts) | **91.7 / 81.7 / 94.1 / 91.7**                                  |
| Production build                            | `docker compose up -d --build` → migrate → bootstrap → healthy |

**Next:** Web dashboard (Next.js + Discord OAuth, Vercel + Neon) before Phase 2.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Discord Gateway (WSS)                                │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │  events
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            apps/bot (runtime)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   commands/         interaction-handlers/    listeners/    preconditions/   │
│   ├─ tickets/       ├─ buttons/              ├─ ready      ├─ AdminOnly     │
│   ├─ moderation/    ├─ modals/               ├─ channelDelete                │
│   └─ utility/                                ├─ chatInputCommandDenied      │
│                                              └─ interactionHandlerError    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                            services/ (pure logic)                            │
│        TicketService   PanelService   GuildConfigService                    │
│                                                                              │
│   Zero discord.js imports. All Discord I/O goes through:                    │
│                                                                              │
│        services/ports/DiscordGateway   ◄─── port abstraction                │
│              │                                                               │
│              └── DjsDiscordGateway (production)                             │
│              └── FakeDiscordGateway (tests)                                 │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                          packages/database (Prisma 7)                        │
│        GuildConfig   Panel   PanelTicketType   Ticket   TicketEvent         │
│                                                                              │
│   Driver adapter pattern (@prisma/adapter-pg) + ESM client generator.       │
│   Race safety: pg_advisory_xact_lock + partial unique index                 │
│   ON Ticket(guildId, openerId, panelTypeId) WHERE status IN ('open',        │
│   'claimed').                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL 16 (compose)                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer             | Choice                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| **Runtime**       | Node.js 22.22 LTS                                                         |
| **Language**      | TypeScript 5.8 (strict)                                                   |
| **Discord SDK**   | discord.js 14.26 + Sapphire Framework 5.5                                 |
| **Database**      | PostgreSQL 16 + Prisma 7 (ESM client, driver adapter)                     |
| **Build**         | tsup (ESM) + tsx (dev watch)                                              |
| **Monorepo**      | pnpm 10 workspaces + Turborepo                                            |
| **Tests**         | Vitest 4 + testcontainers (Postgres 16)                                   |
| **Lint / Format** | ESLint 9 (flat config) + Prettier 3                                       |
| **Hooks**         | lefthook + commitlint + gitleaks                                          |
| **Logging**       | Sapphire logger (pino-compatible)                                         |
| **Deploy**        | GCP Compute Engine VM + docker compose (multi-stage build, registry-less) |

### Architectural Decisions

- **Self-hosted multi-tenancy.** Each community owns its Discord application and runs its own bot instance. No cross-community shared state.
- **Service / port separation.** `services/` are 100% pure: they accept primitive identifiers (snowflakes, role IDs, permission bits) and return `Result<T, AppError>`. All Discord side effects are funnelled through a single `DiscordGateway` interface — making 92 unit tests possible without booting the bot.
- **Concurrency belt-and-suspenders.** A double-clicked panel button is blocked at two layers: a Postgres advisory transaction lock keyed by `(guildId, openerId, panelTypeId)`, and a partial unique index on the same tuple constrained to active states. Either alone is sufficient.
- **Operator-driven configuration.** No hardcoded ticket types. Panels and types are CRUD'd at runtime via `/panel`, `/panel ticket-type {add,edit,remove}` — onboarding a new community requires zero code changes.
- **Idempotent slash registration.** `idHints` are persisted on first boot, eliminating Discord rate-limit churn on subsequent restarts.

---

## Feature Roadmap

| Phase | Status      | Features                                                                                              |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------- |
| 0     | Shipped     | Monorepo bootstrap, `/ping`, CI gates                                                                 |
| 1     | **Shipped** | **Tickets MVP** — multi-type panels, lifecycle (open/claim/close/reopen/delete), audit log, race-safe |
| 1.5   | **Shipped** | Operator slash CRUD for panels & ticket types, native role pickers                                    |
| 1.1   | Backlog     | Transcripts, `/add`, `/remove`, `/transfer`                                                           |
| 2     | Planned     | Moderation + AutoMod (warn/mute/kick/ban + native AutoMod hook)                                       |
| 3     | Planned     | Self-Roles + Welcome                                                                                  |
| 4     | Planned     | Leveling + Logging (Redis introduced here)                                                            |
| 5     | Planned     | Custom commands, reminders, giveaways, polls, feeds, verification                                     |

---

## Project Structure

```
discord-bot/
├── apps/
│   └── bot/                              # Bot runtime — the deployable
│       ├── src/
│       │   ├── commands/                 # Slash commands (per domain folder)
│       │   ├── listeners/                # Sapphire listeners (1 file = 1 piece)
│       │   ├── interaction-handlers/     # Buttons + modals (Sapphire convention)
│       │   ├── preconditions/            # AdminOnly, GuildOnly
│       │   ├── services/                 # Pure business logic (zero discord.js)
│       │   │   └── ports/                # DiscordGateway interface + djs impl
│       │   ├── lib/                      # Pure utils (customId, advisoryLock,
│       │   │                             #   format, panelBuilder, ...)
│       │   ├── config/                   # Zod env schema, branding object
│       │   ├── i18n/                     # Locale-keyed copy (en/, ko/, ...)
│       │   ├── healthcheck/              # /healthz HTTP server
│       │   ├── container.ts              # Sapphire DI container
│       │   └── index.ts                  # Bootstrap
│       ├── tests/                        # Unit + integration suites
│       └── Dockerfile
├── packages/
│   ├── database/                         # Prisma schema, migrations, client
│   ├── shared/                           # Result, AppError, cross-app types
│   ├── tsconfig/                         # base.json, bot.json, web.json
│   └── eslint-config/                    # Shared ESLint flat config
├── infra/
│   ├── docker-compose.yml                # bot + postgres
│   └── deploy.sh                         # VM-side: pull + build + up + logs
└── .github/workflows/                    # CI: typecheck, lint, test, build
```

### Invariants

- `apps/bot/src/services/` must not import from `discord.js`. All side effects route through `services/ports/DiscordGateway`.
- The Prisma client is exported from `packages/database`. Direct `new PrismaClient()` calls inside `apps/bot/` are forbidden.
- Environment variables are validated once via Zod in `apps/bot/src/config/env.ts`. `process.env` is not read elsewhere.
- One Sapphire piece per file (Listener / Command / InteractionHandler / Precondition). Multiple exports are silently dropped by the loader.

---

## Getting Started

### Prerequisites

- Node.js **22.22.x** (use `nvm use` — `.nvmrc` is committed)
- pnpm **10+**
- Docker + Docker Compose v2
- A Discord application + bot token ([Developer Portal](https://discord.com/developers/applications))

### Setup

```bash
git clone https://github.com/GrapeInTheTree/discord-bot.git
cd discord-bot

nvm use                                   # picks up .nvmrc
pnpm install                              # also installs lefthook hooks

cp apps/bot/.env.example apps/bot/.env
# fill in DISCORD_TOKEN, DISCORD_APP_ID, DISCORD_DEV_GUILD_ID,
# DATABASE_URL, BOT_NAME, BOT_BRAND_COLOR
```

### Local Development

```bash
# 1. Start Postgres only (bot runs on host via tsx watch)
docker compose -f infra/docker-compose.yml up -d postgres

# 2. Apply migrations
pnpm --filter @discord-bot/database exec prisma migrate dev

# 3. Run the bot in watch mode
pnpm dev
```

Slash commands register against `DISCORD_DEV_GUILD_ID` for instant updates. Without it, commands register globally (≈1h propagation).

---

## Operator Setup

After the bot is online and added to your server, all configuration happens through slash commands. **No code changes, no env edits.**

```
# 1. Set archive category (where closed tickets are moved)
/setup archive-category category:#archive

# 2. Optional: set audit-log channel (delete events go here)
/setup log-channel channel:#bot-log

# 3. Create a panel (the message users click to open tickets)
/panel create
    channel:#contact-team
    title:"Contact Team"
    description:"Have a question or proposal? Click a button below."

# 4. Add ticket types (one button per type)
/panel ticket-type add
    panel:<panelId>
    name:question
    label:"Question"
    emoji:❓
    active-category:#community-questions
    support-roles:@Support
    per-user-limit:1

/panel ticket-type add
    panel:<panelId>
    name:business-offer
    label:"Business Offer"
    emoji:💼
    active-category:#business-offers
    support-roles:@Sales
    per-user-limit:1
```

End users click a button on the panel — a private channel is created in the appropriate category, with permission overwrites granting access only to the opener and configured support roles.

### Permission Model

| Action      | Authorization                                    |
| ----------- | ------------------------------------------------ |
| Open ticket | Any member with view access to the panel channel |
| Close       | Opener **or** support role                       |
| Claim       | Support role                                     |
| Reopen      | Support role                                     |
| Delete      | Manage Guild permission                          |

All permission checks happen at the service layer. Discord's per-viewer button visibility cannot be controlled — buttons are visible to anyone with channel access (same constraint that affects MEE6, Tickety, etc.). Unauthorized clicks are rejected with an ephemeral error.

---

## White-label Branding

Every user-visible string and visual element is sourced from environment variables or i18n templates. To rebrand for a new community:

```env
BOT_NAME=Acme
BOT_BRAND_COLOR="#5865F2"
BOT_ICON_URL=https://cdn.example.com/acme.png
BOT_FOOTER_TEXT="Powered by Acme Engineering"
BOT_SUPPORT_URL=https://acme.com/support
BOT_LOCALE=en
```

Restart the bot. That's it. Embeds, buttons, error messages, and welcome copy will reflect the new brand.

Hardcoded community names anywhere in the codebase are caught by an ESLint rule (`no-restricted-syntax`) and a CI grep gate.

---

## Environment Variables

See [`apps/bot/.env.example`](apps/bot/.env.example) for the annotated template.

### Required

| Variable         | Description                                         |
| ---------------- | --------------------------------------------------- |
| `DISCORD_TOKEN`  | Bot token from Developer Portal → Bot → Reset Token |
| `DISCORD_APP_ID` | Application ID (snowflake)                          |
| `DATABASE_URL`   | `postgresql://user:pass@host:5432/db?schema=public` |
| `BOT_NAME`       | User-facing bot name (used in embeds, footers)      |

### Optional

| Variable                     | Default       | Description                                                   |
| ---------------------------- | ------------- | ------------------------------------------------------------- |
| `DISCORD_DEV_GUILD_ID`       | –             | Register slash commands to a single guild for instant updates |
| `BOT_BRAND_COLOR`            | `#5865F2`     | Embed accent color (hex, must be quoted)                      |
| `BOT_ICON_URL`               | –             | Embed footer icon                                             |
| `BOT_FOOTER_TEXT`            | –             | Embed footer text                                             |
| `BOT_SUPPORT_URL`            | –             | Help-link URL                                                 |
| `BOT_LOCALE`                 | `en`          | i18n locale (`en`, `ko`)                                      |
| `TICKET_ARCHIVE_CATEGORY_ID` | –             | Closed-ticket destination (also settable via `/setup`)        |
| `BOT_LOG_CHANNEL_ID`         | –             | Audit-log channel (also settable via `/setup`)                |
| `LOG_LEVEL`                  | `info`        | `debug` \| `info` \| `warn` \| `error`                        |
| `SENTRY_DSN`                 | –             | Error tracking                                                |
| `PORT`                       | `3000`        | Healthcheck HTTP port (`/healthz`)                            |
| `NODE_ENV`                   | `development` | `development` \| `production`                                 |

### Secrets

This repository is **public**. Never commit real tokens, passwords, or DSNs. The `.gitignore`, lefthook pre-commit (`gitleaks`), and CI all enforce this — but the first line of defense is reading what you're about to commit.

If a token is ever exposed in git history, rotate it immediately at the Discord Developer Portal.

---

## Development

### Scripts

```bash
# Development
pnpm dev                    # Run bot with watch (hot reload)

# Build
pnpm build                  # Compile all packages with tsup

# Code quality
pnpm typecheck              # Run tsc --noEmit across all packages
pnpm lint                   # Run ESLint
pnpm lint:fix               # Auto-fix lint errors
pnpm format                 # Run Prettier
pnpm format:check           # Check formatting

# Tests
pnpm test                   # Unit tests (fast, no Docker)
pnpm test:coverage          # With coverage report
pnpm --filter @discord-bot/bot test:integration
                            # Integration suite (Postgres via testcontainers)

# Release
pnpm changeset              # Author a Changesets entry
pnpm version-packages       # Bump versions per Changesets

# Cleanup
pnpm clean                  # Remove dist, node_modules, .turbo, coverage
```

### Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint via lefthook commit-msg hook:

```
feat(tickets): add /transfer subcommand
fix(panel): handle missing role on type add
chore(deps): bump discord.js to 14.27.0
docs(core): document operator setup flow
test(tickets): cover concurrent open race
```

Co-author tags (`Co-Authored-By: ...`) are not used in this repository.

---

## Testing

```bash
# Unit suite — fast (~800ms), no external dependencies
pnpm test

# With coverage thresholds enforced (≥85% lines, ≥75% branches)
pnpm test:coverage

# Integration suite — Postgres 16 via testcontainers, ~30s
pnpm --filter @discord-bot/bot test:integration
```

### Strategy

| Layer                | Approach                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `services/`          | In-memory `FakeDb` + `FakeDiscordGateway`. 100% deterministic. All race conditions provable via `async-mutex`.               |
| `lib/`               | Pure functions, table-driven tests                                                                                           |
| Integration          | Real Postgres via `@testcontainers/postgresql`. Migrations applied per-suite. Verifies advisory lock + partial unique index. |
| Discord interactions | Out of scope for automated tests. Verified manually in dev guilds before each PR.                                            |

---

## Deployment

The supported deployment target is a **GCP Compute Engine VM** (or any host with Docker + Compose v2). The bot runs as one container, Postgres as another. No registry — the VM builds the image directly from the Dockerfile.

### One-time VM setup

```bash
sudo apt install docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker

git clone https://github.com/GrapeInTheTree/discord-bot.git
cd discord-bot

cp apps/bot/.env.example apps/bot/.env
# fill in production values; DATABASE_URL host should be `postgres`
# (the compose service name) — compose overrides this automatically
```

### First boot

```bash
cd infra
./deploy.sh
# = git pull --ff-only
#   docker compose build bot
#   docker compose up -d
#   docker compose logs --tail=30 bot
```

The bot's entrypoint runs `prisma migrate deploy` before starting, so schema drift is impossible. Slash commands auto-register on first connect (idHints persisted afterward to avoid re-registration churn).

### Subsequent deploys

```bash
./infra/deploy.sh
```

That's it. Pulls latest, rebuilds, restarts.

### Operations

```bash
docker compose ps                    # health status
docker compose logs -f bot           # stream logs
docker compose restart bot           # graceful restart
docker compose down bot && docker compose up -d bot
                                     # full recreate (required after
                                     # DEV_GUILD_ID changes — Sapphire's
                                     # in-memory cache otherwise skips
                                     # slash registration on the new guild)
curl http://localhost:3000/healthz   # readiness check (localhost-only)
```

### Hardening notes

- Postgres and `/healthz` are bound to `127.0.0.1` only. No public ingress.
- The bot uses **outbound** WebSocket to Discord Gateway. No domain, no TLS termination, no reverse proxy required.
- The `.env` file should be `chmod 600` and owned by `root` in production. For Phase 4+, consider migrating to GCP Secret Manager.
- Postgres data persists in a named volume (`pgdata`). Snapshots via `docker compose exec postgres pg_dump` cron + GCS upload — wire this up before user-visible state accumulates.

---

## Quality Gates

Every pull request must pass:

| Gate              | Tool                                                |
| ----------------- | --------------------------------------------------- |
| Type safety       | TypeScript 5.8 strict, zero errors                  |
| Lint              | ESLint 9 flat config, zero warnings                 |
| Format            | Prettier 3                                          |
| Unit tests        | Vitest, ≥85% line coverage                          |
| Integration tests | Vitest + testcontainers (gated `RUN_INTEGRATION=1`) |
| Commit format     | Conventional Commits via commitlint                 |
| Versioning        | Changesets entry per user-visible change            |
| Secret scan       | gitleaks (lefthook pre-commit)                      |
| Build             | `docker compose build bot` succeeds                 |

Hooks are installed automatically by `pnpm install` (`prepare: lefthook install`).

---

## License

UNLICENSED — private project. The source is public for transparency only; redistribution is not permitted.

---

<p align="center">
  <sub>Built to outlast the platform churn.</sub>
</p>
