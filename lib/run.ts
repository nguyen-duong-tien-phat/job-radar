// A crawl + web search started from the app, running in the background (ops/daily.sh --force).
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "./db";

const PID_FILE = path.join(DATA_DIR, "run.pid");

/** The pid of a run in progress (from the app or the schedule), or null. */
export function runningPid(): number | null {
  try {
    const pid = Number(readFileSync(PID_FILE, "utf8"));
    process.kill(pid, 0); // throws when no such process
    return pid;
  } catch {
    return null;
  }
}

/** Starts a run unless one is already going. */
export function startRun(): boolean {
  if (runningPid()) return false;
  db(); // ensures data/ exists
  const child = spawn("/bin/zsh", [path.join(process.cwd(), "ops", "daily.sh"), "--force"], { cwd: process.cwd(), detached: true, stdio: "ignore" });
  // Written here too so the board shows "running" before the script gets to write it.
  if (child.pid) writeFileSync(PID_FILE, String(child.pid));
  child.unref();
  return true;
}
