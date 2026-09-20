import { prisma, type JobOffer, type JobOfferStatus, type Prisma } from "@/lib/db";
import { computeSalaryFields, resolveFooterFields } from "./helpers";
import { OFFER_VALIDITY_DAYS } from "./config";

export type OfferInput = {
  candidateName: string;
  candidateEmail?: string | null;
  candidateNationality?: string | null;
  documentNumber?: string | null;
  jobTitle: string;
  department?: string | null;
  location?: string | null;
  contractType?: string | null;
  contractDuration?: string | null;
  workDays?: string | null;
  probation?: string | null;
  annualLeave?: string | null;
  totalSalary: number;
  insurance?: number;
  basic?: number | null;
  housing?: number | null;
  transport?: number | null;
  netSalary?: number | null;
  language?: string;
  footerSalaryReview?: string | null;
  footerValidity?: string | null;
  footerAcceptance?: string | null;
  footerRejection?: string | null;
  createdBy?: string | null;
  organizationId?: string | null;
};

function withComputed(data: OfferInput) {
  const insurance = data.insurance ?? 0;
  const salary = computeSalaryFields(data.totalSalary, insurance, {
    basic: data.basic,
    housing: data.housing,
    transport: data.transport,
    netSalary: data.netSalary,
  });
  const footer = resolveFooterFields({
    language: data.language,
    footerSalaryReview: data.footerSalaryReview,
    footerValidity: data.footerValidity,
    footerAcceptance: data.footerAcceptance,
    footerRejection: data.footerRejection,
  });
  return {
    candidateName: data.candidateName,
    candidateEmail: data.candidateEmail || null,
    candidateNationality: data.candidateNationality || null,
    documentNumber: data.documentNumber || null,
    jobTitle: data.jobTitle,
    department: data.department || null,
    location: data.location || null,
    contractType: data.contractType || null,
    contractDuration: data.contractDuration || null,
    workDays: data.workDays || null,
    probation: data.probation || null,
    annualLeave: data.annualLeave || null,
    totalSalary: data.totalSalary,
    insurance,
    language: data.language || "العربية",
    createdBy: data.createdBy || null,
    organizationId: data.organizationId || null,
    ...salary,
    ...footer,
  };
}

export async function expireStaleOffers() {
  const now = new Date();
  await prisma.jobOffer.updateMany({
    where: { status: "sent", expiresAt: { lt: now } },
    data: { status: "expired" },
  });
}

export async function createOffer(data: OfferInput, status: JobOfferStatus = "draft") {
  const payload = withComputed(data);
  return prisma.jobOffer.create({
    data: { ...payload, status },
  });
}

export async function updateOffer(id: string, data: Partial<OfferInput>, status?: JobOfferStatus) {
  const existing = await prisma.jobOffer.findUnique({ where: { id } });
  if (!existing) return null;
  const merged: OfferInput = {
    candidateName: data.candidateName ?? existing.candidateName,
    candidateEmail: data.candidateEmail !== undefined ? data.candidateEmail : existing.candidateEmail,
    candidateNationality:
      data.candidateNationality !== undefined ? data.candidateNationality : existing.candidateNationality,
    documentNumber: data.documentNumber !== undefined ? data.documentNumber : existing.documentNumber,
    jobTitle: data.jobTitle ?? existing.jobTitle,
    department: data.department !== undefined ? data.department : existing.department,
    location: data.location !== undefined ? data.location : existing.location,
    contractType: data.contractType !== undefined ? data.contractType : existing.contractType,
    contractDuration: data.contractDuration !== undefined ? data.contractDuration : existing.contractDuration,
    workDays: data.workDays !== undefined ? data.workDays : existing.workDays,
    probation: data.probation !== undefined ? data.probation : existing.probation,
    annualLeave: data.annualLeave !== undefined ? data.annualLeave : existing.annualLeave,
    totalSalary: data.totalSalary ?? existing.totalSalary,
    insurance: data.insurance ?? existing.insurance,
    basic: data.basic !== undefined ? data.basic : existing.basic,
    housing: data.housing !== undefined ? data.housing : existing.housing,
    transport: data.transport !== undefined ? data.transport : existing.transport,
    netSalary: data.netSalary !== undefined ? data.netSalary : existing.netSalary,
    language: data.language ?? existing.language,
    footerSalaryReview:
      data.footerSalaryReview !== undefined ? data.footerSalaryReview : existing.footerSalaryReview,
    footerValidity: data.footerValidity !== undefined ? data.footerValidity : existing.footerValidity,
    footerAcceptance: data.footerAcceptance !== undefined ? data.footerAcceptance : existing.footerAcceptance,
    footerRejection: data.footerRejection !== undefined ? data.footerRejection : existing.footerRejection,
    createdBy: existing.createdBy,
    organizationId: existing.organizationId,
  };
  const payload = withComputed(merged);
  return prisma.jobOffer.update({
    where: { id },
    data: { ...payload, ...(status ? { status } : {}) },
  });
}

export async function markSent(id: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + OFFER_VALIDITY_DAYS);
  return prisma.jobOffer.update({
    where: { id },
    data: { status: "sent", sentAt: new Date(), expiresAt },
  });
}

export async function respondToOffer(
  id: string,
  accepted: boolean,
  startDate?: string | null,
  rejectionReason?: string | null,
) {
  return prisma.jobOffer.update({
    where: { id },
    data: {
      status: accepted ? "accepted" : "rejected",
      respondedAt: new Date(),
      startDate: startDate || null,
      rejectionReason: rejectionReason || null,
    },
  });
}

export async function deleteOffer(id: string, draftsOnly = true) {
  const where: Prisma.JobOfferWhereUniqueInput = { id };
  const offer = await prisma.jobOffer.findUnique({ where });
  if (!offer) return false;
  if (draftsOnly && offer.status !== "draft") return false;
  await prisma.jobOffer.delete({ where: { id } });
  return true;
}

export async function getOffer(id: string) {
  return prisma.jobOffer.findUnique({ where: { id } });
}

export async function getOfferByToken(token: string) {
  return prisma.jobOffer.findUnique({ where: { token } });
}

export async function listOffers(statusFilter?: string | null, search?: string | null) {
  await expireStaleOffers();
  const where: Prisma.JobOfferWhereInput = {};
  if (statusFilter && statusFilter !== "all") {
    where.status = statusFilter as JobOfferStatus;
  }
  if (search?.trim()) {
    const q = search.trim();
    where.OR = [
      { candidateName: { contains: q, mode: "insensitive" } },
      { candidateEmail: { contains: q, mode: "insensitive" } },
      { jobTitle: { contains: q, mode: "insensitive" } },
    ];
  }
  return prisma.jobOffer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getStats() {
  await expireStaleOffers();
  const rows = await prisma.jobOffer.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const stats: Record<string, number> = { total: 0 };
  for (const row of rows) {
    stats[row.status] = row._count._all;
    stats.total += row._count._all;
  }
  return stats;
}

export type { JobOffer };
