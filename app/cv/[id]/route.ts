import { readFile } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { cvPath, getCv } from "@/lib/db";

/** An uploaded CV: shown in the browser, or downloaded with ?download=1. */
export async function GET(req: NextRequest, ctx: RouteContext<"/cv/[id]">) {
  const id = Number((await ctx.params).id);
  const cv = Number.isInteger(id) ? getCv(id) : null;
  const bytes = cv ? await readFile(cvPath(cv.id)).catch(() => null) : null;
  if (!cv || !bytes) return new Response("Không tìm thấy CV", { status: 404 });
  const disposition = req.nextUrl.searchParams.has("download") ? "attachment" : "inline";
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="cv-${cv.id}.pdf"; filename*=UTF-8''${encodeURIComponent(cv.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
