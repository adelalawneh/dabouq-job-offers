import { notFound } from "next/navigation";
import { STATUS_LABELS } from "@/lib/config";
import { getOffer } from "@/lib/offers";
import { money } from "@/lib/helpers";
import { OfferActions } from "@/components/offer-actions";
import { AppShell, BackLink, Surface } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) notFound();

  const net = offer.netSalary ?? Math.round(offer.totalSalary - offer.insurance);

  return (
    <AppShell
      title={offer.candidateName}
      subtitle={offer.jobTitle}
      narrow
      actions={<span className="status-pill">{STATUS_LABELS[offer.status] || offer.status}</span>}
    >
      <BackLink />

      <Surface className="mb-4">
        <dl className="m-0 grid gap-3 sm:grid-cols-2">
          <Item label="البريد" value={offer.candidateEmail || "—"} />
          <Item label="الجنسية" value={offer.candidateNationality || "—"} />
          <Item label="رقم المستند" value={offer.documentNumber || "—"} />
          <Item label="القسم" value={offer.department || "—"} />
          <Item label="الموقع" value={offer.location || "—"} />
          <Item label="اللغة" value={offer.language} />
          <Item label="نوع العقد" value={offer.contractType || "—"} />
          <Item label="المدة" value={offer.contractDuration || "—"} />
          <Item label="الراتب الإجمالي" value={`${money(offer.totalSalary)} ر.س`} />
          <Item label="التأمين" value={`${money(offer.insurance)} ر.س`} />
          <Item label="صافي الراتب" value={`${money(net)} ر.س`} />
          <Item label="أُرسل" value={offer.sentAt ? new Date(offer.sentAt).toLocaleString("ar-SA") : "—"} />
          <Item label="ينتهي" value={offer.expiresAt ? new Date(offer.expiresAt).toLocaleString("ar-SA") : "—"} />
          <Item label="الرد" value={offer.respondedAt ? new Date(offer.respondedAt).toLocaleString("ar-SA") : "—"} />
          {offer.startDate ? <Item label="تاريخ المباشرة" value={offer.startDate} /> : null}
          {offer.rejectionReason ? <Item label="سبب الرفض" value={offer.rejectionReason} /> : null}
        </dl>
      </Surface>

      <OfferActions id={offer.id} status={offer.status} token={offer.token} />
    </AppShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted m-0 text-xs">{label}</dt>
      <dd className="mt-1 mb-0 font-semibold">{value}</dd>
    </div>
  );
}
