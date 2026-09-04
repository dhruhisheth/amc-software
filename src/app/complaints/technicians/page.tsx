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
    <div className="app-content narrow">
      <div>
        <Link href="/complaints" className="back-link">
          ← All complaints
        </Link>
        <h1>Technicians</h1>
        <p className="muted">
          The people who attend complaints and carry out services. Everyone here can be picked by
          name on a complaint or a service visit.
        </p>
      </div>

      {editable && <AddTechnicianForm />}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Skills / notes</th>
              <th>Attended</th>
              <th></th>
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
                <td colSpan={5} className="empty-state">
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
