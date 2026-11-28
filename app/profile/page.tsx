import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LOCATIONS, ROLES } from "@/lib/cv";
import { getProfile, PROFILE_FIELDS, type ProfileField } from "@/lib/db";
import { buttonPrimary, updatedAt } from "@/lib/ui";
import { updateProfile } from "../actions";
import { UploadForm } from "../upload-form";
import { PassNumber } from "./pass-number";
import { SkillsInput } from "./skills-input";

export const dynamic = "force-dynamic";

const FIELD_NAMES: Record<ProfileField, string> = {
  skills: "skill",
  roles: "vị trí",
  locations: "nơi làm",
  years: "năm kinh nghiệm",
  minSalaryUsd: "lương tối thiểu",
};

/** One segment of the pass: caption on top, value under it. A field changed by the last save lights its caption. */
function Segment({ caption, htmlFor, lit, children, className = "" }: { caption: string; htmlFor?: string; lit?: boolean; children: ReactNode; className?: string }) {
  const Caption = htmlFor ? "label" : "p";
  return (
    <div className={`px-5 py-5 sm:px-6 ${className}`}>
      <Caption htmlFor={htmlFor} className={`caption mb-3 flex items-center gap-2 ${lit ? "!text-signal" : ""}`}>
        {caption}
        {lit && <span className="normal-case tracking-normal">· vừa cập nhật</span>}
      </Caption>
      {children}
    </div>
  );
}

/** Checkbox toggles. Selected reads as paper on slate; any toggle that differs from the saved profile lights signal. */
function Toggles({ name, label, options, checked }: { name: string; label: string; options: Record<string, string>; checked: string[] }) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, text]) => {
          const wasOn = checked.includes(value);
          return (
            <label key={value} className="cursor-pointer">
              <input type="checkbox" name={name} value={value} defaultChecked={wasOn} className="peer sr-only" />
              <span
                className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal [&>svg]:hidden peer-checked:[&>svg]:block ${
                  wasOn
                    ? "border-paper text-paper peer-not-checked:border-signal peer-not-checked:text-steel peer-not-checked:line-through"
                    : "border-seam-strong text-steel hover:border-steel hover:text-paper peer-checked:border-signal peer-checked:text-signal"
                }`}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true">
                  <path d="M1 4l2.5 2.5L9 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {text}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const profile = getProfile();
  if (!profile) redirect("/");
  const { saved } = await searchParams;
  const lit = new Set(String(saved ?? "").split(",").filter((f): f is ProfileField => (PROFILE_FIELDS as readonly string[]).includes(f)));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-2 max-w-xl text-steel">
            App đọc được những thứ này từ CV. Sửa chỗ sai, job sẽ được chấm điểm theo đúng profile này.
          </p>
        </div>
        {saved && (
          <p role="status" className="rounded-md bg-signal-dim px-3 py-1.5 text-sm text-signal">
            {lit.size ? `Đã lưu: ${[...lit].map((f) => FIELD_NAMES[f]).join(", ")}` : "Đã lưu, không có gì thay đổi"}
          </p>
        )}
      </div>

      <form action={updateProfile} className="mt-10">
        <div className="rounded-md border border-seam bg-slate">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-seam px-5 py-3 sm:px-6">
            <span className="caption">Profile từ CV</span>
            <span className="figure text-[13px] text-steel">
              {profile.skills.length} skill · cập nhật {updatedAt(profile.updatedAt)}
            </span>
          </div>
          <Segment caption="Skill" lit={lit.has("skills")}>
            <SkillsInput initial={profile.skills} />
          </Segment>
          <div className="grid border-t border-seam md:grid-cols-2 md:divide-x md:divide-seam">
            <Segment caption="Vị trí muốn làm" lit={lit.has("roles")}>
              <Toggles name="roles" label="Vị trí muốn làm" options={ROLES} checked={profile.roles} />
            </Segment>
            <Segment caption="Nơi làm việc" lit={lit.has("locations")} className="border-t border-seam md:border-t-0">
              <Toggles name="locations" label="Nơi làm việc" options={LOCATIONS} checked={profile.locations} />
            </Segment>
          </div>
          <div className="grid grid-cols-2 divide-x divide-seam border-t border-seam">
            <Segment caption="Kinh nghiệm" htmlFor="years" lit={lit.has("years")}>
              <PassNumber id="years" name="years" initial={profile.years} unit="năm" max={40} placeholder="—" />
            </Segment>
            <Segment caption="Lương tối thiểu" htmlFor="minSalaryUsd" lit={lit.has("minSalaryUsd")}>
              <PassNumber id="minSalaryUsd" name="minSalaryUsd" initial={profile.minSalaryUsd} unit="USD/tháng" step={100} placeholder="—" />
            </Segment>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="submit" className={buttonPrimary}>
            Lưu profile
          </button>
          <p className="text-sm text-steel">Chỗ đổi mà chưa lưu hiện màu vàng.</p>
        </div>
      </form>

      <section aria-labelledby="new-cv" className="mt-16 grid gap-6 border-t border-dashed border-seam-strong pt-10 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <div>
          <h2 id="new-cv" className="text-lg font-medium">
            Đổi CV
          </h2>
          <p className="mt-1 max-w-md text-sm text-steel">
            CV mới sẽ đọc lại skill, vị trí, nơi làm và số năm kinh nghiệm. Lương tối thiểu giữ nguyên.
          </p>
        </div>
        <UploadForm label="Upload CV mới" />
      </section>
    </main>
  );
}
