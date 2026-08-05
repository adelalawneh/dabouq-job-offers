import { NextResponse } from "next/server";
import { z } from "zod";
import { getOfferByToken, respondToOffer, expireStaleOffers } from "@/lib/offers";

const schema = z.object({
  accepted: z.boolean(),
  startDate: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await expireStaleOffers();
  const offer = await getOfferByToken(token);
  if (!offer) return NextResponse.json({ error: "العرض غير موجود" }, { status: 404 });
  if (offer.status === "expired") {
    return NextResponse.json({ error: "انتهت صلاحية العرض" }, { status: 400 });
  }
  if (offer.status === "accepted" || offer.status === "rejected") {
    return NextResponse.json({ error: "تم الرد مسبقًا" }, { status: 400 });
  }
  if (offer.status !== "sent" && offer.status !== "draft") {
    return NextResponse.json({ error: "لا يمكن الرد على هذا العرض" }, { status: 400 });
  }

  try {
    const body = schema.parse(await request.json());
    const updated = await respondToOffer(
      offer.id,
      body.accepted,
      body.startDate,
      body.rejectionReason,
    );
    return NextResponse.json({ status: updated.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "طلب غير صالح" },
      { status: 400 },
    );
  }
}
