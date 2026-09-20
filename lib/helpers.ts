import { DEFAULT_OFFER_FOOTER } from "./config";

export function money(value: number) {
  return `${Math.round(value).toLocaleString("en-US")}`;
}

export function salarySplit(total: number) {
  const basic = Math.round(total * 0.645);
  const housing = Math.round(total * 0.226);
  const transport = Math.round(total - basic - housing);
  return { basic, housing, transport };
}

function onesAr(n: number): string {
  const ones = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
    "عشرة",
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];
  return ones[n] || "";
}

function tensAr(n: number): string {
  if (n < 20) return onesAr(n);
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const o = n % 10;
  const t = Math.floor(n / 10);
  if (!o) return tens[t];
  return `${onesAr(o)} و${tens[t]}`;
}

function hundredsAr(n: number): string {
  if (n < 100) return tensAr(n);
  const hundreds = [
    "",
    "مائة",
    "مائتان",
    "ثلاثمائة",
    "أربعمائة",
    "خمسمائة",
    "ستمائة",
    "سبعمائة",
    "ثمانمائة",
    "تسعمائة",
  ];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (!rest) return hundreds[h];
  return `${hundreds[h]} و${tensAr(rest)}`;
}

/** Simple Arabic number words for salary amounts (integer SAR). */
export function salaryArWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "صفر ريال سعودي لا غير";
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rem = n % 1000;
  if (millions) {
    if (millions === 1) parts.push("مليون");
    else if (millions === 2) parts.push("مليونان");
    else parts.push(`${hundredsAr(millions)} مليون`);
  }
  if (thousands) {
    if (thousands === 1) parts.push("ألف");
    else if (thousands === 2) parts.push("ألفان");
    else parts.push(`${hundredsAr(thousands)} ألف`);
  }
  if (rem) parts.push(hundredsAr(rem));
  return `${parts.join(" و")} ريال سعودي لا غير`;
}

export function salaryEnWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  try {
    const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", currencyDisplay: "name" });
    // Fallback readable form
    void fmt;
  } catch {
    /* ignore */
  }
  const words = numberToEnglish(n);
  return `${words} Saudi Riyals Only`;
}

function numberToEnglish(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function under1000(x: number): string {
    if (x < 20) return ones[x];
    if (x < 100) {
      const o = x % 10;
      return o ? `${tens[Math.floor(x / 10)]}-${ones[o]}` : tens[Math.floor(x / 10)];
    }
    const h = Math.floor(x / 100);
    const r = x % 100;
    return r ? `${ones[h]} Hundred ${under1000(r)}` : `${ones[h]} Hundred`;
  }
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rem = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(`${under1000(millions)} Million`);
  if (thousands) parts.push(`${under1000(thousands)} Thousand`);
  if (rem) parts.push(under1000(rem));
  return parts.join(" ");
}

/** ASCII-only for HTTP headers / email filenames (Arabic names must not go in ByteString headers). */
export function cleanFilename(name: string) {
  const cleaned = name
    .trim()
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[\\/*?:"<>|]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned || "candidate";
}

/** RFC 5987 Content-Disposition — ASCII fallback + UTF-8 filename*. */
export function pdfAttachmentDisposition(candidateName: string, language: string) {
  const isAr = (language || "العربية") === "العربية";
  const suffix = isAr ? "AR" : "EN";
  const ascii = `DABOUQ_JOB_OFFER_${cleanFilename(candidateName)}_${suffix}.pdf`;
  const utf8Name = `DABOUQ_JOB_OFFER_${candidateName.trim() || "candidate"}_${suffix}.pdf`;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`;
}

export function footerDefaults(language: string) {
  return language === "العربية" ? DEFAULT_OFFER_FOOTER.ar : DEFAULT_OFFER_FOOTER.en;
}

export function resolveFooterFields(data: {
  language?: string | null;
  footerSalaryReview?: string | null;
  footerValidity?: string | null;
  footerAcceptance?: string | null;
  footerRejection?: string | null;
}) {
  const defaults = footerDefaults(data.language || "العربية");
  return {
    footerSalaryReview: (data.footerSalaryReview || defaults.salaryReview).trim(),
    footerValidity: (data.footerValidity || defaults.validity).trim(),
    footerAcceptance: (data.footerAcceptance || defaults.acceptance).trim(),
    footerRejection: (data.footerRejection || defaults.rejection).trim(),
  };
}

export function extractJson(text: string): Record<string, string> {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, string>;
  } catch {
    return {};
  }
}

export function computeSalaryFields(
  totalSalary: number,
  insurance: number,
  overrides?: {
    basic?: number | null;
    housing?: number | null;
    transport?: number | null;
    netSalary?: number | null;
  },
) {
  const { basic, housing, transport } = salarySplit(totalSalary);
  const netSalary = Math.round(totalSalary - insurance);
  return {
    basic: overrides?.basic ?? basic,
    housing: overrides?.housing ?? housing,
    transport: overrides?.transport ?? transport,
    netSalary: overrides?.netSalary ?? netSalary,
  };
}
