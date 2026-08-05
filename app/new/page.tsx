"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { DEFAULT_CONTRACT, JOB_TEMPLATES, DEFAULT_OFFER_FOOTER } from "@/lib/config";

type FormState = {
  candidateName: string;
  candidateEmail: string;
  candidateNationality: string;
  documentNumber: string;
  jobTitle: string;
  department: string;
  location: string;
  contractType: string;
  contractDuration: string;
  workDays: string;
  probation: string;
  annualLeave: string;
  totalSalary: number;
  insurance: number;
  language: string;
  footerSalaryReview: string;
  footerValidity: string;
  footerAcceptance: string;
  footerRejection: string;
};

const initial: FormState = {
  candidateName: "",
  candidateEmail: "",
  candidateNationality: "",
  documentNumber: "",
  jobTitle: "",
  department: "",
  location: "",
  contractType: DEFAULT_CONTRACT.contractType,
  contractDuration: DEFAULT_CONTRACT.contractDuration,
  workDays: DEFAULT_CONTRACT.workDays,
  probation: DEFAULT_CONTRACT.probation,
  annualLeave: DEFAULT_CONTRACT.annualLeave,
  totalSalary: 3500,
  insurance: 0,
  language: "العربية",
  footerSalaryReview: DEFAULT_OFFER_FOOTER.ar.salaryReview,
  footerValidity: DEFAULT_OFFER_FOOTER.ar.validity,
  footerAcceptance: DEFAULT_OFFER_FOOTER.ar.acceptance,
  footerRejection: DEFAULT_OFFER_FOOTER.ar.rejection,
};

export default function NewOfferPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyTemplate(name: string) {
    const t = JOB_TEMPLATES[name as keyof typeof JOB_TEMPLATES];
    if (!t) return;
    setForm((f) => ({
      ...f,
      jobTitle: t.jobTitle,
      department: t.department,
      location: t.location,
      totalSalary: t.totalSalary,
    }));
  }

  async function onOcr(file: File | null) {
    if (!file) return;
    setOcrBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/ocr", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل OCR");
      setForm((f) => ({
        ...f,
        candidateName: data.full_name || f.candidateName,
        candidateNationality: data.nationality || f.candidateNationality,
        documentNumber: data.document_number || f.documentNumber,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل OCR");
    } finally {
      setOcrBusy(false);
    }
  }

  async function submit(asDraft: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: asDraft ? "draft" : "draft" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      router.push(`/offers/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ color: "var(--muted)", fontSize: 14 }}>
          ← العودة للقائمة
        </Link>
        <h1 style={{ margin: "10px 0 0", fontSize: "1.6rem" }}>إنشاء عرض وظيفي</h1>
      </div>

      {error ? (
        <p style={{ background: "#fee4e2", color: "#b42318", padding: 12, borderRadius: 8 }}>{error}</p>
      ) : null}

      <section style={card}>
        <h2 style={h2}>قوالب سريعة</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.keys(JOB_TEMPLATES).map((name) => (
            <button key={name} type="button" onClick={() => applyTemplate(name)} style={chip}>
              {name}
            </button>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>مستند الهوية (OCR اختياري)</h2>
        <input
          type="file"
          accept="image/*"
          disabled={ocrBusy}
          onChange={(e) => onOcr(e.target.files?.[0] || null)}
        />
        {ocrBusy ? <p style={{ color: "var(--muted)", fontSize: 13 }}>جاري الاستخراج…</p> : null}
      </section>

      <section style={card}>
        <h2 style={h2}>بيانات المرشح</h2>
        <div style={grid}>
          <Field label="الاسم">
            <input value={form.candidateName} onChange={(e) => set("candidateName", e.target.value)} style={input} required />
          </Field>
          <Field label="البريد">
            <input type="email" value={form.candidateEmail} onChange={(e) => set("candidateEmail", e.target.value)} style={input} />
          </Field>
          <Field label="الجنسية">
            <input value={form.candidateNationality} onChange={(e) => set("candidateNationality", e.target.value)} style={input} />
          </Field>
          <Field label="رقم الهوية / الجواز">
            <input value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} style={input} />
          </Field>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>الوظيفة والعقد</h2>
        <div style={grid}>
          <Field label="المسمى">
            <input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} style={input} required />
          </Field>
          <Field label="القسم">
            <input value={form.department} onChange={(e) => set("department", e.target.value)} style={input} />
          </Field>
          <Field label="الموقع">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} style={input} />
          </Field>
          <Field label="اللغة">
            <select
              value={form.language}
              onChange={(e) => {
                const lang = e.target.value;
                const foot = lang === "العربية" ? DEFAULT_OFFER_FOOTER.ar : DEFAULT_OFFER_FOOTER.en;
                setForm((f) => ({
                  ...f,
                  language: lang,
                  footerSalaryReview: foot.salaryReview,
                  footerValidity: foot.validity,
                  footerAcceptance: foot.acceptance,
                  footerRejection: foot.rejection,
                }));
              }}
              style={input}
            >
              <option value="العربية">العربية</option>
              <option value="English">English</option>
            </select>
          </Field>
          <Field label="نوع العقد">
            <input value={form.contractType} onChange={(e) => set("contractType", e.target.value)} style={input} />
          </Field>
          <Field label="مدة العقد">
            <input value={form.contractDuration} onChange={(e) => set("contractDuration", e.target.value)} style={input} />
          </Field>
          <Field label="أيام العمل">
            <input value={form.workDays} onChange={(e) => set("workDays", e.target.value)} style={input} />
          </Field>
          <Field label="التجربة">
            <input value={form.probation} onChange={(e) => set("probation", e.target.value)} style={input} />
          </Field>
          <Field label="الإجازة السنوية">
            <input value={form.annualLeave} onChange={(e) => set("annualLeave", e.target.value)} style={input} />
          </Field>
          <Field label="الراتب الإجمالي">
            <input
              type="number"
              value={form.totalSalary}
              onChange={(e) => set("totalSalary", Number(e.target.value))}
              style={input}
            />
          </Field>
          <Field label="التأمين">
            <input
              type="number"
              value={form.insurance}
              onChange={(e) => set("insurance", Number(e.target.value))}
              style={input}
            />
          </Field>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>نصوص التذييل</h2>
        <Field label="مراجعة الراتب">
          <textarea value={form.footerSalaryReview} onChange={(e) => set("footerSalaryReview", e.target.value)} style={{ ...input, minHeight: 70 }} />
        </Field>
        <Field label="الصلاحية">
          <textarea value={form.footerValidity} onChange={(e) => set("footerValidity", e.target.value)} style={{ ...input, minHeight: 60 }} />
        </Field>
      </section>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" disabled={busy} onClick={() => submit(true)} style={primaryBtn}>
          {busy ? "جاري الحفظ…" : "حفظ مسودة"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 18,
  marginBottom: 14,
};
const h2: React.CSSProperties = { margin: "0 0 12px", fontSize: 15 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const input: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "#fff",
  width: "100%",
};
const chip: React.CSSProperties = {
  border: "1px solid var(--line)",
  background: "#fff",
  borderRadius: 999,
  padding: "8px 14px",
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  padding: "12px 22px",
  fontWeight: 600,
  cursor: "pointer",
};
