"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDelete, requireEdit } from "@/lib/auth/guards";
import { emptyToNull, requiredText } from "@/lib/forms";
import { parseDateInput } from "@/lib/date";
import { buildOfferNo, nextOfferSerial, offerNoPrefix } from "@/lib/offer";
import type { OfferStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

export interface OfferItemInput {
  description: string;
  hp: string;
  quantity: string;
  unitRate: string;
}

export interface OfferInput {
  projectId: string;
  unitId: string;
  customerName: string;
  customerAddress: string;
  offerDate: string;
  validUntil: string;
  periodStart: string;
  periodEnd: string;
  taxPercent: string;
  notes: string;
  termsText: string;
  status: OfferStatus;
  items: OfferItemInput[];
}

/**
 * Allocate the next offer number for the current financial year, inside the caller's
 * transaction. Retried on a unique clash for the same reason complaint tickets are.
 */
async function allocateOfferNo(tx: Prisma.TransactionClient, date: Date): Promise<string> {
  const latest = await tx.amcOffer.findFirst({
    where: { offerNo: { startsWith: offerNoPrefix(date) } },
    orderBy: { offerNo: "desc" },
    select: { offerNo: true },
  });
  return buildOfferNo(date, nextOfferSerial(latest?.offerNo ?? null));
}

function itemRows(items: OfferItemInput[]) {
  return items
    .filter((item) => item.description.trim().length > 0)
    .map((item, index) => ({
      sequence: index + 1,
      description: item.description.trim(),
      hp: item.hp.trim() ? Number(item.hp) : null,
      quantity: Number(item.quantity) || 1,
      unitRate: Number(item.unitRate) || 0,
    }))
    .map((row) => ({
      ...row,
      hp: row.hp !== null && Number.isFinite(row.hp) ? row.hp : null,
    }));
}

function offerScalarData(input: OfferInput) {
  const taxPercent = Number(input.taxPercent);
  return {
    projectId: emptyToNull(input.projectId),
    unitId: emptyToNull(input.unitId),
    customerName: requiredText(input.customerName, "Customer name"),
    customerAddress: emptyToNull(input.customerAddress),
    offerDate: parseDateInput(input.offerDate) ?? new Date(),
    validUntil: parseDateInput(input.validUntil),
    periodStart: parseDateInput(input.periodStart),
    periodEnd: parseDateInput(input.periodEnd),
    taxPercent: Number.isFinite(taxPercent) ? taxPercent : 0,
    notes: emptyToNull(input.notes),
    termsText: emptyToNull(input.termsText),
    status: input.status,
  };
}

export async function createOffer(input: OfferInput): Promise<string> {
  const session = await requireEdit();

  const data = offerScalarData(input);
  const items = itemRows(input.items);
  if (items.length === 0) throw new Error("An offer needs at least one line item.");

  let offerId = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const offerNo = await allocateOfferNo(tx, data.offerDate);
        return tx.amcOffer.create({
          data: {
            ...data,
            offerNo,
            createdById: session.user.id,
            items: { create: items },
          },
        });
      });
      offerId = created.id;
      break;
    } catch (err) {
      const isOfferNoClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isOfferNoClash || attempt === 4) throw err;
    }
  }

  revalidatePath("/offers");
  return offerId;
}

export async function updateOffer(offerId: string, input: OfferInput): Promise<void> {
  await requireEdit();

  const data = offerScalarData(input);
  const items = itemRows(input.items);
  if (items.length === 0) throw new Error("An offer needs at least one line item.");

  // Line items are replaced wholesale: they have no identity of their own, and rewriting them
  // keeps `sequence` contiguous after rows are added or removed in the form.
  await prisma.$transaction([
    prisma.amcOfferItem.deleteMany({ where: { offerId } }),
    prisma.amcOffer.update({
      where: { id: offerId },
      data: { ...data, items: { create: items } },
    }),
  ]);

  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
}

export async function updateOfferStatus(offerId: string, status: OfferStatus): Promise<void> {
  await requireEdit();
  await prisma.amcOffer.update({ where: { id: offerId }, data: { status } });
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
}

export async function deleteOffer(offerId: string): Promise<void> {
  await requireDelete();
  await prisma.amcOffer.delete({ where: { id: offerId } });
  revalidatePath("/offers");
  redirect("/offers");
}
