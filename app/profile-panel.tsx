import { LOCATIONS, ROLES } from "@/lib/cv";
import { type CvFile, PROFILE_FIELDS, type Profile, type ProfileField } from "@/lib/db";
import { updatedAt } from "@/lib/ui";
import { CvViewer } from "./cv-viewer";
import { ProfileDialog } from "./profile-dialog";
import { FIELD_NAMES, Segment } from "./profile-fields";

const chip = "rounded-md bg-cool-dim px-2 py-0.5 text-[13px] text-cool";
const link = "text-steel underline-offset-4 hover:text-paper hover:underline";

function CvRow({ cv }: { cv: CvFile }) {
  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block truncate" title={cv.fileName}>
          {cv.fileName}
        </span>
        <span className="figure block text-xs text-steel">{updatedAt(cv.uploadedAt)}</span>
      </span>
      <CvViewer id={cv.id} fileName={cv.fileName} />
      <a href={`/cv/${cv.id}?download=1`} className={link}>
        Download
      </a>
    </li>
  );
}

/** The profile beside the job board, read-only; editing and new CVs go through ProfileDialog. */
export function ProfilePanel({ profile, cvs, saved, openEditor, className = "" }: { profile: Profile; cvs: CvFile[]; saved?: string; openEditor: boolean; className?: string }) {
  const lit = new Set(String(saved ?? "").split(",").filter((f): f is ProfileField => (PROFILE_FIELDS as readonly string[]).includes(f)));
  const names = (keys: string[], all: Record<string, string>) => keys.map((k) => all[k] ?? k).join(", ") || "—";
  const [current, ...older] = cvs;
  const { skills, roles, locations, years, minSalaryUsd, updatedAt: at } = profile;

  return (
    <aside aria-labelledby="profile-title" className={`relative flex flex-col gap-4 ${className}`}>
      <div className="rounded-md border border-seam bg-slate">
        <div className="flex items-center justify-between gap-3 border-b border-seam px-4 py-3">
          <h2 id="profile-title" className="font-semibold">
            Profile
          </h2>
          {/* The CV text stays on the server; the dialog only needs the editable fields. */}
          <ProfileDialog profile={{ skills, roles, locations, years, minSalaryUsd, updatedAt: at }} openOnLoad={openEditor} />
        </div>
        {saved && (
          <p role="status" className="border-b border-seam bg-signal-dim px-4 py-2 text-sm text-signal">
            {lit.size ? `Saved: ${[...lit].map((f) => FIELD_NAMES[f]).join(", ")}` : "Nothing changed"}
          </p>
        )}
        <Segment caption="Skills" lit={lit.has("skills")}>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((sk) => (
              <li key={sk} className={chip}>
                {sk}
              </li>
            ))}
            {!skills.length && <li className="text-sm text-steel">—</li>}
          </ul>
        </Segment>
        <Segment caption="Roles" lit={lit.has("roles")} className="border-t border-seam">
          <p className="text-sm">{names(roles, ROLES)}</p>
        </Segment>
        <Segment caption="Locations" lit={lit.has("locations")} className="border-t border-seam">
          <p className="text-sm">{names(locations, LOCATIONS)}</p>
        </Segment>
        <div className="grid grid-cols-2 divide-x divide-seam border-t border-seam">
          <Segment caption="Experience" lit={lit.has("years")}>
            <p className="text-sm">
              <span className="figure text-xl">{years ?? "—"}</span> yrs
            </p>
          </Segment>
          <Segment caption="Min salary" lit={lit.has("minSalaryUsd")}>
            <p className="text-sm">
              <span className="figure text-xl">{minSalaryUsd?.toLocaleString("en-US") ?? "—"}</span> USD/mo
            </p>
          </Segment>
        </div>
      </div>

      {current && (
        <section aria-labelledby="cv-title" className="rounded-md border border-seam bg-slate px-4 py-3">
          <h2 id="cv-title" className="caption mb-1">
            CV
          </h2>
          <ul>
            <CvRow cv={current} />
          </ul>
          {older.length > 0 && (
            <details className="mt-1 border-t border-seam pt-1.5">
              <summary className="cursor-pointer text-sm text-steel hover:text-paper">
                Older CVs (<span className="figure">{older.length}</span>)
              </summary>
              <ul className="mt-1">
                {older.map((cv) => (
                  <CvRow key={cv.id} cv={cv} />
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </aside>
  );
}
