import { NextResponse } from "next/server";
import { deleteOffer, getOffer } from "@/lib/offers";
import { getSession } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(offer);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteOffer(id, true);
  if (!ok) return NextResponse.json({ error: "لا يمكن حذف غير المسودات" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
