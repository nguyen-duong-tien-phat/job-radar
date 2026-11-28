#!/bin/zsh
# One run: crawl every source, then the Claude web search.
# Scheduled runs pass no args, so the search skips itself until its interval has passed;
# the app's "Tìm job" button passes --force.
set -u
cd "${0:A:h}/.."
mkdir -p data/logs
echo $$ > data/run.pid
trap 'rm -f data/run.pid' EXIT
{
  echo "=== $(date '+%F %T') $*"
  npm run --silent crawl
  npm run --silent search -- "$@"
} >> "data/logs/$(date +%Y-%m).log" 2>&1
