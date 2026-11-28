import Link from "next/link";
import type { ReactNode } from "react";
import { LOCATIONS, ROLES } from "@/lib/cv";
import {
  type CvFile,
  PROFILE_FIELDS,
  type Profile,
  type ProfileField,
} from "@/lib/db";
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
function Segment({
  caption,
  htmlFor,
  lit,
  children,
  className = "",
}: {
  caption: string;
  htmlFor?: string;
  lit?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const Caption = htmlFor ? "label" : "p";
  return (
    <div className={`px-4 py-4 ${className}`}>
      <Caption
        htmlFor={htmlFor}
        className={`caption mb-2.5 flex items-center gap-2 ${lit ? "!text-signal" : ""}`}
      >
        {caption}
        {lit && (
          <span className="normal-case tracking-normal">· vừa cập nhật</span>
        )}
      </Caption>
      {children}
    </div>
  );
}

/** Checkbox toggles. Selected reads as paper on slate; any toggle that differs from the saved profile lights signal. */
function Toggles({
  name,
  label,
  options,
  checked,
}: {
  name: string;
  label: string;
  options: Record<string, string>;
  checked: string[];
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(options).map(([value, text]) => {
          const wasOn = checked.includes(value);
          return (
            <label key={value} className="cursor-pointer">
              <input
                type="checkbox"
                name={name}
                value={value}
                defaultChecked={wasOn}
                className="peer sr-only"
              />
              <span
                className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal [&>svg]:hidden peer-checked:[&>svg]:block ${
                  wasOn
                    ? "border-paper text-paper peer-not-checked:border-signal peer-not-checked:text-steel peer-not-checked:line-through"
                    : "border-seam-strong text-steel hover:border-steel hover:text-paper peer-checked:border-signal peer-checked:text-signal"
                }`}
              >
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 10 8"
                  aria-hidden="true"
                >
                  <path
                    d="M1 4l2.5 2.5L9 1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
const chip = "rounded-md border border-seam-strong px-2 py-0.5 text-[13px]";
const linkButton =
  "rounded-md border border-seam-strong px-2.5 py-1 text-[13px] text-steel transition-colors hover:border-steel hover:text-paper";

/** The profile beside the job board: read by default, edited after "Sửa" (or right after a CV upload). */
function CvRow({ cv }: { cv: CvFile }) {
  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block truncate" title={cv.fileName}>
          {cv.fileName}
        </span>
        <span className="figure block text-xs text-steel">
          {updatedAt(cv.uploadedAt)}
        </span>
      </span>
      <a
        href={`/cv/${cv.id}`}
        target="_blank"
        rel="noopener"
        className="text-steel underline-offset-4 hover:text-paper hover:underline"
      >
        Xem
      </a>
      <a
        href={`/cv/${cv.id}?download=1`}
        className="text-steel underline-offset-4 hover:text-paper hover:underline"
      >
        Tải
      </a>
    </li>
  );
}

export function ProfilePanel({
  profile,
  cvs,
  saved,
  editing,
  className = "",
}: {
  profile: Profile;
  cvs: CvFile[];
  saved?: string;
  editing: boolean;
  className?: string;
}) {
  const [current, ...older] = cvs;
  const lit = new Set(
    String(saved ?? "")
      .split(",")
      .filter((f): f is ProfileField =>
        (PROFILE_FIELDS as readonly string[]).includes(f),
      ),
  );
  const names = (keys: string[], all: Record<string, string>) =>
    keys.map((k) => all[k] ?? k).join(", ") || "—";

  const header = (
    <div className="flex items-center justify-between gap-3 border-b border-seam px-4 py-3">
      <h2 id="profile-title" className="font-semibold">
        Profile
      </h2>
      {editing ? (
        <Link href="/" className={linkButton}>
          Hủy
        </Link>
      ) : (
        <Link href="/?edit=1" className={linkButton}>
          Sửa
        </Link>
      )}
    </div>
  );

  return (
    <aside
      aria-labelledby="profile-title"
      className={`relative flex flex-col gap-4 ${className}`}
    >
      {editing ? (
        <form
          action={updateProfile}
          className="rounded-md border border-seam bg-slate"
        >
          {header}
          <Segment caption="Skill">
            <SkillsInput initial={profile.skills} />
          </Segment>
          <Segment caption="Vị trí muốn làm" className="border-t border-seam">
            <Toggles
              name="roles"
              label="Vị trí muốn làm"
              options={ROLES}
              checked={profile.roles}
            />
          </Segment>
          <Segment caption="Nơi làm việc" className="border-t border-seam">
            <Toggles
              name="locations"
              label="Nơi làm việc"
              options={LOCATIONS}
              checked={profile.locations}
            />
          </Segment>
          <div className="grid grid-cols-2 divide-x divide-seam border-t border-seam">
            <Segment caption="Kinh nghiệm" htmlFor="years">
              <PassNumber
                id="years"
                name="years"
                initial={profile.years}
                unit="năm"
                max={40}
                placeholder="—"
              />
            </Segment>
            <Segment caption="Lương tối thiểu" htmlFor="minSalaryUsd">
              <PassNumber
                id="minSalaryUsd"
                name="minSalaryUsd"
                initial={profile.minSalaryUsd}
                unit="USD/th"
                step={100}
                placeholder="—"
              />
            </Segment>
          </div>
          <div className="border-t border-seam px-4 py-3">
            <button type="submit" className={buttonPrimary}>
              Lưu profile
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-md border border-seam bg-slate">
          {header}
          {saved && (
            <p
              role="status"
              className="border-b border-seam bg-signal-dim px-4 py-2 text-sm text-signal"
            >
              {lit.size
                ? `Đã lưu: ${[...lit].map((f) => FIELD_NAMES[f]).join(", ")}`
                : "Không có gì thay đổi"}
            </p>
          )}
          <Segment caption="Skill" lit={lit.has("skills")}>
            <ul className="flex flex-wrap gap-1.5">
              {profile.skills.map((sk) => (
                <li key={sk} className={chip}>
                  {sk}
                </li>
              ))}
              {!profile.skills.length && (
                <li className="text-sm text-steel">—</li>
              )}
            </ul>
          </Segment>
          <Segment
            caption="Vị trí"
            lit={lit.has("roles")}
            className="border-t border-seam"
          >
            <p className="text-sm">{names(profile.roles, ROLES)}</p>
          </Segment>
          <Segment
            caption="Nơi làm"
            lit={lit.has("locations")}
            className="border-t border-seam"
          >
            <p className="text-sm">{names(profile.locations, LOCATIONS)}</p>
          </Segment>
          <div className="grid grid-cols-2 divide-x divide-seam border-t border-seam">
            <Segment caption="Kinh nghiệm" lit={lit.has("years")}>
              <p className="text-sm">
                <span className="figure text-xl">{profile.years ?? "—"}</span>{" "}
                năm
              </p>
            </Segment>
            <Segment caption="Lương tối thiểu" lit={lit.has("minSalaryUsd")}>
              <p className="text-sm">
                <span className="figure text-xl">
                  {profile.minSalaryUsd?.toLocaleString("vi-VN") ?? "—"}
                </span>{" "}
                USD/th
              </p>
            </Segment>
          </div>
        </div>
      )}

      {!editing && (
        <section
          aria-labelledby="cv-title"
          className="rounded-md border border-seam bg-slate px-4 py-3"
        >
          <h2 id="cv-title" className="caption mb-1">
            CV
          </h2>
          {current && (
            <ul>
              <CvRow cv={current} />
            </ul>
          )}
          {older.length > 0 && (
            <details className="mt-1 border-t border-seam pt-1.5">
              <summary className="cursor-pointer text-sm text-steel hover:text-paper">
                CV cũ (<span className="figure">{older.length}</span>)
              </summary>
              <ul className="mt-1">
                {older.map((cv) => (
                  <CvRow key={cv.id} cv={cv} />
                ))}
              </ul>
            </details>
          )}
          <div className="mt-3">
            <UploadForm label="Upload CV mới" />
          </div>
        </section>
      )}
    </aside>
  );
}
