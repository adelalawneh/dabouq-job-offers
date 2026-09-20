import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteOffer, getOffer, updateOffer } from "@/lib/offers";
import { getSession } from "@/lib/session";
import { apiErrorMessage } from "@/lib/validation";

const patchSchema = z.object({
  candidateName: z.string().trim().min(1).optional(),
  candidateEmail: z.string().email().optional().or(z.literal("")),
  candidateNationality: z.string().optional(),
  documentNumber: z.string().optional(),
  jobTitle: z.string().trim().min(1).optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  contractType: z.string().optional(),
  contractDuration: z.string().optional(),
  workDays: z.string().optional(),
  probation: z.string().optional(),
  annualLeave: z.string().optional(),
  totalSalary: z.number().positive().optional(),
  insurance: z.number().min(0).optional(),
  basic: z.number().min(0).optional(),
  housing: z.number().min(0).optional(),
  transport: z.number().min(0).optional(),
  netSalary: z.number().min(0).optional(),
  language: z.string().optional(),
  footerSalaryReview: z.string().optional(),
  footerValidity: z.string().optional(),
  footerAcceptance: z.string().optional(),
  footerRejection: z.string().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(offer);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;

  try {
    const existing = await getOffer(id);
    if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const body = patchSchema.parse(await request.json());
    const offer = await updateOffer(id, {
      ...body,
      candidateEmail: body.candidateEmail !== undefined ? body.candidateEmail || null : undefined,
    });
    if (!offer) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    return NextResponse.json({ id: offer.id, offer });
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteOffer(id, true);
  if (!ok) return NextResponse.json({ error: "لا يمكن حذف غير المسودات" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
