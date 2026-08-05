import { NextResponse } from "next/server";
import { getOffer, markSent } from "@/lib/offers";
import { buildOfferPdf } from "@/lib/pdf";
import { sendOfferEmail } from "@/lib/email";
import { getSession } from "@/lib/session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  try {
    const pdf = await buildOfferPdf(offer);
    await sendOfferEmail(offer, pdf);
    const updated = await markSent(id);
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الإرسال" },
      { status: 500 },
    );
  }
}
