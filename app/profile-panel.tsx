import type { ReactNode } from "react";
import { LOCATIONS, ROLES } from "@/lib/cv";
import { PROFILE_FIELDS, type Profile, type ProfileField } from "@/lib/db";
import { buttonPrimary, updatedAt } from "@/lib/ui";
import { updateProfile } from "./actions";
import { PassNumber } from "./pass-number";
import { SkillsInput } from "./skills-input";
import { UploadForm } from "./upload-form";

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
    <div className={`px-4 py-4 ${className}`}>
      <Caption htmlFor={htmlFor} className={`caption mb-2.5 flex items-center gap-2 ${lit ? "!text-signal" : ""}`}>
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
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(options).map(([value, text]) => {
          const wasOn = checked.includes(value);
          return (
            <label key={value} className="cursor-pointer">
              <input type="checkbox" name={name} value={value} defaultChecked={wasOn} className="peer sr-only" />
              <span
                className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal [&>svg]:hidden peer-checked:[&>svg]:block ${
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

/** The profile as a compact pass beside the job board: edit, save, or replace the CV. */
export function ProfilePanel({ profile, saved, className = "" }: { profile: Profile; saved?: string; className?: string }) {
  const lit = new Set(String(saved ?? "").split(",").filter((f): f is ProfileField => (PROFILE_FIELDS as readonly string[]).includes(f)));

  return (
    <aside aria-labelledby="profile-title" className={`relative flex flex-col gap-4 ${className}`}>
      <form action={updateProfile} className="rounded-md border border-seam bg-slate">
        <div className="flex items-baseline justify-between gap-3 border-b border-seam px-4 py-3">
          <h2 id="profile-title" className="font-semibold">
            Profile
          </h2>
          <span className="figure text-xs text-steel">
            {profile.skills.length} skill · {updatedAt(profile.updatedAt)}
          </span>
        </div>
        {saved && (
          <p role="status" className="border-b border-seam bg-signal-dim px-4 py-2 text-sm text-signal">
            {lit.size ? `Đã lưu: ${[...lit].map((f) => FIELD_NAMES[f]).join(", ")}` : "Đã lưu, không có gì thay đổi"}
          </p>
        )}
        <Segment caption="Skill" lit={lit.has("skills")}>
          <SkillsInput initial={profile.skills} />
        </Segment>
        <Segment caption="Vị trí muốn làm" lit={lit.has("roles")} className="border-t border-seam">
          <Toggles name="roles" label="Vị trí muốn làm" options={ROLES} checked={profile.roles} />
        </Segment>
        <Segment caption="Nơi làm việc" lit={lit.has("locations")} className="border-t border-seam">
          <Toggles name="locations" label="Nơi làm việc" options={LOCATIONS} checked={profile.locations} />
        </Segment>
        <div className="grid grid-cols-2 divide-x divide-seam border-t border-seam">
          <Segment caption="Kinh nghiệm" htmlFor="years" lit={lit.has("years")}>
            <PassNumber id="years" name="years" initial={profile.years} unit="năm" max={40} placeholder="—" />
          </Segment>
          <Segment caption="Lương tối thiểu" htmlFor="minSalaryUsd" lit={lit.has("minSalaryUsd")}>
            <PassNumber id="minSalaryUsd" name="minSalaryUsd" initial={profile.minSalaryUsd} unit="USD/th" step={100} placeholder="—" />
          </Segment>
        </div>
        <div className="flex items-center gap-3 border-t border-seam px-4 py-3">
          <button type="submit" className={buttonPrimary}>
            Lưu profile
          </button>
          <p className="text-xs text-steel">Chỗ đổi chưa lưu hiện màu vàng.</p>
        </div>
      </form>

      <section aria-label="Đổi CV" className="border-t border-dashed border-seam-strong pt-4">
        <UploadForm label="Upload CV mới" />
      </section>
    </aside>
  );
}
