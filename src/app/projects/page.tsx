import Link from "next/link";
import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import { computeServiceBucket } from "@/lib/status";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: {
      units: { select: { nextServiceDueDate: true } },
      uploadLogs: { orderBy: { uploadedAt: "desc" }, take: 1, include: { uploadedBy: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
      <p className="mt-1 text-sm text-slate-500">Every building/project sheet uploaded so far.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {projects.map((project) => {
          const now = new Date();
          const overdue = project.units.filter(
            (u) => computeServiceBucket(u.nextServiceDueDate, now) === "OVERDUE"
          ).length;
          const lastUpload = project.uploadLogs[0];

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm"
            >
              <h2 className="font-semibold text-slate-900">{project.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {project.units.length} units{overdue > 0 && `, ${overdue} overdue`}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {lastUpload
                  ? `Last uploaded ${dayjs(lastUpload.uploadedAt).format("DD MMM YYYY")} by ${lastUpload.uploadedBy.name}`
                  : "Never uploaded"}
              </p>
            </Link>
          );
        })}
        {projects.length === 0 && (
          <p className="text-sm text-slate-400">No projects yet. Upload an Excel sheet to get started.</p>
        )}
      </div>
    </div>
  );
}
