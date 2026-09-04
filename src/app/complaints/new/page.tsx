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
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/complaints" className="text-sm text-slate-500 underline hover:text-slate-900">
        ← All complaints
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Log a complaint</h1>
      <p className="mt-1 text-sm text-slate-500">
        A ticket number is allocated automatically once the complaint is saved.
      </p>

      <div className="mt-6">
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
