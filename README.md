# discord-bot

> **White-label Discord community bot** — MEE6 / Carl-bot / Ticket Tool class. One codebase, deploy per community via `.env`.

## Status

Phase 0 (bootstrap) — pre-MVP. See [vault project docs](https://github.com/GrapeInTheTree/discord-bot/blob/main/CLAUDE.md) for the full roadmap.

## Features (planned)

| Phase | Features                                                          |
| ----- | ----------------------------------------------------------------- |
| 1     | **Tickets** — panels, claim/close/reopen/delete, archive category |
| 2     | Moderation + AutoMod                                              |
| 3     | Self-Roles + Welcome                                              |
| 4     | Leveling + Logging                                                |
| 5     | Custom Commands, Reminders, Giveaways, Polls, Feeds, Verification |

## White-label

Brand the bot per deployment via env:

```env
BOT_NAME=Fannie                    # user-facing name
BOT_BRAND_COLOR=#FF6B35            # embed color
BOT_ICON_URL=https://...
BOT_FOOTER_TEXT=Powered by ...
BOT_LOCALE=en                      # 'en' | 'ko'
```

No code changes required to onboard a new community — register a Discord app, set env, `docker compose up -d`.

## Quick start (local development)

```bash
# Prerequisites: Node 22.22.x (use nvm), pnpm 10+, Docker, gitleaks (brew install gitleaks)

git clone git@github.com:GrapeInTheTree/discord-bot.git
cd discord-bot
nvm use                            # picks up .nvmrc
pnpm install                       # also installs lefthook hooks via 'prepare'
cp apps/bot/.env.example apps/bot/.env.local
# fill in DISCORD_TOKEN, DATABASE_URL, etc.

# start postgres only (bot will run locally via pnpm dev)
docker compose -f infra/docker-compose.yml up -d postgres

# run migrations
pnpm --filter @discord-bot/database exec prisma migrate dev

# start the bot in watch mode
pnpm dev
```

## Project layout

```
apps/bot/         # bot runtime (the only deploy target)
packages/
├── database/     # Prisma schema + client
├── shared/       # cross-app types, errors, Result helpers
├── tsconfig/     # shared TS configs (base, bot, web)
└── eslint-config # shared ESLint flat config
infra/            # Docker Compose, deploy scripts
```

## Quality gates

PRs must pass:

- TypeScript strict (zero errors)
- ESLint v9 flat (zero warnings)
- Prettier formatted
- Vitest (unit + integration)
- Conventional Commits
- Changesets entry
- gitleaks (secret scan)

## License

UNLICENSED — private project. Source is public for transparency only; do not redistribute.
