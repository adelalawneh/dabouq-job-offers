"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { contractDefaults, JOB_TEMPLATES, DEFAULT_OFFER_FOOTER } from "@/lib/config";
import { money } from "@/lib/helpers";
import {
  computeNonSaudiSalaryBreakdown,
  computeSaudiSalaryBreakdown,
  DEFAULT_GOSI_SCHEME_ID,
  GOSI_SCHEMES,
  looksSaudiNationality,
} from "@/lib/gosi";
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
  isSaudi: boolean;
  gosiSchemeId: string;
  manualSalaryEdit: boolean;
  basic: number;
  housing: number;
  transport: number;
  gosiBase: number;
  employeeDeduction: number;
  companyContribution: number;
  netSalary: number;
  companyCost: number;
  language: string;
  footerSalaryReview: string;
  footerValidity: string;
  footerAcceptance: string;
  footerRejection: string;
};

const initialDefaults = contractDefaults("العربية");
const initialBreakdown = computeSaudiSalaryBreakdown(3500, DEFAULT_GOSI_SCHEME_ID);

const initial: FormState = {
  candidateName: "",
  candidateEmail: "",
  candidateNationality: "",
  documentNumber: "",
  jobTitle: "",
  department: "",
  location: "",
  contractType: initialDefaults.contractType,
  contractDuration: initialDefaults.contractDuration,
  workDays: initialDefaults.workDays,
  probation: initialDefaults.probation,
  annualLeave: initialDefaults.annualLeave,
  totalSalary: 3500,
  isSaudi: false,
  gosiSchemeId: DEFAULT_GOSI_SCHEME_ID,
  manualSalaryEdit: false,
  basic: initialBreakdown.basic,
  housing: initialBreakdown.housing,
  transport: initialBreakdown.transport,
  gosiBase: initialBreakdown.gosiBase,
  employeeDeduction: 0,
  companyContribution: 0,
  netSalary: 3500,
  companyCost: 3500,
  language: "العربية",
  footerSalaryReview: DEFAULT_OFFER_FOOTER.ar.salaryReview,
  footerValidity: DEFAULT_OFFER_FOOTER.ar.validity,
  footerAcceptance: DEFAULT_OFFER_FOOTER.ar.acceptance,
  footerRejection: DEFAULT_OFFER_FOOTER.ar.rejection,
};

function applyAutoBreakdown(f: FormState): FormState {
  const calc = f.isSaudi
    ? computeSaudiSalaryBreakdown(f.totalSalary, f.gosiSchemeId)
    : computeNonSaudiSalaryBreakdown(f.totalSalary, 0);
  return {
    ...f,
    basic: calc.basic,
    housing: calc.housing,
    transport: calc.transport,
    gosiBase: calc.gosiBase,
    employeeDeduction: calc.employeeDeduction,
    companyContribution: calc.companyContribution,
    netSalary: calc.netSalary,
    companyCost: calc.companyCost,
  };
}

export type OfferFormSeed = Partial<{
  candidateName: string;
  candidateEmail: string | null;
  candidateNationality: string | null;
  documentNumber: string | null;
  jobTitle: string;
  department: string | null;
  location: string | null;
  contractType: string | null;
  contractDuration: string | null;
  workDays: string | null;
  probation: string | null;
  annualLeave: string | null;
  totalSalary: number;
  insurance: number;
  basic: number | null;
  housing: number | null;
  transport: number | null;
  netSalary: number | null;
  language: string;
  footerSalaryReview: string | null;
  footerValidity: string | null;
  footerAcceptance: string | null;
  footerRejection: string | null;
}>;

function seedToForm(seed?: OfferFormSeed | null): FormState {
  if (!seed) return applyAutoBreakdown(initial);
  const isSaudi = looksSaudiNationality(seed.candidateNationality) || (seed.insurance ?? 0) > 0;
  const total = seed.totalSalary ?? 3500;
  const lang = seed.language || "العربية";
  const foot = lang === "العربية" ? DEFAULT_OFFER_FOOTER.ar : DEFAULT_OFFER_FOOTER.en;
  const base: FormState = {
    ...initial,
    candidateName: seed.candidateName || "",
    candidateEmail: seed.candidateEmail || "",
    candidateNationality: seed.candidateNationality || "",
    documentNumber: seed.documentNumber || "",
    jobTitle: seed.jobTitle || "",
    department: seed.department || "",
    location: seed.location || "",
    contractType: seed.contractType || initial.contractType,
    contractDuration: seed.contractDuration || initial.contractDuration,
    workDays: seed.workDays || initial.workDays,
    probation: seed.probation || initial.probation,
    annualLeave: seed.annualLeave || initial.annualLeave,
    totalSalary: total,
    isSaudi,
    gosiSchemeId: DEFAULT_GOSI_SCHEME_ID,
    language: lang,
    footerSalaryReview: seed.footerSalaryReview || foot.salaryReview,
    footerValidity: seed.footerValidity || foot.validity,
    footerAcceptance: seed.footerAcceptance || foot.acceptance,
    footerRejection: seed.footerRejection || foot.rejection,
    manualSalaryEdit: false,
    basic: 0,
    housing: 0,
    transport: 0,
    gosiBase: 0,
    employeeDeduction: 0,
    companyContribution: 0,
    netSalary: 0,
    companyCost: 0,
  };
  const auto = applyAutoBreakdown(base);
  // Preserve stored salary lines when editing an existing offer
  if (
    seed.basic != null ||
    seed.housing != null ||
    seed.transport != null ||
    seed.insurance != null ||
    seed.netSalary != null
  ) {
    const basic = seed.basic ?? auto.basic;
    const housing = seed.housing ?? auto.housing;
    const transport = seed.transport ?? auto.transport;
    const employeeDeduction = seed.insurance ?? auto.employeeDeduction;
    const netSalary = seed.netSalary ?? Math.round(total - employeeDeduction);
    const companyContribution = isSaudi ? auto.companyContribution : 0;
    return {
      ...auto,
      basic,
      housing,
      transport,
      gosiBase: basic + housing,
      employeeDeduction,
      companyContribution,
      netSalary,
      companyCost: Math.round(total + companyContribution),
      manualSalaryEdit: true,
    };
  }
  return auto;
}

export function OfferForm({
  mode,
  offerId,
  initialOffer,
}: {
  mode: "create" | "edit";
  offerId?: string;
  initialOffer?: OfferFormSeed | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => seedToForm(initialOffer));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Recalculate when total / scheme / saudi changes — unless manual edit is on
  useEffect(() => {
    setForm((f) => {
      if (f.manualSalaryEdit) return f;
      return applyAutoBreakdown(f);
    });
  }, [form.totalSalary, form.gosiSchemeId, form.isSaudi, form.manualSalaryEdit]);

  const scheme = useMemo(
    () => GOSI_SCHEMES.find((s) => s.id === form.gosiSchemeId) || GOSI_SCHEMES[1]!,
    [form.gosiSchemeId],
  );

  function applyTemplate(name: string) {
    const t = JOB_TEMPLATES[name as keyof typeof JOB_TEMPLATES];
    if (!t) return;
    setForm((f) =>
      applyAutoBreakdown({
        ...f,
        jobTitle: t.jobTitle,
        department: t.department,
        location: t.location,
        totalSalary: t.totalSalary,
        manualSalaryEdit: false,
      }),
    );
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
      setForm((f) => {
        const nationality = data.nationality || f.candidateNationality;
        const saudi = looksSaudiNationality(nationality);
        return applyAutoBreakdown({
          ...f,
          candidateName: data.full_name || f.candidateName,
          candidateNationality: nationality,
          documentNumber: data.document_number || f.documentNumber,
          isSaudi: saudi ? true : f.isSaudi,
          manualSalaryEdit: false,
        });
      });
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
      const payload = {
        candidateName: form.candidateName,
        candidateEmail: form.candidateEmail,
        candidateNationality: form.candidateNationality,
        documentNumber: form.documentNumber,
        jobTitle: form.jobTitle,
        department: form.department,
        location: form.location,
        contractType: form.contractType,
        contractDuration: form.contractDuration,
        workDays: form.workDays,
        probation: form.probation,
        annualLeave: form.annualLeave,
        totalSalary: form.totalSalary,
        insurance: form.employeeDeduction,
        basic: form.basic,
        housing: form.housing,
        transport: form.transport,
        netSalary: form.netSalary,
        language: form.language,
        footerSalaryReview: form.footerSalaryReview,
        footerValidity: form.footerValidity,
        footerAcceptance: form.footerAcceptance,
        footerRejection: form.footerRejection,
      };
      const res = await fetch(mode === "edit" && offerId ? `/api/offers/${offerId}` : "/api/offers", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      router.push(`/offers/${mode === "edit" ? offerId : data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  }

  const breakdownLocked = !form.manualSalaryEdit;

  return (
    <AppShell title={mode === "edit" ? "تعديل العرض الوظيفي" : "إنشاء عرض وظيفي"} narrow>
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
              onChange={(e) => {
                const nationality = e.target.value;
                const saudi = looksSaudiNationality(nationality);
                setForm((f) =>
                  applyAutoBreakdown({
                    ...f,
                    candidateNationality: nationality,
                    isSaudi: saudi ? true : f.isSaudi,
                    manualSalaryEdit: saudi && !f.isSaudi ? false : f.manualSalaryEdit,
                  }),
                );
              }}
              className="field-input"
              placeholder="سعودي / غير سعودي"
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
                const nextContract = contractDefaults(lang);
                const prevContract = contractDefaults(form.language);
                setForm((f) => ({
                  ...f,
                  language: lang,
                  footerSalaryReview: foot.salaryReview,
                  footerValidity: foot.validity,
                  footerAcceptance: foot.acceptance,
                  footerRejection: foot.rejection,
                  contractType: f.contractType === prevContract.contractType ? nextContract.contractType : f.contractType,
                  contractDuration:
                    f.contractDuration === prevContract.contractDuration
                      ? nextContract.contractDuration
                      : f.contractDuration,
                  workDays: f.workDays === prevContract.workDays ? nextContract.workDays : f.workDays,
                  probation: f.probation === prevContract.probation ? nextContract.probation : f.probation,
                  annualLeave: f.annualLeave === prevContract.annualLeave ? nextContract.annualLeave : f.annualLeave,
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
        </div>
      </Surface>

      <Surface className="mb-3.5">
        <h2 className="mb-3 mt-0 text-sm font-semibold">تفاصيل الراتب والتأمينات</h2>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Field label="هل المرشح سعودي؟">
            <select
              className="field-input"
              value={form.isSaudi ? "yes" : "no"}
              onChange={(e) => {
                const isSaudi = e.target.value === "yes";
                setForm((f) =>
                  applyAutoBreakdown({
                    ...f,
                    isSaudi,
                    manualSalaryEdit: false,
                  }),
                );
              }}
            >
              <option value="no">لا</option>
              <option value="yes">نعم</option>
            </select>
          </Field>
          <Field label="إجمالي الراتب">
            <input
              type="number"
              min={0}
              value={form.totalSalary}
              onChange={(e) => set("totalSalary", Number(e.target.value))}
              className="field-input"
            />
          </Field>
        </div>

        {form.isSaudi ? (
          <Field label="نسبة مساهمة التأمينات (GOSI)">
            <select
              className="field-input"
              value={form.gosiSchemeId}
              onChange={(e) => {
                setForm((f) =>
                  applyAutoBreakdown({
                    ...f,
                    gosiSchemeId: e.target.value,
                    manualSalaryEdit: false,
                  }),
                );
              }}
            >
              {GOSI_SCHEMES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelAr}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="muted mb-3 text-sm">لغير السعوديين لا تُحسب مساهمة التأمينات تلقائيًا.</p>
        )}

        <label className="mt-4 mb-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.manualSalaryEdit}
            onChange={(e) => {
              const on = e.target.checked;
              setForm((f) => {
                if (on) return { ...f, manualSalaryEdit: true };
                return applyAutoBreakdown({ ...f, manualSalaryEdit: false });
              });
            }}
          />
          <span>تعديل يدوي للأرقام (تبقى القيم الحالية قابلة للتعديل)</span>
        </label>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--success)_8%,white)]">
          <div className="border-b border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--brand)]">
            كيف تُحسب الراتب
            {form.isSaudi ? (
              <span className="muted ms-2 text-xs font-normal">
                · أساسي 64.5% + سكن 22.6% + نقل الباقي · التأمين على (أساسي+سكن)
              </span>
            ) : null}
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            {(
              [
                ["basic", "الراتب الأساسي", form.basic],
                ["housing", "بدل السكن", form.housing],
                ["transport", "بدل النقل", form.transport],
                ["gosiBase", "الأجر الخاضع للتأمينات (أساسي + سكن)", form.gosiBase],
                [
                  "employeeDeduction",
                  form.isSaudi ? `خصم الموظف (${scheme.employeePct}%)` : "خصم الموظف",
                  form.employeeDeduction,
                ],
                [
                  "companyContribution",
                  form.isSaudi ? `مساهمة الشركة (${scheme.companyPct}%)` : "مساهمة الشركة",
                  form.companyContribution,
                ],
                ["netSalary", "صافي راتب الموظف", form.netSalary],
                ["companyCost", "التكلفة الإجمالية على الشركة", form.companyCost],
              ] as const
            ).map(([key, label, value]) => {
              const editableKeys = new Set([
                "basic",
                "housing",
                "transport",
                "employeeDeduction",
                "companyContribution",
                "netSalary",
                "companyCost",
              ]);
              const canEdit = form.manualSalaryEdit && editableKeys.has(key);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-2.5 text-sm first:border-t-0 sm:odd:border-e"
                >
                  <span className="muted text-xs leading-5">{label}</span>
                  {canEdit ? (
                    <input
                      type="number"
                      className="field-input !w-28 !py-1.5 text-end tabular-nums"
                      value={value}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setForm((f) => {
                          const next = { ...f, [key]: n };
                          if (key === "basic" || key === "housing") {
                            next.gosiBase = Math.round(next.basic + next.housing);
                          }
                          if (key === "employeeDeduction") {
                            next.netSalary = Math.round(next.totalSalary - n);
                          }
                          return next;
                        });
                      }}
                    />
                  ) : (
                    <strong className="tabular-nums">{money(value)} ر.س</strong>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-[var(--border)] px-3 py-2 text-sm">
            <span className="muted">إجمالي الراتب: </span>
            <strong className="tabular-nums">{money(form.totalSalary)} ر.س</strong>
            {breakdownLocked ? (
              <span className="muted ms-2 text-xs">· يُحدَّث تلقائيًا عند تغيير الراتب أو النسبة</span>
            ) : (
              <span className="ms-2 text-xs text-[var(--warning)]">· وضع التعديل اليدوي مفعّل</span>
            )}
          </div>
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
          {busy ? "جاري الحفظ…" : mode === "edit" ? "حفظ التعديلات" : "حفظ مسودة"}
        </button>
      </div>
    </AppShell>
  );
}
