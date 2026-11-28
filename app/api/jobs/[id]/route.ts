import type { NextRequest } from "next/server";
import { getProfile } from "@/lib/db";
import { markViewed } from "@/lib/jobs";
import { getJob, scoreJob } from "@/lib/score";
import { splitSections } from "@/lib/sections";

/** One job for the detail dialog: facts, score with skills, and the description split into sections. Opening it marks it viewed. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]">) {
  const id = Number((await ctx.params).id);
  const job = Number.isInteger(id) ? getJob(id) : null;
  const profile = getProfile();
  if (!job || !profile) return Response.json({ error: "Job not found" }, { status: 404 });
  markViewed(job.id);
  const { description, ...scored } = scoreJob(job, profile);
  return Response.json({ ...scored, sections: splitSections(description) });
}
