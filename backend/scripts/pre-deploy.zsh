#!/bin/zsh
set -euo pipefail

MONGODB_URI= bun run build
bun run test:pure
bunx playwright install chromium
CI=true MONGODB_URI= bun run test:a11y
