// The daily run (ops/daily.sh) as a macOS launchd agent, installed, moved or removed from the app's settings.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const LABEL = "com.jobradar.daily";
const PLIST = path.join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function plistXml(repo: string, pathDirs: string[], hour: number, minute: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>${xml(path.join(repo, "ops", "daily.sh"))}</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml([...pathDirs, "/usr/bin", "/bin"].join(":"))}</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer></dict>
</dict>
</plist>
`;
}

export const scheduleInstalled = () => existsSync(PLIST);

const launchctl = (...args: string[]) => spawnSync("launchctl", args, { encoding: "utf8" });
const domain = () => `gui/${process.getuid?.() ?? 501}`;

/** Writes the agent with this time and (re)loads it. launchd runs a missed time when the Mac wakes. */
export function installSchedule(hour: number, minute: number) {
  const claude = spawnSync("/bin/zsh", ["-lc", "command -v claude"], { encoding: "utf8" }).stdout.trim();
  if (!claude) throw new Error("Không tìm thấy lệnh claude trong PATH.");
  mkdirSync(path.dirname(PLIST), { recursive: true });
  writeFileSync(PLIST, plistXml(process.cwd(), [path.dirname(process.execPath), path.dirname(claude)], hour, minute));
  launchctl("bootout", `${domain()}/${LABEL}`); // not loaded yet is fine
  const r = launchctl("bootstrap", domain(), PLIST);
  if (r.status !== 0) throw new Error(`launchctl: ${r.stderr.trim() || `exit ${r.status}`}`);
}

export function removeSchedule() {
  launchctl("bootout", `${domain()}/${LABEL}`);
  rmSync(PLIST, { force: true });
}
