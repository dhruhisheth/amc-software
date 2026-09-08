"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDelete, requireEdit } from "@/lib/auth/guards";
import { emptyToNull, normalizeName, requiredText } from "@/lib/forms";
import { parseDateInput, todayUtcMidnight } from "@/lib/date";
import {
  buildTicketNo,
  nextTicketSerial,
  ticketNoPrefix,
  type ComplaintInput,
} from "@/lib/complaints";
import { Prisma } from "@/generated/prisma/client";

/**
 * Allocate the next ticket number for this calendar year. Done inside the caller's transaction
 * and re-tried on a unique-constraint clash, since two people filing at once would otherwise
 * both read the same "latest" row and build the same number.
 */
async function allocateTicketNo(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const latest = await tx.complaint.findFirst({
    where: { ticketNo: { startsWith: ticketNoPrefix(now) } },
    orderBy: { ticketNo: "desc" },
    select: { ticketNo: true },
  });
  return buildTicketNo(now, nextTicketSerial(latest?.ticketNo ?? null));
}

function complaintDataFromInput(input: ComplaintInput) {
  const status = input.status;
  if (input.technicianId && input.technicianId === input.technician2Id) {
    throw new Error("The two attending technicians must be different people.");
  }
  const attendedAt = parseDateInput(input.attendedAt);
  const resolvedAt = parseDateInput(input.resolvedAt);

  return {
    projectId: emptyToNull(input.projectId),
    unitId: emptyToNull(input.unitId),
    complainantName: emptyToNull(input.complainantName),
    contactNumber: emptyToNull(input.contactNumber),
    subject: requiredText(input.subject, "Subject"),
    description: emptyToNull(input.description),
    priority: input.priority,
    technicianId: emptyToNull(input.technicianId),
    technician2Id: emptyToNull(input.technician2Id),
    status,
    // Stamp the milestone dates from the status when they weren't filled in by hand, so the
    // complaint history has real dates without the user having to remember to set them.
    attendedAt:
      attendedAt ?? (status === "IN_PROGRESS" || status === "ASSIGNED" ? todayUtcMidnight() : null),
    resolvedAt:
      resolvedAt ?? (status === "RESOLVED" || status === "CLOSED" ? todayUtcMidnight() : null),
    resolutionNotes: emptyToNull(input.resolutionNotes),
  };
}

export async function createComplaint(input: ComplaintInput): Promise<string> {
  await requireEdit();

  const data = complaintDataFromInput(input);
  // A complaint filed against a flat belongs to that flat's project even if the form didn't say so.
  if (data.unitId && !data.projectId) {
    const unit = await prisma.unit.findUnique({
      where: { id: data.unitId },
      select: { projectId: true },
    });
    data.projectId = unit?.projectId ?? null;
  }

  const now = new Date();
  let complaintId = "";

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const ticketNo = await allocateTicketNo(tx, now);
        return tx.complaint.create({ data: { ...data, ticketNo } });
      });
      complaintId = created.id;
      break;
    } catch (err) {
      const isTicketClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isTicketClash || attempt === 4) throw err;
    }
  }

  revalidatePath("/complaints");
  revalidatePath("/");
  return complaintId;
}

export async function updateComplaint(complaintId: string, input: ComplaintInput): Promise<void> {
  await requireEdit();

  await prisma.complaint.update({
    where: { id: complaintId },
    data: complaintDataFromInput(input),
  });

  revalidatePath("/complaints");
  revalidatePath(`/complaints/${complaintId}`);
  revalidatePath("/");
}

/**
 * Assign (or reassign) one of the two attending technicians, straight from the list.
 * `slot` 1 is the lead technician, 2 the second.
 */
export async function assignTechnician(
  complaintId: string,
  technicianId: string,
  slot: 1 | 2 = 1
): Promise<void> {
  await requireEdit();

  const complaint = await prisma.complaint.findUniqueOrThrow({
    where: { id: complaintId },
    select: { status: true, attendedAt: true, technicianId: true, technician2Id: true },
  });
  const assigned = emptyToNull(technicianId);

  const other = slot === 1 ? complaint.technician2Id : complaint.technicianId;
  if (assigned && assigned === other) {
    throw new Error("That technician is already the other person attending this complaint.");
  }

  const anyAssigned = slot === 1 ? !!assigned || !!other : !!other || !!assigned;

  await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      ...(slot === 1 ? { technicianId: assigned } : { technician2Id: assigned }),
      // Assigning someone moves an untouched complaint out of OPEN; a complaint already being
      // worked on or finished keeps the status it has.
      status: anyAssigned && complaint.status === "OPEN" ? "ASSIGNED" : complaint.status,
      attendedAt: anyAssigned ? (complaint.attendedAt ?? todayUtcMidnight()) : complaint.attendedAt,
    },
  });

  revalidatePath("/complaints");
  revalidatePath(`/complaints/${complaintId}`);
}

export async function deleteComplaint(complaintId: string): Promise<void> {
  await requireDelete();
  await prisma.complaint.delete({ where: { id: complaintId } });
  revalidatePath("/complaints");
  revalidatePath("/");
  redirect("/complaints");
}

/* ------------------------------------------------------------------------------ technicians */

export interface TechnicianInput {
  name: string;
  phone: string;
  skills: string;
  active: boolean;
}

export async function createTechnician(input: TechnicianInput): Promise<void> {
  await requireEdit();

  const name = requiredText(input.name, "Technician name");
  const normalizedName = normalizeName(name);

  const clash = await prisma.technician.findUnique({ where: { normalizedName } });
  if (clash) throw new Error(`A technician named "${clash.name}" already exists.`);

  try {
    await prisma.technician.create({
      data: {
        name,
        normalizedName,
        phone: emptyToNull(input.phone),
        skills: emptyToNull(input.skills),
        active: input.active,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`A technician named "${name}" already exists.`);
    }
    throw err;
  }

  revalidatePath("/complaints/technicians");
  revalidatePath("/complaints");
}

export async function updateTechnician(technicianId: string, input: TechnicianInput): Promise<void> {
  await requireEdit();

  const name = requiredText(input.name, "Technician name");
  const normalizedName = normalizeName(name);

  const clash = await prisma.technician.findUnique({ where: { normalizedName } });
  if (clash && clash.id !== technicianId) {
    throw new Error(`A technician named "${clash.name}" already exists.`);
  }

  await prisma.technician.update({
    where: { id: technicianId },
    data: {
      name,
      normalizedName,
      phone: emptyToNull(input.phone),
      skills: emptyToNull(input.skills),
      active: input.active,
    },
  });

  revalidatePath("/complaints/technicians");
  revalidatePath("/complaints");
}

/**
 * Admin-only. A technician who has attended anything is deactivated rather than deleted, so the
 * complaint and service history keeps the name of whoever actually attended.
 */
export async function deleteTechnician(technicianId: string): Promise<void> {
  await requireDelete();

  const [complaintCount, visitCount] = await Promise.all([
    prisma.complaint.count({ where: { technicianId } }),
    prisma.serviceVisit.count({ where: { technicianId } }),
  ]);

  if (complaintCount > 0 || visitCount > 0) {
    throw new Error(
      "This technician is named on existing complaints or service visits. Mark them inactive " +
        "instead — deleting them would erase who attended that work."
    );
  }

  await prisma.technician.delete({ where: { id: technicianId } });
  revalidatePath("/complaints/technicians");
}
