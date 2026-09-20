"use client";

import { useEffect, useRef, useState } from "react";
import type { AssistantPatch, AssistantPreviewRow, FormSnapshot } from "@/lib/assistant";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  preview?: AssistantPreviewRow[];
};

export function OfferAssistant({
  formSnapshot,
  onApplyPatch,
}: {
  formSnapshot: FormSnapshot;
  onApplyPatch: (patch: AssistantPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "اكتب بجملة واحدة — أطبّق فوراً على النموذج.\nمثال: بدي عرض لأحمد راتبه ٥٠٠٠ مندوب مبيعات جدة سعودي",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const nextHistory = [...messages, userMsg].filter((m) => m.id !== "welcome");
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map(({ role, content }) => ({ role, content })),
          formSnapshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل المساعد");

      const patch = (data.patch || {}) as AssistantPatch;
      if (data.readyToApply && Object.keys(patch).length) {
        onApplyPatch(patch);
      }

      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply || (Object.keys(patch).length ? "تم." : "وضّح أكثر."),
          preview: data.preview || [],
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل المساعد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 end-5 z-40 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-95"
      >
        {open ? "إغلاق المساعد" : "مساعد التعبئة"}
      </button>

      {open ? (
        <div className="fixed bottom-20 end-5 z-40 flex h-[min(70vh,560px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl">
          <div className="border-b border-[var(--border)] bg-[var(--muted)]/60 px-3 py-2.5">
            <p className="m-0 text-sm font-semibold text-[var(--brand)]">مساعد تعبئة فوري</p>
            <p className="muted m-0 text-xs">يفهم ويطبّق مباشرة على الفورم</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 text-sm leading-6 ${
                  m.role === "user"
                    ? "ms-8 bg-[var(--brand)] text-white"
                    : "me-6 bg-[var(--muted)] text-[var(--foreground)]"
                }`}
              >
                <p className="m-0 whitespace-pre-wrap">{m.content}</p>
                {m.preview && m.preview.length > 0 ? (
                  <ul className="mt-2 mb-0 list-none space-y-1 border-t border-[var(--border)]/60 pt-2 ps-0">
                    {m.preview.map((row) => (
                      <li key={row.key} className="flex justify-between gap-2 text-xs">
                        <span className="muted">{row.label}</span>
                        <strong className="tabular-nums">{row.value}</strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            {busy ? <p className="muted m-0 text-xs">جاري…</p> : null}
            <div ref={bottomRef} />
          </div>

          {error ? <p className="alert-error mx-3 mb-2 text-xs">{error}</p> : null}

          <form
            className="flex gap-2 border-t border-[var(--border)] p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              className="field-input flex-1 !py-2 text-sm"
              placeholder="جملة واحدة: اسم + راتب + وظيفة + مدينة…"
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={busy || !input.trim()} className="chip !bg-[var(--brand)] !text-white">
              نفّذ
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
