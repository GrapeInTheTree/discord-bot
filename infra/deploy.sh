#!/usr/bin/env bash
# Deploy discord-bot on a VM (or any host running Docker + docker compose).
# Builds the image locally from the Dockerfile — no registry required.
#
# Usage on VM (from infra/ directory):
#   ./deploy.sh
#
# Prerequisites on VM:
#   - docker + docker compose v2
#   - this repo cloned, infra/ + apps/bot/.env filled in

set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f ../apps/bot/.env ]; then
  echo "❌ ../apps/bot/.env not found — copy apps/bot/.env.example and fill in"
  exit 1
fi

echo "🔄 Pulling latest source..."
git pull --ff-only

echo "🐳 Building bot image locally..."
docker compose build bot

echo "🔁 Starting services (bot + postgres)..."
docker compose up -d

echo "⏳ Waiting 10s for startup..."
sleep 10

echo "📋 Recent logs:"
docker compose logs --tail=30 bot

echo ""
echo "✅ Deploy complete"
echo "   Healthcheck: curl http://localhost:3000/healthz"
