import { getProfile, listCvs } from "@/lib/db";
import { JobBoard } from "./job-board";
import { ProfilePanel } from "./profile-panel";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const profile = getProfile();
  if (profile) {
    const { saved, edit } = await searchParams;
    return (
      // Desktop: one screen, each column scrolls on its own. Phone: stacked, jobs first.
      <main className="mx-auto grid w-full max-w-[90rem] gap-6 px-4 py-6 sm:px-8 lg:h-dvh lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden">
        <ProfilePanel profile={profile} cvs={listCvs()} saved={typeof saved === "string" ? saved : undefined} editing={edit === "1"} className="order-last lg:order-none lg:overflow-y-auto lg:pr-1" />
        <JobBoard profile={profile} className="max-lg:max-h-[80dvh]" />
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Job Radar</h1>
      <UploadForm label="Đọc CV" large />
    </main>
  );
}
