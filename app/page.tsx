import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default function Home() {
  // shortcut: no job feed yet, so a saved profile goes straight to /profile; point this at the feed once F4 lands.
  if (getProfile()) redirect("/profile");
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Job Radar</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Upload CV để app tìm job IT hợp với bạn, ở Việt Nam và remote. CV chỉ lưu trên máy này.
      </p>
      <div className="mt-8">
        <UploadForm label="Đọc CV" />
      </div>
    </main>
  );
}
