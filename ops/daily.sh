#!/bin/zsh
# Daily run: crawl every source; the Claude web search inside skips itself unless 44+ hours have passed.
set -u
cd "${0:A:h}/.."
mkdir -p data/logs
{
  echo "=== $(date '+%F %T')"
  npm run --silent crawl
  npm run --silent search
} >> "data/logs/$(date +%Y-%m).log" 2>&1
