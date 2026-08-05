import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { JobOffer } from "@/lib/db";
import { COMPANY } from "./config";
import { money, salaryArWords, salaryEnWords, resolveFooterFields } from "./helpers";

const NAVY = rgb(0.06, 0.13, 0.23);
const GRAY = rgb(0.35, 0.4, 0.45);

function reshapeAr(text: string): string {
  // pdf-lib does not shape Arabic; reverse chars as a pragmatic RTL display aid.
  const hasAr = /[\u0600-\u06FF]/.test(text);
  if (!hasAr) return text;
  return [...text].reverse().join("");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (trial.length <= maxChars) cur = trial;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function buildOfferPdf(offer: JobOffer): Promise<Uint8Array> {
  const isAr = (offer.language || "العربية") === "العربية";
  const footer = resolveFooterFields(offer);
  const net = offer.netSalary ?? Math.round(offer.totalSalary - offer.insurance);
  const date = (offer.sentAt || offer.createdAt)
    ? new Date(offer.sentAt || offer.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-GB")
    : new Date().toLocaleDateString(isAr ? "ar-SA" : "en-GB");

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontPath = path.join(process.cwd(), "public", "IBMPlexSansArabic-Regular.ttf");
  const fontBytes = fs.readFileSync(fontPath);
  const font = await pdf.embedFont(fontBytes, { subset: true });

  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 48;
  let y = height - margin;

  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logo = await pdf.embedPng(logoBytes);
      const logoW = 160;
      const logoH = (logo.height / logo.width) * logoW;
      page.drawImage(logo, { x: margin, y: y - logoH, width: logoW, height: logoH });
      y -= logoH + 12;
    }
  } catch {
    /* logo optional */
  }

  const draw = (text: string, opts: { size?: number; color?: ReturnType<typeof rgb>; bold?: boolean } = {}) => {
    const size = opts.size ?? 10;
    const color = opts.color ?? NAVY;
    const line = isAr ? reshapeAr(text) : text;
    if (isAr) {
      page.drawText(line, {
        x: width - margin - font.widthOfTextAtSize(line, size),
        y,
        size,
        font,
        color,
      });
    } else {
      page.drawText(line, { x: margin, y, size, font, color });
    }
    y -= size + 6;
  };

  const companyLines = isAr
    ? [
        COMPANY.nameAr,
        `رقم المنشأة: ${COMPANY.establishmentNo}`,
        `س.ت: ${COMPANY.cr}`,
        `هاتف: ${COMPANY.phone}`,
        `الرقم الضريبي: ${COMPANY.taxId}`,
      ]
    : [
        COMPANY.nameEn,
        `Establishment No: ${COMPANY.establishmentNo}`,
        `C.R: ${COMPANY.cr}`,
        `Phone: ${COMPANY.phone}`,
        `Tax ID: ${COMPANY.taxId}`,
      ];

  for (const line of companyLines) draw(line, { size: 9, color: GRAY });
  y -= 8;
  draw(isAr ? "عرض وظيفي" : "Job Offer", { size: 16 });
  draw(isAr ? `التاريخ: ${date}` : `Date: ${date}`, { size: 10, color: GRAY });
  y -= 6;

  const rows: [string, string][] = isAr
    ? [
        ["الاسم", offer.candidateName],
        ["الجنسية", offer.candidateNationality || "—"],
        ["رقم الهوية / الجواز", offer.documentNumber || "—"],
        ["المسمى الوظيفي", offer.jobTitle],
        ["القسم", offer.department || "—"],
        ["موقع العمل", offer.location || "—"],
        ["نوع العقد", offer.contractType || "—"],
        ["مدة العقد", offer.contractDuration || "—"],
        ["أيام العمل", offer.workDays || "—"],
        ["فترة التجربة", offer.probation || "—"],
        ["الإجازة السنوية", offer.annualLeave || "—"],
        ["الراتب الإجمالي", `${money(offer.totalSalary)} ر.س`],
        ["التأمين", `${money(offer.insurance)} ر.س`],
        ["الأساسي", `${money(offer.basic ?? 0)} ر.س`],
        ["بدل السكن", `${money(offer.housing ?? 0)} ر.س`],
        ["بدل المواصلات", `${money(offer.transport ?? 0)} ر.س`],
        ["صافي الراتب", `${money(net)} ر.س`],
      ]
    : [
        ["Name", offer.candidateName],
        ["Nationality", offer.candidateNationality || "—"],
        ["ID / Passport", offer.documentNumber || "—"],
        ["Job title", offer.jobTitle],
        ["Department", offer.department || "—"],
        ["Location", offer.location || "—"],
        ["Contract type", offer.contractType || "—"],
        ["Duration", offer.contractDuration || "—"],
        ["Work days", offer.workDays || "—"],
        ["Probation", offer.probation || "—"],
        ["Annual leave", offer.annualLeave || "—"],
        ["Total salary", `${money(offer.totalSalary)} SAR`],
        ["Insurance", `${money(offer.insurance)} SAR`],
        ["Basic", `${money(offer.basic ?? 0)} SAR`],
        ["Housing", `${money(offer.housing ?? 0)} SAR`],
        ["Transport", `${money(offer.transport ?? 0)} SAR`],
        ["Net salary", `${money(net)} SAR`],
      ];

  for (const [label, value] of rows) {
    if (y < 80) break;
    const line = `${label}: ${value}`;
    draw(line, { size: 10 });
  }

  y -= 4;
  const words = isAr ? salaryArWords(net) : salaryEnWords(net);
  draw(isAr ? `فقط: ${words}` : `Only: ${words}`, { size: 9, color: GRAY });
  y -= 8;

  const footerBlocks = [
    footer.footerSalaryReview,
    footer.footerValidity,
    footer.footerAcceptance,
    footer.footerRejection,
  ];
  for (const block of footerBlocks) {
    for (const line of wrapText(block, isAr ? 55 : 70)) {
      if (y < 50) break;
      draw(line, { size: 8, color: GRAY });
    }
    y -= 4;
  }

  return pdf.save();
}
