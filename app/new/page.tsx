"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_CONTRACT, JOB_TEMPLATES, DEFAULT_OFFER_FOOTER } from "@/lib/config";
import { AppShell, BackLink, Field, Surface } from "@/components/app-shell";

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

  async function submit() {
    if (!form.candidateName.trim() || !form.jobTitle.trim()) {
      setError("يرجى تعبئة الاسم والمسمى الوظيفي قبل الحفظ");
      return;
    }
    if (form.candidateEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.candidateEmail.trim())) {
      setError("البريد الإلكتروني غير صالح");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "draft" }),
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
    <AppShell title="إنشاء عرض وظيفي" narrow>
      <BackLink />

      {error ? <p className="alert-error">{error}</p> : null}

      <Surface className="mb-3.5">
        <h2 className="mb-3 mt-0 text-sm font-semibold">قوالب سريعة</h2>
        <div className="flex flex-wrap gap-2">
          {Object.keys(JOB_TEMPLATES).map((name) => (
            <button key={name} type="button" onClick={() => applyTemplate(name)} className="chip">
              {name}
            </button>
          ))}
        </div>
      </Surface>

      <Surface className="mb-3.5">
        <h2 className="mb-3 mt-0 text-sm font-semibold">مستند الهوية (OCR اختياري)</h2>
        <input
          type="file"
          accept="image/*"
          disabled={ocrBusy}
          className="field-input"
          onChange={(e) => onOcr(e.target.files?.[0] || null)}
        />
        {ocrBusy ? <p className="muted mt-2 text-sm">جاري الاستخراج…</p> : null}
      </Surface>

      <Surface className="mb-3.5">
        <h2 className="mb-3 mt-0 text-sm font-semibold">بيانات المرشح</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم">
            <input
              value={form.candidateName}
              onChange={(e) => set("candidateName", e.target.value)}
              className="field-input"
              required
            />
          </Field>
          <Field label="البريد">
            <input
              type="email"
              value={form.candidateEmail}
              onChange={(e) => set("candidateEmail", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="الجنسية">
            <input
              value={form.candidateNationality}
              onChange={(e) => set("candidateNationality", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="رقم الهوية / الجواز">
            <input
              value={form.documentNumber}
              onChange={(e) => set("documentNumber", e.target.value)}
              className="field-input"
            />
          </Field>
        </div>
      </Surface>

      <Surface className="mb-3.5">
        <h2 className="mb-3 mt-0 text-sm font-semibold">الوظيفة والعقد</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="المسمى">
            <input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} className="field-input" required />
          </Field>
          <Field label="القسم">
            <input value={form.department} onChange={(e) => set("department", e.target.value)} className="field-input" />
          </Field>
          <Field label="الموقع">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className="field-input" />
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
              className="field-input"
            >
              <option value="العربية">العربية</option>
              <option value="English">English</option>
            </select>
          </Field>
          <Field label="نوع العقد">
            <input value={form.contractType} onChange={(e) => set("contractType", e.target.value)} className="field-input" />
          </Field>
          <Field label="مدة العقد">
            <input
              value={form.contractDuration}
              onChange={(e) => set("contractDuration", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="أيام العمل">
            <input value={form.workDays} onChange={(e) => set("workDays", e.target.value)} className="field-input" />
          </Field>
          <Field label="التجربة">
            <input value={form.probation} onChange={(e) => set("probation", e.target.value)} className="field-input" />
          </Field>
          <Field label="الإجازة السنوية">
            <input value={form.annualLeave} onChange={(e) => set("annualLeave", e.target.value)} className="field-input" />
          </Field>
          <Field label="الراتب الإجمالي">
            <input
              type="number"
              value={form.totalSalary}
              onChange={(e) => set("totalSalary", Number(e.target.value))}
              className="field-input"
            />
          </Field>
          <Field label="التأمين">
            <input
              type="number"
              value={form.insurance}
              onChange={(e) => set("insurance", Number(e.target.value))}
              className="field-input"
            />
          </Field>
        </div>
      </Surface>

      <Surface className="mb-3.5">
        <h2 className="mb-3 mt-0 text-sm font-semibold">نصوص التذييل</h2>
        <div className="grid gap-3">
          <Field label="مراجعة الراتب">
            <textarea
              value={form.footerSalaryReview}
              onChange={(e) => set("footerSalaryReview", e.target.value)}
              className="field-input min-h-[70px]"
            />
          </Field>
          <Field label="الصلاحية">
            <textarea
              value={form.footerValidity}
              onChange={(e) => set("footerValidity", e.target.value)}
              className="field-input min-h-[60px]"
            />
          </Field>
        </div>
      </Surface>

      <div className="flex justify-end">
        <button type="button" disabled={busy} onClick={submit} className="btn btn-primary">
          {busy ? "جاري الحفظ…" : "حفظ مسودة"}
        </button>
      </div>
    </AppShell>
  );
}
