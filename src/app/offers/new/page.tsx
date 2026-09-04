import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEdit } from "@/lib/auth/guards";
import { toDateInputValue, todayUtcMidnight } from "@/lib/date";
import { unitLabel } from "@/lib/units";
import { OfferForm } from "../OfferForms";
import type { OfferInput, OfferItemInput } from "../actions";

type SearchParams = Record<string, string | string[] | undefined>;

function param(sp: SearchParams, key: string): string {
  const value = sp[key];
  return typeof value === "string" ? value : "";
}

/**
 * Prefills a new AMC offer from what it is being generated for:
 *  - `?unitId=` — a single flat, one line item.
 *  - `?projectId=` — the whole project, one line item per flat.
 * Rates are left at zero for whoever is quoting to fill in.
 */
export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireEdit();
  const sp = await searchParams;

  const unitId = param(sp, "unitId");
  const projectIdParam = param(sp, "projectId");

  const [projects, appSettings] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);

  const unit = unitId
    ? await prisma.unit.findUnique({ where: { id: unitId }, include: { project: true } })
    : null;

  const projectId = unit?.projectId ?? projectIdParam;
  const project = projectId
    ? await prisma.project.findUnique({
        where: { id: projectId },
        include: { units: { orderBy: [{ block: "asc" }, { flatNo: "asc" }] } },
      })
    : null;

  function lineFor(u: { block: string | null; flatNo: string | null; siteName: string | null; type: string | null; hp: number | null }): OfferItemInput {
    return {
      description: [unitLabel(u), u.type].filter(Boolean).join(" — "),
      hp: u.hp !== null ? String(u.hp) : "",
      quantity: "1",
      unitRate: "",
    };
  }

  const items: OfferItemInput[] = unit
    ? [lineFor(unit)]
    : project && project.units.length > 0
      ? project.units.map(lineFor)
      : [{ description: "Annual maintenance contract", hp: "", quantity: "1", unitRate: "" }];

  const scope = unit ? "flat" : project ? "project" : null;

  const initial: OfferInput = {
    projectId: projectId ?? "",
    unitId: unit?.id ?? "",
    customerName: unit?.siteName ?? project?.name ?? "",
    customerAddress: unit?.address ?? project?.address ?? "",
    offerDate: toDateInputValue(todayUtcMidnight()),
    validUntil: "",
    periodStart: "",
    periodEnd: "",
    taxPercent: String(appSettings.offerTaxPercent),
    notes: "",
    termsText: appSettings.offerTermsText,
    status: "DRAFT",
    items,
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/offers" className="text-sm text-slate-500 underline hover:text-slate-900">
        ← All AMC offers
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Generate AMC offer</h1>
      <p className="mt-1 text-sm text-slate-500">
        {scope === "flat" && unit
          ? `For ${unitLabel(unit)} in ${unit.project.name}.`
          : scope === "project" && project
            ? `For ${project.name} — one line per flat, prefilled from the project.`
            : "An offer number is allocated automatically once it is saved."}
      </p>

      <div className="mt-6">
        <OfferForm mode="create" initial={initial} projects={projects} />
      </div>
    </div>
  );
}
