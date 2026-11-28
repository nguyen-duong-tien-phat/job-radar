"use server";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkCvFile, extractProfile, LOCATIONS, pdfToText, ROLES } from "@/lib/cv";
import { changedFields, DATA_DIR, db, getProfile, saveProfile } from "@/lib/db";

export type UploadState = { error: string | null };

export async function uploadCv(_prev: UploadState, form: FormData): Promise<UploadState> {
  const file = form.get("cv");
  if (!(file instanceof File)) return { error: "Chưa chọn file." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const invalid = checkCvFile(file.name, file.size, bytes);
  if (invalid) return { error: invalid };

  let text: string;
  try {
    text = await pdfToText(bytes.slice()); // pdf.js detaches the buffer it reads
  } catch {
    return { error: "Không đọc được file PDF này." };
  }
  if (text.replace(/\s/g, "").length < 50) {
    return { error: "PDF không có chữ đọc được (có thể là ảnh scan). Hãy xuất CV ra PDF dạng text." };
  }

  db(); // ensures data/ exists
  await writeFile(path.join(DATA_DIR, "cv.pdf"), bytes);
  const found = extractProfile(text);
  const old = getProfile();
  saveProfile({ cvText: text, ...found, minSalaryUsd: old?.minSalaryUsd ?? null });
  redirect("/profile");
}

const pickKnown = (values: FormDataEntryValue[], known: object) =>
  values.map(String).filter((v) => Object.hasOwn(known, v));

export async function updateProfile(form: FormData): Promise<void> {
  const current = getProfile();
  if (!current) redirect("/");

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
  revalidatePath("/profile");
  // The page lights the changed fields once, so the user sees what this save did.
  redirect(`/profile?saved=${changed.join(",") || "none"}`);
}
