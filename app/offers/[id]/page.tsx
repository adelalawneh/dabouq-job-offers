import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_LABELS } from "@/lib/config";
import { getOffer } from "@/lib/offers";
import { money } from "@/lib/helpers";
import { OfferActions } from "@/components/offer-actions";

export const dynamic = "force-dynamic";

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) notFound();

  const net = offer.netSalary ?? Math.round(offer.totalSalary - offer.insurance);

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link href="/" style={{ color: "var(--muted)", fontSize: 14 }}>
        ← العودة للقائمة
      </Link>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginTop: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>{offer.candidateName}</h1>
          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{offer.jobTitle}</p>
        </div>
        <span
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            background: "#eef2f6",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {STATUS_LABELS[offer.status] || offer.status}
        </span>
      </header>

      <section
        style={{
          marginTop: 20,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 18,
        }}
      >
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", margin: 0 }}>
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
      </section>

      <OfferActions id={offer.id} status={offer.status} token={offer.token} />
    </main>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{label}</dt>
      <dd style={{ margin: "4px 0 0", fontWeight: 600 }}>{value}</dd>
    </div>
  );
}
