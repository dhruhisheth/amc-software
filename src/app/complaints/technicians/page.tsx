import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/auth/guards";
import { canDelete, canEdit } from "@/lib/auth/permissions";
import { AddTechnicianForm, TechnicianRow } from "./TechnicianForms";

export default async function TechniciansPage() {
  const session = await requireView();
  const editable = canEdit(session.user.role);
  const deletable = canDelete(session.user.role);

  const technicians = await prisma.technician.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { complaints: true, visits: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
      <div>
        <Link href="/complaints" className="text-sm text-slate-500 underline hover:text-slate-900">
          ← All complaints
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Technicians</h1>
        <p className="mt-1 text-sm text-slate-500">
          The people who attend complaints and carry out services. Everyone here can be picked by
          name on a complaint or a service visit.
        </p>
      </div>

      {editable && <AddTechnicianForm />}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Skills / notes</th>
              <th className="px-3 py-2">Attended</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {technicians.map((t) => (
              <TechnicianRow
                key={t.id}
                technicianId={t.id}
                initial={{
                  name: t.name,
                  phone: t.phone ?? "",
                  skills: t.skills ?? "",
                  active: t.active,
                }}
                complaintCount={t._count.complaints}
                visitCount={t._count.visits}
                editable={editable}
                deletable={deletable}
              />
            ))}
            {technicians.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No technicians yet. Add one above so complaints can be assigned by name.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
