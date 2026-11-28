import { redirect } from "next/navigation";
import { LOCATIONS, ROLES } from "@/lib/cv";
import { getProfile } from "@/lib/db";
import { updateProfile } from "../actions";
import { UploadForm } from "../upload-form";

export const dynamic = "force-dynamic";

const field = "rounded border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-700";

function Checkboxes({ name, options, checked }: { name: string; options: Record<string, string>; checked: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {Object.entries(options).map(([value, label]) => (
        <label key={value} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={name} value={value} defaultChecked={checked.includes(value)} />
          {label}
        </label>
      ))}
    </div>
  );
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const profile = getProfile();
  if (!profile) redirect("/");
  const { saved } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Đọc từ CV của bạn. Sửa lại cho đúng, app dùng phần này để chấm điểm job.
      </p>
      {saved && (
        <p role="status" className="mt-4 text-sm text-green-700 dark:text-green-400">
          Đã lưu.
        </p>
      )}

      <form action={updateProfile} className="mt-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="skills" className="text-sm font-medium">
            Skill <span className="font-normal text-neutral-500">(cách nhau bằng dấu phẩy)</span>
          </label>
          <textarea id="skills" name="skills" rows={3} defaultValue={profile.skills.join(", ")} className={field} />
          {profile.skills.length === 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400">Không tìm thấy skill nào trong CV. Hãy tự thêm.</p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Vị trí muốn làm</legend>
          <Checkboxes name="roles" options={ROLES} checked={profile.roles} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Nơi làm việc</legend>
          <Checkboxes name="locations" options={LOCATIONS} checked={profile.locations} />
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="years" className="text-sm font-medium">Số năm kinh nghiệm</label>
            <input id="years" name="years" type="number" min={0} max={40} defaultValue={profile.years ?? ""} className={field} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="minSalaryUsd" className="text-sm font-medium">Lương tối thiểu (USD/tháng)</label>
            <input id="minSalaryUsd" name="minSalaryUsd" type="number" min={0} step={100} defaultValue={profile.minSalaryUsd ?? ""} className={field} />
          </div>
        </div>

        <button type="submit" className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
          Lưu profile
        </button>
      </form>

      <section className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 className="text-sm font-medium">Đổi CV</h2>
        <p className="mt-1 mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Upload CV mới sẽ đọc lại skill, vị trí, nơi làm việc và số năm kinh nghiệm.
        </p>
        <UploadForm label="Upload CV mới" />
      </section>
    </main>
  );
}
