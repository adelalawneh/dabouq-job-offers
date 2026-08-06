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
    <div className="mt-1 flex flex-col gap-3">
      {msg ? <p className="alert-ok">{msg}</p> : null}
      {err ? <p className="alert-error !mb-0">{err}</p> : null}
      <div className="flex flex-wrap gap-2.5">
        <a href={`/api/offers/${id}/pdf`} className="btn btn-secondary">
          تحميل PDF
        </a>
        {(status === "draft" || status === "sent") && (
          <button type="button" disabled={busy} onClick={send} className="btn btn-primary">
            {busy ? "…" : "إرسال بالبريد"}
          </button>
        )}
        {status === "draft" && (
          <button type="button" disabled={busy} onClick={remove} className="btn btn-danger">
            حذف المسودة
          </button>
        )}
      </div>
      <p className="muted m-0 text-xs">
        رابط المرشح: <code className="rounded bg-[var(--muted)] px-1.5 py-0.5">/r/{token}</code>
      </p>
    </div>
  );
}
