import { NextResponse } from "next/server";
import { z } from "zod";
import { createOffer } from "@/lib/offers";
import { getSession } from "@/lib/session";

const schema = z.object({
  candidateName: z.string().min(1),
  candidateEmail: z.string().email().optional().or(z.literal("")),
  candidateNationality: z.string().optional(),
  documentNumber: z.string().optional(),
  jobTitle: z.string().min(1),
  department: z.string().optional(),
  location: z.string().optional(),
  contractType: z.string().optional(),
  contractDuration: z.string().optional(),
  workDays: z.string().optional(),
  probation: z.string().optional(),
  annualLeave: z.string().optional(),
  totalSalary: z.number().positive(),
  insurance: z.number().min(0).optional(),
  language: z.string().optional(),
  footerSalaryReview: z.string().optional(),
  footerValidity: z.string().optional(),
  footerAcceptance: z.string().optional(),
  footerRejection: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const offer = await createOffer({
      ...body,
      candidateEmail: body.candidateEmail || null,
      createdBy: session.email || session.userId,
      organizationId: session.organizationId || null,
    });
    return NextResponse.json({ id: offer.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "طلب غير صالح" },
      { status: 400 },
    );
  }
}
