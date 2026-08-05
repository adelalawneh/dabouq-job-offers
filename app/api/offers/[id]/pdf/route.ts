import { NextResponse } from "next/server";
import { getOffer } from "@/lib/offers";
import { buildOfferPdf } from "@/lib/pdf";
import { cleanFilename } from "@/lib/helpers";
import { getSession } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  try {
    const pdf = await buildOfferPdf(offer);
    const isAr = (offer.language || "العربية") === "العربية";
    const name = `DABOUQ_JOB_OFFER_${cleanFilename(offer.candidateName)}_${isAr ? "AR" : "EN"}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل توليد PDF" },
      { status: 500 },
    );
  }
}
