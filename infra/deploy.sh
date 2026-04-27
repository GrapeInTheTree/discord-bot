#!/usr/bin/env bash
# Pulls latest discord-bot image from GHCR and rolls the bot service.
#
# Usage on VM (from infra/ directory):
#   IMAGE_TAG=latest ./deploy.sh
#   IMAGE_TAG=sha-abc1234 ./deploy.sh
#
# Prerequisites on VM:
#   - docker + docker compose v2
#   - infra/ + apps/bot/.env present
#   - logged in to ghcr.io (docker login ghcr.io)

set -euo pipefail

cd "$(dirname "$0")"

: "${IMAGE_TAG:=latest}"

if [ ! -f ../apps/bot/.env ]; then
  echo "❌ ../apps/bot/.env not found — copy apps/bot/.env.example and fill in"
  exit 1
fi

echo "🔄 Pulling ghcr.io/grapeinthetree/discord-bot:${IMAGE_TAG}..."
IMAGE_TAG="$IMAGE_TAG" docker compose pull bot

echo "🔁 Restarting bot service..."
IMAGE_TAG="$IMAGE_TAG" docker compose up -d --no-deps bot

echo "⏳ Waiting 10s for startup..."
sleep 10

echo "📋 Recent logs:"
docker compose logs --tail=30 bot

echo ""
echo "✅ Deploy complete (${IMAGE_TAG})"
echo "   Healthcheck: curl http://localhost:3000/healthz"
