import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCalendarDate } from "@/lib/date";
import UnitEditForm from "./UnitEditForm";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ projectId: string; unitId: string }>;
}) {
  const { projectId, unitId } = await params;

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { project: true, visits: { orderBy: { sequence: "asc" } } },
  });
  if (!unit || unit.projectId !== projectId) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-slate-500 underline hover:text-slate-900">
        ← Back to {unit.project.name}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">{unit.siteName ?? "Unnamed unit"}</h1>
      <p className="text-sm text-slate-500">Sr No: {unit.srNoRaw ?? "—"}</p>

      <div className="mt-6">
        <UnitEditForm
          unit={{
            id: unit.id,
            siteName: unit.siteName ?? "",
            block: unit.block ?? "",
            contactInfo: unit.contactInfo ?? "",
            hp: unit.hp !== null ? String(unit.hp) : "",
            through: unit.through ?? "",
            type: unit.type ?? "",
            billNo: unit.billNo ?? "",
            remarks: unit.remarks ?? "",
            status: unit.status,
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">AMC Period</h2>
          <p className="mt-1 text-sm text-slate-600">{unit.amcPeriodText ?? "—"}</p>
          {unit.amcPeriodStart && unit.amcPeriodEnd && (
            <p className="text-xs text-slate-400">
              Parsed: {formatCalendarDate(unit.amcPeriodStart)} –{" "}
              {formatCalendarDate(unit.amcPeriodEnd)}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">New AMC Period</h2>
          <p className="mt-1 text-sm text-slate-600">{unit.newAmcPeriodText ?? "—"}</p>
          {unit.newAmcPeriodStart && unit.newAmcPeriodEnd && (
            <p className="text-xs text-slate-400">
              Parsed: {formatCalendarDate(unit.newAmcPeriodStart)} –{" "}
              {formatCalendarDate(unit.newAmcPeriodEnd)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Service visit history</h2>
        {unit.visits.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No recorded visits.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-1 pr-4">#</th>
                <th className="pb-1 pr-4">Date</th>
                <th className="pb-1">Raw value</th>
              </tr>
            </thead>
            <tbody>
              {unit.visits.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="py-1 pr-4 text-slate-500">{v.sequence}</td>
                  <td className="py-1 pr-4">
                    {v.visitDate ? formatCalendarDate(v.visitDate) : <span className="text-slate-400">unparsed</span>}
                  </td>
                  <td className="py-1 text-slate-500">{v.rawText ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
