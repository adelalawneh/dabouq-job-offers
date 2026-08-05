"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OfferActions({ id, status, token }: { id: string; status: string; token: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/offers/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإرسال");
      setMsg("تم إرسال العرض بالبريد.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("حذف هذه المسودة؟")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      router.push("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "فشل الحذف");
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      {msg ? <p style={{ background: "#dcfae6", color: "#067647", padding: 12, borderRadius: 8, margin: 0 }}>{msg}</p> : null}
      {err ? <p style={{ background: "#fee4e2", color: "#b42318", padding: 12, borderRadius: 8, margin: 0 }}>{err}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <a
          href={`/api/offers/${id}/pdf`}
          style={{ ...btn, background: "var(--ink)", color: "#fff" }}
        >
          تحميل PDF
        </a>
        {(status === "draft" || status === "sent") && (
          <button type="button" disabled={busy} onClick={send} style={{ ...btn, background: "var(--accent)", color: "#fff" }}>
            {busy ? "…" : "إرسال بالبريد"}
          </button>
        )}
        {status === "draft" && (
          <button type="button" disabled={busy} onClick={remove} style={{ ...btn, background: "#fee4e2", color: "#b42318" }}>
            حذف المسودة
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
        رابط المرشح: <code>/r/{token}</code>
      </p>
    </div>
  );
}

const btn: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "11px 18px",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};
