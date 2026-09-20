import { JOB_TEMPLATES, DEFAULT_CONTRACT } from "./config";
import {
  computeFromComponents,
  DEFAULT_GOSI_SCHEME_ID,
  GOSI_SCHEMES,
  looksSaudiNationality,
} from "./gosi";
import { salarySplit } from "./helpers";

/** Fields the assistant is allowed to propose. Derived salary numbers are recomputed server-side. */
export const ASSISTANT_PATCH_KEYS = [
  "candidateName",
  "candidateEmail",
  "candidateNationality",
  "documentNumber",
  "jobTitle",
  "department",
  "location",
  "contractType",
  "contractDuration",
  "workDays",
  "probation",
  "annualLeave",
  "basic",
  "housing",
  "transport",
  "isSaudi",
  "gosiSchemeId",
  "language",
  "footerSalaryReview",
  "footerValidity",
  "footerAcceptance",
  "footerRejection",
] as const;

export type AssistantPatchKey = (typeof ASSISTANT_PATCH_KEYS)[number];

export type AssistantPatch = Partial<{
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
  basic: number;
  housing: number;
  transport: number;
  isSaudi: boolean;
  gosiSchemeId: string;
  language: string;
  footerSalaryReview: string;
  footerValidity: string;
  footerAcceptance: string;
  footerRejection: string;
}>;

export type FormSnapshot = AssistantPatch & {
  totalSalary?: number;
  gosiBase?: number;
  employeeDeduction?: number;
  companyContribution?: number;
  netSalary?: number;
  companyCost?: number;
};

export type AssistantPreviewRow = { key: string; label: string; value: string };

export type AssistantResult = {
  reply: string;
  patch: AssistantPatch;
  preview: AssistantPreviewRow[];
  needsClarification: boolean;
  /** When true, client applies patch immediately. */
  readyToApply: boolean;
  appliedHint?: string;
};

export const FIELD_LABELS_AR: Record<AssistantPatchKey, string> = {
  candidateName: "اسم المرشح",
  candidateEmail: "البريد",
  candidateNationality: "الجنسية",
  documentNumber: "رقم الهوية / الجواز",
  jobTitle: "المسمى الوظيفي",
  department: "القسم",
  location: "الموقع",
  contractType: "نوع العقد",
  contractDuration: "مدة العقد",
  workDays: "أيام العمل",
  probation: "فترة التجربة",
  annualLeave: "الإجازة السنوية",
  basic: "الراتب الأساسي",
  housing: "بدل السكن",
  transport: "بدل النقل",
  isSaudi: "سعودي؟",
  gosiSchemeId: "نسبة التأمينات",
  language: "لغة العرض",
  footerSalaryReview: "نص مراجعة الراتب",
  footerValidity: "نص الصلاحية",
  footerAcceptance: "نص القبول",
  footerRejection: "نص الرفض",
};

const GOSI_IDS = new Set(GOSI_SCHEMES.map((s) => s.id));

const AR_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function normalizeArabicDigits(text: string) {
  return String(text || "").replace(/[٠-٩۰-۹]/g, (ch) => AR_DIGITS[ch] || ch);
}

const TEMPLATE_HINTS = Object.entries(JOB_TEMPLATES)
  .map(([name, t]) => `${name} → jobTitle=${t.jobTitle}, department=${t.department}, location=${t.location}, total≈${t.totalSalary}`)
  .join("\n");

const SYSTEM_PROMPT = `أنت مساعد تعبئة فوري لنموذج عروض دابوق. افهم اللهجة العامية والعربية الفصحى بسرعة واملأ أكبر قدر ممكن من الحقول من جملة واحدة.

الحقول المسموحة فقط: ${ASSISTANT_PATCH_KEYS.join(", ")}

قوالب جاهزة (إن ذكر المسمى):
${TEMPLATE_HINTS}

عقد افتراضي عربي إن لم يُذكر غيره:
contractType=${DEFAULT_CONTRACT.ar.contractType}
contractDuration=${DEFAULT_CONTRACT.ar.contractDuration}
workDays=${DEFAULT_CONTRACT.ar.workDays}
probation=${DEFAULT_CONTRACT.ar.probation}
annualLeave=${DEFAULT_CONTRACT.ar.annualLeave}

قواعد ذهبية:
1) أرجع JSON فقط:
{"reply":"جملة قصيرة جداً بالعربية ماذا طبّقت أو ماذا ينقص","needsClarification":false,"readyToApply":true,"patch":{...},"totalSalary":null}
2) إذا قال راتب/راتبه/اجمالي 5000 بدون تفصيل → ضع totalSalary=5000 ولا تضع basic/housing/transport (النظام يقسّمها).
3) إذا ذكر أساسي وسكن ونقل → ضعها أرقاماً صحيحة ولا تضع totalSalary.
4) أسماء: "لأحمد" "اسمه محمد" "مرشح: فلان" → candidateName بدون أدوات الجر.
5) سعودي/سعودية → isSaudi true + candidateNationality "سعودي". غير سعودي → isSaudi false.
6) مدينة/منطقة → location. مندوب/محاسب/سائق/مشرف → استخدم القالب إن أمكن.
7) gosiSchemeId الافتراضي للسعودي: ${DEFAULT_GOSI_SCHEME_ID}. لا تحسب التأمينات بنفسك.
8) كن جريئاً: طبّق كل ما هو واضح فوراً (readyToApply=true). اسأل فقط إن الاسم أو الراتب أو المسمى ناقص بالكامل.
9) ممنوع مواضيع خارج تعبئة النموذج.
10) reply قصيرة (سطر واحد) مثل: "تم: أحمد، مندوب مبيعات، جدة، إجمالي 5000."`;

function parseAssistantJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") {
    const t = v.trim();
    return t ? t : undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === "string" && v.trim()) {
    const n = Number(normalizeArabicDigits(v).replace(/,/g, "").trim());
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }
  return undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "yes", "1", "سعودي", "سعودية", "نعم"].includes(s)) return true;
    if (["false", "no", "0", "لا", "غير سعودي"].includes(s)) return false;
  }
  return undefined;
}

/** Expand a single total into basic/housing/transport when parts missing. */
export function expandSalaryPatch(patch: AssistantPatch, totalSalary?: number): AssistantPatch {
  const next = { ...patch };
  const hasParts =
    next.basic !== undefined || next.housing !== undefined || next.transport !== undefined;
  if (!hasParts && totalSalary != null && totalSalary > 0) {
    const parts = salarySplit(totalSalary);
    next.basic = parts.basic;
    next.housing = parts.housing;
    next.transport = parts.transport;
  }
  return next;
}

export function sanitizePatch(
  raw: unknown,
  snapshot: FormSnapshot,
  totalSalaryHint?: number,
): AssistantPatch {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: AssistantPatch = {};

  for (const key of ASSISTANT_PATCH_KEYS) {
    if (!(key in src) || src[key] === null || src[key] === undefined) continue;
    if (key === "basic" || key === "housing" || key === "transport") {
      const n = asNumber(src[key]);
      if (n !== undefined) out[key] = n;
      continue;
    }
    if (key === "isSaudi") {
      const b = asBoolean(src[key]);
      if (b !== undefined) out.isSaudi = b;
      continue;
    }
    if (key === "gosiSchemeId") {
      const id = asString(src[key]);
      if (id && GOSI_IDS.has(id)) out.gosiSchemeId = id;
      continue;
    }
    const s = asString(src[key]);
    if (s !== undefined) (out as Record<string, string>)[key] = s;
  }

  const totalFromPatch = asNumber((src as { totalSalary?: unknown }).totalSalary);
  const total = totalFromPatch ?? totalSalaryHint;
  const expanded = expandSalaryPatch(out, total);

  if (expanded.candidateNationality && expanded.isSaudi === undefined) {
    if (looksSaudiNationality(expanded.candidateNationality)) expanded.isSaudi = true;
  }
  if (expanded.isSaudi === true && !expanded.gosiSchemeId) {
    expanded.gosiSchemeId = DEFAULT_GOSI_SCHEME_ID;
  }
  if (expanded.isSaudi === true && !expanded.candidateNationality) {
    expanded.candidateNationality = "سعودي";
  }

  void snapshot;
  return expanded;
}

export function buildPreview(patch: AssistantPatch, snapshot: FormSnapshot): AssistantPreviewRow[] {
  const rows: AssistantPreviewRow[] = [];
  for (const key of ASSISTANT_PATCH_KEYS) {
    if (!(key in patch)) continue;
    const label = FIELD_LABELS_AR[key];
    const value = patch[key];
    if (key === "isSaudi") {
      rows.push({ key, label, value: value ? "نعم" : "لا" });
      continue;
    }
    if (key === "gosiSchemeId") {
      const scheme = GOSI_SCHEMES.find((s) => s.id === value) || GOSI_SCHEMES[1]!;
      rows.push({ key, label, value: scheme.labelAr });
      continue;
    }
    if (key === "basic" || key === "housing" || key === "transport") {
      rows.push({ key, label, value: `${value} ر.س` });
      continue;
    }
    rows.push({ key, label, value: String(value ?? "") });
  }

  const basic = patch.basic ?? snapshot.basic ?? 0;
  const housing = patch.housing ?? snapshot.housing ?? 0;
  const transport = patch.transport ?? snapshot.transport ?? 0;
  const isSaudi = patch.isSaudi ?? snapshot.isSaudi ?? false;
  const gosiSchemeId = patch.gosiSchemeId ?? snapshot.gosiSchemeId ?? DEFAULT_GOSI_SCHEME_ID;
  const salaryTouched =
    patch.basic !== undefined ||
    patch.housing !== undefined ||
    patch.transport !== undefined ||
    patch.isSaudi !== undefined ||
    patch.gosiSchemeId !== undefined;

  if (salaryTouched) {
    const calc = computeFromComponents(basic, housing, transport, gosiSchemeId, isSaudi);
    rows.push({
      key: "_total",
      label: "إجمالي الراتب",
      value: `${calc.basic + calc.housing + calc.transport} ر.س`,
    });
  }

  return rows;
}

/** Instant local understanding for common Arabic HR requests — no API wait. */
export function quickParseOfferRequest(rawMessage: string): AssistantResult | null {
  const text = normalizeArabicDigits(rawMessage).trim();
  if (!text || text.length < 2) return null;

  const patch: AssistantPatch = {};
  const lower = text.toLowerCase();

  // Templates by keyword
  for (const [name, t] of Object.entries(JOB_TEMPLATES)) {
    if (text.includes(name) || lower.includes(name.toLowerCase())) {
      patch.jobTitle = t.jobTitle;
      patch.department = t.department;
      if (!patch.location) patch.location = t.location;
      break;
    }
  }
  if (!patch.jobTitle) {
    if (/بائع|مبيعات/.test(text)) {
      patch.jobTitle = "مندوب مبيعات";
      patch.department = patch.department || "المبيعات";
    } else if (/محاسب/.test(text)) {
      patch.jobTitle = "محاسب";
      patch.department = patch.department || "المالية";
    } else if (/سائق/.test(text)) {
      patch.jobTitle = "سائق";
      patch.department = patch.department || "العمليات";
    }
  }

  // Cities / areas
  const cityMatch = text.match(
    /(?:في|ب|ل|من|منطقة|مدينة)?\s*(الرياض|جدة|جده|الدمام|الخبر|مكة|المدينة|تبوك|أبها|ابها|القصيم|حائل|ينبع|الجبيل|القطيف)/i,
  );
  if (cityMatch?.[1]) {
    let city = cityMatch[1];
    if (city === "جده") city = "جدة";
    if (city === "ابها") city = "أبها";
    patch.location = city.startsWith("ال") || city === "جدة" || city === "تبوك" || city === "أبها"
      ? (city === "جدة" || city === "تبوك" || city === "أبها" ? city : city)
      : city;
    if (city === "جدة") patch.location = "جدة";
    if (city === "تبوك") patch.location = "تبوك";
  }

  // Saudi
  if (/غير\s*سعود|وافد|أجنبي|اجنبي/.test(text)) {
    patch.isSaudi = false;
  } else if (/سعود/.test(text)) {
    patch.isSaudi = true;
    patch.candidateNationality = "سعودي";
    patch.gosiSchemeId = DEFAULT_GOSI_SCHEME_ID;
  }

  // Salary parts
  const basicM = text.match(/(?:أساسي|الاساسي|الأساسي|basic)\s*[:=]?\s*(\d{3,6})/i);
  const housingM = text.match(/(?:سكن|بدل\s*السكن|housing)\s*[:=]?\s*(\d{3,6})/i);
  const transportM = text.match(/(?:نقل|بدل\s*النقل|transport)\s*[:=]?\s*(\d{3,6})/i);
  if (basicM) patch.basic = Number(basicM[1]);
  if (housingM) patch.housing = Number(housingM[1]);
  if (transportM) patch.transport = Number(transportM[1]);

  // Total salary: راتبه 5000 / راتب 5000 / اجمالي 4500
  let total: number | undefined;
  const totalM = text.match(
    /(?:راتبه|راتبها|الراتب|راتب|اجمالي|إجمالي|total)\s*(?:هو|=|:)?\s*(\d{3,6})/i,
  );
  if (totalM) total = Number(totalM[1]);
  if (!total) {
    const bare = text.match(/(?:ب|ـ)?\s*(\d{4,6})\s*(?:ريال|ر\.?\s*س|sar)?/i);
    if (bare && !basicM && !housingM && !transportM) total = Number(bare[1]);
  }

  // Name: لأحمد / اسمه محمد / مرشح فلان
  const nameM =
    text.match(/(?:اسمه|اسمها|المرشح|مرشح|للسيد|للسيدة)\s+([^\d،,.\n]{2,40}?)(?:\s+(?:راتب|سعود|في|ب|من|مندوب|محاسب|سائق|بائع)|$)/i) ||
    text.match(/(?:عرض\s+)?ل(?:ل)?([^\d\s،,]{2,30})(?:\s+راتب|\s+سعود|\s+مندوب|\s+محاسب|\s+في|\s+ب)/i);
  if (nameM?.[1]) {
    let name = nameM[1].replace(/^(ال|ل)/, "").trim();
    // strip trailing job words
    name = name.replace(/\s+(مندوب|محاسب|سائق|بائع|مشرف).*$/i, "").trim();
    if (name.length >= 2 && !/^(عرض|راتب|سعود)/.test(name)) {
      patch.candidateName = name;
    }
  }

  // Email / document
  const emailM = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailM) patch.candidateEmail = emailM[0];
  const docM = text.match(/(?:هوية|اقامة|إقامة|جواز|وثيقة)\s*[#:№]?\s*(\d{5,15})/i);
  if (docM) patch.documentNumber = docM[1];

  const expanded = expandSalaryPatch(patch, total);
  const keys = Object.keys(expanded);
  if (!keys.length) return null;

  // Need at least one meaningful field (not only isSaudi alone unless with more)
  const meaningful = keys.filter((k) => k !== "gosiSchemeId");
  if (!meaningful.length) return null;

  const preview = buildPreview(expanded, {});
  const bits: string[] = [];
  if (expanded.candidateName) bits.push(expanded.candidateName);
  if (expanded.jobTitle) bits.push(expanded.jobTitle);
  if (expanded.location) bits.push(expanded.location);
  if (expanded.basic != null) {
    bits.push(`إجمالي ${(expanded.basic || 0) + (expanded.housing || 0) + (expanded.transport || 0)}`);
  }

  return {
    reply: bits.length ? `تم تعبئة: ${bits.join(" · ")}.` : "تم تحديث الحقول.",
    patch: expanded,
    preview,
    needsClarification: false,
    readyToApply: true,
    appliedHint: "local",
  };
}

function slimSnapshot(snapshot: FormSnapshot) {
  return {
    candidateName: snapshot.candidateName || "",
    jobTitle: snapshot.jobTitle || "",
    department: snapshot.department || "",
    location: snapshot.location || "",
    basic: snapshot.basic ?? 0,
    housing: snapshot.housing ?? 0,
    transport: snapshot.transport ?? 0,
    isSaudi: snapshot.isSaudi ?? false,
    candidateNationality: snapshot.candidateNationality || "",
    documentNumber: snapshot.documentNumber || "",
    candidateEmail: snapshot.candidateEmail || "",
  };
}

export async function runOfferAssistant(opts: {
  apiKey: string;
  messages: { role: "user" | "assistant"; content: string }[];
  formSnapshot: FormSnapshot;
}): Promise<AssistantResult> {
  const { apiKey, messages, formSnapshot } = opts;
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  // Instant path — no network.
  const local = quickParseOfferRequest(lastUser);
  if (local && Object.keys(local.patch).length >= 2) {
    return local;
  }

  const trimmed = messages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 1500),
  }));

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `النموذج الآن: ${JSON.stringify(slimSnapshot(formSnapshot))}\n\nنفّذ آخر طلب فوراً.`,
        },
        ...trimmed,
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Fallback to whatever local got
    if (local) return local;
    throw new Error(`DeepSeek فشل: ${err.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content || "";
  const parsed = parseAssistantJson(text);
  let patch = sanitizePatch(parsed.patch, formSnapshot, asNumber(parsed.totalSalary));

  // Merge local extras if model missed them
  if (local?.patch) {
    patch = { ...local.patch, ...patch };
  }

  const preview = buildPreview(patch, formSnapshot);
  let readyToApply = Object.keys(patch).length > 0 && !Boolean(parsed.needsClarification);
  if (Object.keys(patch).length) readyToApply = true;

  const reply =
    asString(parsed.reply) ||
    (readyToApply ? "تم تحديث النموذج." : "وضّح الاسم أو الراتب أو المسمى.");

  return {
    reply,
    patch,
    preview,
    needsClarification: Boolean(parsed.needsClarification) && !Object.keys(patch).length,
    readyToApply,
    appliedHint: "deepseek",
  };
}
