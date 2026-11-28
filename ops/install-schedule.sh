#!/bin/zsh
# Installs a launchd agent that runs ops/daily.sh every day at 18:00 (or at wake, if the Mac was asleep then).
# Remove it with: launchctl bootout gui/$(id -u)/com.jobradar.daily && rm ~/Library/LaunchAgents/com.jobradar.daily.plist
set -eu
repo="${0:A:h:h}"
node_dir="$(dirname "$(command -v node)")"
claude_dir="$(dirname "$(command -v claude)")"
plist="$HOME/Library/LaunchAgents/com.jobradar.daily.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.jobradar.daily</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>$repo/ops/daily.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$node_dir:$claude_dir:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
</dict>
</plist>
PLIST
launchctl bootout "gui/$(id -u)/com.jobradar.daily" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed: runs $repo/ops/daily.sh daily at 18:00. Logs: $repo/data/logs/"
