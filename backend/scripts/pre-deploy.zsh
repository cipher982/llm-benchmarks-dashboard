#!/bin/zsh
set -euo pipefail

MONGODB_URI= bun run build
bun run test:pure
# Run under Bun, not Node: Playwright's zip extraction hangs forever on Node 26
# (bundled fd-slicer bug, https://github.com/node-modules/yauzl/issues/3), and a
# hung install here once blocked this script for days. The timeout bounds any
# other stall.
timeout 600 bunx --bun playwright install chromium
CI=true MONGODB_URI= bun run test:a11y
