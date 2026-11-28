import { getProfile } from "@/lib/db";
import { JobBoard } from "./job-board";
import { ProfilePanel } from "./profile-panel";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Đọc CV", "Lấy skill, vị trí, nơi làm và số năm kinh nghiệm, ngay trên máy này."],
  ["Bạn sửa lại", "Xem profile app đọc được, chỉnh chỗ sai."],
  ["Tìm job mỗi ngày", "Từ trang tuyển dụng của công ty và các trang IT, xếp theo độ hợp."],
] as const;

export default async function Home({ searchParams }: PageProps<"/">) {
  const profile = getProfile();
  if (profile) {
    const { saved } = await searchParams;
    return (
      // Desktop: one screen, each column scrolls on its own. Phone: stacked, jobs first.
      <main className="mx-auto grid w-full max-w-[90rem] gap-6 px-4 py-6 sm:px-8 lg:h-[calc(100dvh-3.5rem-1px)] lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden">
        <ProfilePanel profile={profile} saved={typeof saved === "string" ? saved : undefined} className="order-last lg:order-none lg:overflow-y-auto lg:pr-1" />
        <JobBoard profile={profile} className="max-lg:max-h-[80dvh]" />
      </main>
    );
  }
  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-x-20 lg:py-24">
      <div className="lg:col-start-1 lg:row-start-1">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Upload CV, nhận danh sách job hợp với bạn.
        </h1>
        <p className="mt-4 max-w-md text-steel">
          Job IT ở Việt Nam và remote. CV chỉ nằm trên máy này, không gửi đi đâu.
        </p>
      </div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-2">
        <UploadForm label="Đọc CV" large />
      </div>
      <ol className="border-t border-seam lg:col-start-1 lg:row-start-2">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-b border-seam py-4">
            <span className="figure text-sm text-steel">{i + 1}</span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-steel">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
