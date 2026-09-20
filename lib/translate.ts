import { extractJson } from "./helpers";
import { localizeContractValue } from "./config";

const HAS_ARABIC = /[\u0600-\u06FF]/;
const HAS_LATIN = /[A-Za-z]/;

export type PdfLocaleFields = {
  jobTitle: string;
  department: string;
  location: string;
  contractType: string;
  contractDuration: string;
  workDays: string;
  probation: string;
  annualLeave: string;
  footerSalaryReview: string;
  footerValidity: string;
  footerAcceptance: string;
  footerRejection: string;
};

function needsTranslation(text: string, target: "ar" | "en") {
  const raw = text.trim();
  if (!raw || raw === "—") return false;
  if (target === "en") return HAS_ARABIC.test(raw);
  // Arabic PDF: translate Latin free text that has no Arabic yet.
  return HAS_LATIN.test(raw) && !HAS_ARABIC.test(raw);
}

async function translateBatch(
  texts: Record<string, string>,
  target: "ar" | "en",
  apiKey: string,
): Promise<Record<string, string>> {
  const keys = Object.keys(texts);
  if (!keys.length) return {};

  const targetName = target === "en" ? "English" : "Arabic";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You translate HR job-offer field values for a Saudi company.
Translate each value into ${targetName}.
Keep meaning precise. Preserve numbers, dates, currency codes, IDs, and punctuation.
Do not add explanations.
Return STRICT JSON ONLY with the same keys:
${JSON.stringify(texts)}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini translate failed: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = extractJson(text);
  const out: Record<string, string> = {};
  for (const key of keys) {
    const translated = (parsed[key] || "").trim();
    out[key] = translated || texts[key];
  }
  return out;
}

/**
 * Localize free-text offer fields for the PDF language.
 * 1) Known default AR↔EN map (no AI)
 * 2) Gemini for remaining mismatched free text
 * Falls back to originals if GEMINI_API_KEY is missing or the call fails.
 */
export async function localizeOfferFieldsForPdf(
  offer: {
    language?: string | null;
    jobTitle: string;
    department?: string | null;
    location?: string | null;
    contractType?: string | null;
    contractDuration?: string | null;
    workDays?: string | null;
    probation?: string | null;
    annualLeave?: string | null;
    footerSalaryReview?: string | null;
    footerValidity?: string | null;
    footerAcceptance?: string | null;
    footerRejection?: string | null;
  },
  footer: {
    footerSalaryReview: string;
    footerValidity: string;
    footerAcceptance: string;
    footerRejection: string;
  },
): Promise<PdfLocaleFields> {
  const isAr = (offer.language || "العربية") === "العربية";
  const target: "ar" | "en" = isAr ? "ar" : "en";
  const langLabel = isAr ? "العربية" : "English";

  const fields: PdfLocaleFields = {
    jobTitle: (offer.jobTitle || "").trim() || "—",
    department: (offer.department || "").trim() || "—",
    location: (offer.location || "").trim() || "—",
    contractType: localizeContractValue(offer.contractType, langLabel),
    contractDuration: localizeContractValue(offer.contractDuration, langLabel),
    workDays: localizeContractValue(offer.workDays, langLabel),
    probation: localizeContractValue(offer.probation, langLabel),
    annualLeave: localizeContractValue(offer.annualLeave, langLabel),
    footerSalaryReview: footer.footerSalaryReview,
    footerValidity: footer.footerValidity,
    footerAcceptance: footer.footerAcceptance,
    footerRejection: footer.footerRejection,
  };

  const pending: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields) as [keyof PdfLocaleFields, string][]) {
    if (needsTranslation(value, target)) pending[key] = value;
  }

  if (!Object.keys(pending).length) return fields;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[translate] GEMINI_API_KEY missing — leaving mismatched free text as-is");
    return fields;
  }

  try {
    const translated = await translateBatch(pending, target, apiKey);
    return { ...fields, ...translated };
  } catch (e) {
    console.error("[translate]", e);
    return fields;
  }
}
