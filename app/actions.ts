"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { checkCvFile, extractProfile, LOCATIONS, pdfToText, ROLES } from "@/lib/cv";
import { addCv, changedFields, cvPath, getProfile, saveProfile } from "@/lib/db";
import { startRun } from "@/lib/run";
import { installSchedule, removeSchedule, scheduleInstalled } from "@/lib/schedule";
import { parseSettings, saveSettings } from "@/lib/settings";
import { SOURCE_NAMES } from "@/lib/ui";

export type UploadState = { error: string | null; done: number | null };

/** Stores the CV, reads it into the profile; the caller then opens the profile editor. */
export async function uploadCv(_prev: UploadState, form: FormData): Promise<UploadState> {
  const file = form.get("cv");
  if (!(file instanceof File)) return { error: "No file chosen.", done: null };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const invalid = checkCvFile(file.name, file.size, bytes);
  if (invalid) return { error: invalid, done: null };

  let text: string;
  try {
    text = await pdfToText(bytes.slice()); // pdf.js detaches the buffer it reads
  } catch {
    return { error: "Could not read this PDF.", done: null };
  }
  if (text.replace(/\s/g, "").length < 50) {
    return { error: "This PDF has no readable text (probably a scan). Export the CV as a text PDF.", done: null };
  }

  // Display name only (the file is stored by id): drop control characters, keep it short.
  const id = addCv(file.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "cv.pdf");
  await mkdir(path.dirname(cvPath(id)), { recursive: true });
  await writeFile(cvPath(id), bytes);
  const found = extractProfile(text);
  const old = getProfile();
  saveProfile({ cvText: text, ...found, minSalaryUsd: old?.minSalaryUsd ?? null });
  revalidatePath("/");
  return { error: null, done: Date.now() };
}

const pickKnown = (values: FormDataEntryValue[], known: object) =>
  values.map(String).filter((v) => Object.hasOwn(known, v));

export type ProfileState = { error: string | null; saved: string | null };

export async function updateProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const current = getProfile();
  if (!current) return { error: "Upload a CV first.", saved: null };

  const skills = [
    ...new Set(
      String(form.get("skills") ?? "")
        .split(",")
        .map((s) => s.trim().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 100);
  const num = (key: string) => {
    const n = Number(form.get(key));
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  const next = {
    skills,
    roles: pickKnown(form.getAll("roles"), ROLES),
    locations: pickKnown(form.getAll("locations"), LOCATIONS),
    years: num("years"),
    minSalaryUsd: num("minSalaryUsd"),
  };
  const changed = changedFields(current, next);
  saveProfile({ cvText: current.cvText, ...next });
  revalidatePath("/");
  // The page lights the changed fields once, so the user sees what this save did.
  return { error: null, saved: changed.join(",") || "none" };
}

export type SettingsState = { error: string | null; savedAt: number | null };

export async function saveSettingsAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const [hh, mm] = (raw.runTime ?? "").split(":");
  const enabled = new Set(form.getAll("source").map(String));
  const disabledSources = Object.keys(SOURCE_NAMES).filter((k) => !enabled.has(k));
  const settings = parseSettings({ ...raw, runHour: hh, runMinute: mm, disabledSources });
  saveSettings(settings);
  try {
    if (settings.mode === "auto") installSchedule(settings.runHour, settings.runMinute);
    else if (scheduleInstalled()) removeSchedule();
  } catch (e) {
    return { error: `Settings saved, but the schedule could not be installed: ${e instanceof Error ? e.message : String(e)}`, savedAt: null };
  }
  revalidatePath("/", "layout");
  return { error: null, savedAt: Date.now() };
}

export async function startRunAction(): Promise<void> {
  startRun();
  revalidatePath("/");
}
