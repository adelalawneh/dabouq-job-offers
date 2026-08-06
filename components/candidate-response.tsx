"use client";

import { useState } from "react";
import { money } from "@/lib/helpers";
import { COMPANY, STATUS_LABELS } from "@/lib/config";

type OfferView = {
  id: string;
  token: string;
  status: string;
  candidateName: string;
  jobTitle: string;
  department: string | null;
  location: string | null;
  totalSalary: number;
  insurance: number;
  netSalary: number | null;
  language: string;
  expiresAt: string | null;
};

export function CandidateResponse({ offer }: { offer: OfferView }) {
  const [status, setStatus] = useState(offer.status);
  const [startDate, setStartDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const net = offer.netSalary ?? Math.round(offer.totalSalary - offer.insurance);
  const locked = status === "accepted" || status === "rejected" || status === "expired";

  async function respond(accepted: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidate/${offer.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted,
          startDate: accepted ? startDate : null,
          rejectionReason: accepted ? null : rejectionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذّر حفظ الرد");
      setStatus(data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ الرد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page page-narrow !max-w-[560px] !pt-10">
      <div className="surface p-7">
        <p className="muted m-0 text-sm">{COMPANY.nameAr}</p>
        <h1 className="mt-2 mb-1 text-2xl font-bold">عرض وظيفي</h1>
        <p className="muted m-0 text-sm">
          الحالة: <strong className="text-[var(--foreground)]">{STATUS_LABELS[status] || status}</strong>
        </p>

        <dl className="mt-5 grid gap-2.5">
          <Row label="المرشح" value={offer.candidateName} />
          <Row label="المسمى" value={offer.jobTitle} />
          <Row label="القسم" value={offer.department || "—"} />
          <Row label="الموقع" value={offer.location || "—"} />
          <Row label="صافي الراتب" value={`${money(net)} ر.س`} />
          {offer.expiresAt ? (
            <Row label="ينتهي" value={new Date(offer.expiresAt).toLocaleDateString("ar-SA")} />
          ) : null}
        </dl>

        {error ? <p className="alert-error mt-4">{error}</p> : null}

        {locked ? (
          <p className="muted mt-5 mb-0">
            {status === "accepted"
              ? "شكرًا لقبولك العرض. سيتواصل معك فريق الموارد البشرية."
              : status === "rejected"
                ? "تم تسجيل رفض العرض."
                : "انتهت صلاحية هذا العرض."}
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <label className="text-sm">
              <span className="muted">تاريخ المباشرة (عند القبول)</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field-input mt-1.5" />
            </label>
            <label className="text-sm">
              <span className="muted">سبب الرفض (عند الرفض)</span>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="field-input mt-1.5 min-h-[70px]"
              />
            </label>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(true)}
                className="btn flex-1 !bg-[color-mix(in_oklch,var(--success)_75%,black)] !text-white"
              >
                قبول
              </button>
              <button type="button" disabled={busy} onClick={() => respond(false)} className="btn btn-danger flex-1">
                رفض
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
      <dt className="muted m-0 text-sm">{label}</dt>
      <dd className="m-0 font-semibold">{value}</dd>
    </div>
  );
}
