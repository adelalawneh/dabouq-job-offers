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
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 8px 30px rgba(26,35,50,0.06)",
        }}
      >
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{COMPANY.nameAr}</p>
        <h1 style={{ margin: "8px 0 4px", fontSize: "1.5rem" }}>عرض وظيفي</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          الحالة: <strong>{STATUS_LABELS[status] || status}</strong>
        </p>

        <dl style={{ marginTop: 20, display: "grid", gap: 10 }}>
          <Row label="المرشح" value={offer.candidateName} />
          <Row label="المسمى" value={offer.jobTitle} />
          <Row label="القسم" value={offer.department || "—"} />
          <Row label="الموقع" value={offer.location || "—"} />
          <Row label="صافي الراتب" value={`${money(net)} ر.س`} />
          {offer.expiresAt ? (
            <Row label="ينتهي" value={new Date(offer.expiresAt).toLocaleDateString("ar-SA")} />
          ) : null}
        </dl>

        {error ? (
          <p style={{ background: "#fee4e2", color: "#b42318", padding: 12, borderRadius: 8 }}>{error}</p>
        ) : null}

        {locked ? (
          <p style={{ marginTop: 20, color: "var(--muted)" }}>
            {status === "accepted"
              ? "شكرًا لقبولك العرض. سيتواصل معك فريق الموارد البشرية."
              : status === "rejected"
                ? "تم تسجيل رفض العرض."
                : "انتهت صلاحية هذا العرض."}
          </p>
        ) : (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>تاريخ المباشرة (عند القبول)</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                }}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>سبب الرفض (عند الرفض)</span>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  minHeight: 70,
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(true)}
                style={{
                  flex: 1,
                  background: "var(--ok)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 10,
                  padding: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                قبول
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(false)}
                style={{
                  flex: 1,
                  background: "var(--danger)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 10,
                  padding: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
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
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
      <dt style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{value}</dd>
    </div>
  );
}
