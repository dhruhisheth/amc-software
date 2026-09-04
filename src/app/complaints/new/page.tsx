import Link from "next/link";
import { requireEdit } from "@/lib/auth/guards";
import { loadPickerOptions } from "@/lib/complaintOptions";
import { ComplaintForm } from "../ComplaintForms";
import { EMPTY_COMPLAINT_INPUT } from "@/lib/complaints";

type SearchParams = Record<string, string | string[] | undefined>;

function param(sp: SearchParams, key: string): string {
  const value = sp[key];
  return typeof value === "string" ? value : "";
}

export default async function NewComplaintPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireEdit();
  const sp = await searchParams;
  const { projects, units, technicians } = await loadPickerOptions();

  // Reached from a flat's page as /complaints/new?unitId=..., so the flat is pre-selected.
  const unitId = param(sp, "unitId");
  const unit = units.find((u) => u.id === unitId);

  return (
    <div className="app-content narrow">
      <Link href="/complaints" className="back-link">
        ← All complaints
      </Link>
      <h1>Log a complaint</h1>
      <p className="muted">
        A ticket number is allocated automatically once the complaint is saved.
      </p>

      <div>
        <ComplaintForm
          mode="create"
          initial={{
            ...EMPTY_COMPLAINT_INPUT,
            unitId: unit?.id ?? "",
            projectId: unit?.projectId ?? param(sp, "projectId"),
          }}
          projects={projects}
          units={units}
          technicians={technicians}
        />
      </div>
    </div>
  );
}
