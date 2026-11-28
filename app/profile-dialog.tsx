"use client";

import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { LOCATIONS, ROLES } from "@/lib/cv";
import type { Profile } from "@/lib/db";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { type ProfileState, updateProfile } from "./actions";
import { PassNumber } from "./pass-number";
import { Segment, Toggles } from "./profile-fields";
import { SkillsInput } from "./skills-input";
import { UploadForm } from "./upload-form";

type Step = "upload" | "edit";
type EditableProfile = Omit<Profile, "cvText">;

const trigger = "rounded-md border border-seam-strong px-2.5 py-1 text-[13px] text-steel transition-colors hover:border-steel hover:text-paper";

/**
 * One dialog, two ways in: "New CV" starts at the upload step and moves to the editor once the CV is read;
 * "Edit" opens the editor directly. `openOnLoad` opens the editor right after the first-run upload.
 */
export function ProfileDialog({ profile, openOnLoad }: { profile: EditableProfile; openOnLoad: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("edit");
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, { error: null, saved: null });

  const open = (s: Step) => {
    setStep(s);
    dialog.current?.showModal();
  };
  const onUploaded = useCallback(() => {
    setStep("edit");
    router.refresh(); // brings in the profile read from the new CV
  }, [router]);

  useEffect(() => {
    if (openOnLoad) {
      dialog.current?.showModal();
      router.replace("/", { scroll: false });
    }
  }, [openOnLoad, router]);

  useEffect(() => {
    if (!state.saved) return;
    dialog.current?.close();
    router.replace(`/?saved=${state.saved}`, { scroll: false });
  }, [state, router]);

  return (
    <>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => open("edit")} className={trigger}>
          Edit
        </button>
        <button type="button" onClick={() => open("upload")} className={trigger}>
          New CV
        </button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="profile-dialog-title"
        className="m-auto w-[min(44rem,calc(100vw-2rem))] rounded-md border border-seam-strong bg-slate p-0 text-paper backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 id="profile-dialog-title" className="font-semibold">
            {step === "upload" ? "New CV" : "Edit profile"}
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-seam hover:text-paper">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {step === "upload" ? (
          <div className="border-t border-seam px-5 py-5">
            <UploadForm onDone={onUploaded} />
          </div>
        ) : (
          // Remounts when the profile changes (a new CV was read), so the fields start from the new values.
          <form key={profile.updatedAt} action={action}>
            <Segment caption="Skills" className="border-t border-seam">
              <SkillsInput initial={profile.skills} />
            </Segment>
            <div className="grid border-t border-seam sm:grid-cols-2 sm:divide-x sm:divide-seam">
              <Segment caption="Roles">
                <Toggles name="roles" label="Roles" options={ROLES} checked={profile.roles} />
              </Segment>
              <Segment caption="Locations" className="border-t border-seam sm:border-t-0">
                <Toggles name="locations" label="Locations" options={LOCATIONS} checked={profile.locations} />
              </Segment>
            </div>
            <div className="grid grid-cols-2 divide-x divide-seam border-t border-seam">
              <Segment caption="Experience" htmlFor="years">
                <PassNumber id="years" name="years" initial={profile.years} unit="yrs" max={40} placeholder="—" />
              </Segment>
              <Segment caption="Minimum salary" htmlFor="minSalaryUsd">
                <PassNumber id="minSalaryUsd" name="minSalaryUsd" initial={profile.minSalaryUsd} unit="USD/mo" step={100} placeholder="—" />
              </Segment>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-seam px-5 py-4">
              <button type="submit" disabled={pending} className={buttonPrimary}>
                {pending ? "Saving…" : "Save profile"}
              </button>
              <button type="button" onClick={() => dialog.current?.close()} className={buttonSecondary}>
                Cancel
              </button>
              {state.error && (
                <p role="alert" className="text-sm text-alert">
                  {state.error}
                </p>
              )}
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
