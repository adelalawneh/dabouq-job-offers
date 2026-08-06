import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ArabicShaper } from "arabic-persian-reshaper";
import type { JobOffer } from "@/lib/db";
import { COMPANY } from "./config";
import { money, salaryArWords, salaryEnWords, resolveFooterFields } from "./helpers";

const A4: [number, number] = [595.28, 841.89];
const CM = 28.35;
const MARGIN_X = 2 * CM;
const CONTENT_W = A4[0] - 4 * CM;
const NAVY = rgb(0.06, 0.13, 0.23);
const LINE_GRAY = rgb(0.8, 0.83, 0.88);
const ROW_BG = rgb(0.94, 0.96, 0.98);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

/**
 * Shape Arabic letter forms for pdf-lib.
 * Do NOT run a bidi visual reorder here — with right-aligned drawText that
 * double-flips the line and produces scrambled glyphs.
 */
function arText(text: string): string {
  const raw = String(text ?? "");
  if (!/[\u0600-\u06FF]/.test(raw)) return raw;
  return ArabicShaper.convertArabic(raw);
}

function hasArabic(text: string) {
  return /[\u0600-\u06FF]/.test(String(text ?? ""));
}

type DrawCtx = {
  page: PDFPage;
  width: number;
  height: number;
  fontAr: PDFFont;
  fontEn: PDFFont;
  fontEnBold: PDFFont;
};

type TextSeg = { text: string; kind: "ar" | "lt" };

function widthOf(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

/** Split mixed Arabic/Latin so digits render with Helvetica (no spaced/reversed glyphs). */
function segmentMixed(text: string): TextSeg[] {
  const raw = String(text ?? "");
  if (!raw) return [];
  const segs: TextSeg[] = [];
  let buf = "";
  let kind: "ar" | "lt" | null = null;

  const isArChar = (ch: string) =>
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch);

  for (const ch of raw) {
    const next: "ar" | "lt" = isArChar(ch) ? "ar" : "lt";
    if (kind === null) {
      kind = next;
      buf = ch;
      continue;
    }
    if (next === kind || /\s/.test(ch)) {
      buf += ch;
      continue;
    }
    segs.push({ text: buf, kind });
    buf = ch;
    kind = next;
  }
  if (buf && kind) segs.push({ text: buf, kind });
  return segs;
}

function measureMixed(ctx: DrawCtx, text: string, size: number) {
  let w = 0;
  for (const seg of segmentMixed(text)) {
    // Same Arabic typeface for digits — Helvetica looked thin next to Arabic.
    const drawn = seg.kind === "ar" ? arText(seg.text) : seg.text;
    w += widthOf(ctx.fontAr, drawn, size);
  }
  return w;
}

/** RTL line: place logical segments from the right edge leftward. */
function drawRight(
  ctx: DrawCtx,
  x: number,
  y: number,
  text: string,
  size: number,
  _font?: PDFFont,
  color = BLACK,
) {
  let cursor = x;
  for (const seg of segmentMixed(text)) {
    const drawn = seg.kind === "ar" ? arText(seg.text) : seg.text;
    if (!drawn) continue;
    const tw = widthOf(ctx.fontAr, drawn, size);
    cursor -= tw;
    ctx.page.drawText(drawn, { x: cursor, y, size, font: ctx.fontAr, color });
  }
}

function drawLeft(ctx: DrawCtx, x: number, y: number, text: string, size: number, font = ctx.fontEn, color = BLACK) {
  ctx.page.drawText(text, { x, y, size, font, color });
}

function drawCentered(ctx: DrawCtx, y: number, text: string, size: number, font: PDFFont, color = NAVY) {
  if (hasArabic(text)) {
    const w = measureMixed(ctx, text, size);
    drawRight(ctx, (ctx.width + w) / 2, y, text, size, font, color);
    return;
  }
  const w = widthOf(font, text, size);
  ctx.page.drawText(text, {
    x: (ctx.width - w) / 2,
    y,
    size,
    font,
    color,
  });
}

function wrapByWidth(ctx: DrawCtx, text: string, maxWidth: number, size: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    const trial = [...current, word].join(" ");
    if (measureMixed(ctx, trial, size) <= maxWidth || current.length === 0) {
      current.push(word);
    } else {
      lines.push(current.join(" "));
      current = [word];
    }
  }
  if (current.length) lines.push(current.join(" "));
  return lines;
}

function drawWrappedAr(ctx: DrawCtx, text: string, xRight: number, y: number, maxWidth: number, size = 8.7, gap = 0.48 * CM) {
  let yy = y;
  for (const line of wrapByWidth(ctx, text, maxWidth, size)) {
    drawRight(ctx, xRight, yy, line, size);
    yy -= gap;
  }
  return yy;
}

function drawWrappedEn(ctx: DrawCtx, text: string, x: number, y: number, maxWidth: number, size = 8.7, gap = 0.48 * CM) {
  let yy = y;
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    const trial = [...current, word].join(" ");
    if (widthOf(ctx.fontEn, trial, size) <= maxWidth || current.length === 0) current.push(word);
    else {
      lines.push(current.join(" "));
      current = [word];
    }
  }
  if (current.length) lines.push(current.join(" "));
  for (const line of lines) {
    drawLeft(ctx, x, yy, line, size);
    yy -= gap;
  }
  return yy;
}

function drawLogo(ctx: DrawCtx, logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null) {
  if (!logo) return { height: 0, bottom: ctx.height - 1.2 * CM };
  // Larger mark — height-first so it reads stronger without covering company text.
  const maxW = 11.5 * CM;
  const maxH = 3.15 * CM;
  const aspect = logo.width / Math.max(logo.height, 1);
  let drawH = Math.min(maxH, maxW / aspect);
  let drawW = drawH * aspect;
  if (drawW > maxW) {
    drawW = maxW;
    drawH = drawW / aspect;
  }
  const top = ctx.height - 0.85 * CM;
  const bottom = top - drawH;
  ctx.page.drawImage(logo, { x: MARGIN_X, y: bottom, width: drawW, height: drawH });
  return { height: drawH, bottom };
}

function drawSectionTitleAr(ctx: DrawCtx, y: number, title: string) {
  const h = 0.65 * CM;
  ctx.page.drawRectangle({
    x: 2 * CM,
    y: y - 0.25 * CM,
    width: ctx.width - 4 * CM,
    height: h,
    color: NAVY,
    borderWidth: 0,
  });
  drawRight(ctx, ctx.width - 2.3 * CM, y - 0.03 * CM, title, 10.5, ctx.fontAr, WHITE);
}

function drawSectionTitleEn(ctx: DrawCtx, y: number, title: string) {
  const h = 0.65 * CM;
  ctx.page.drawRectangle({
    x: 2 * CM,
    y: y - 0.25 * CM,
    width: ctx.width - 4 * CM,
    height: h,
    color: NAVY,
    borderWidth: 0,
  });
  drawLeft(ctx, 2 * CM + 0.35 * CM, y - 0.03 * CM, title, 10.5, ctx.fontEnBold, WHITE);
}

function drawSalaryTableAr(ctx: DrawCtx, rows: [string, string][], y: number) {
  const rowH = 0.72 * CM;
  const tableW = ctx.width - 4 * CM;
  const x = 2 * CM;
  rows.forEach(([label, value], i) => {
    const yy = y - i * rowH;
    if (i === rows.length - 1) {
      ctx.page.drawRectangle({
        x,
        y: yy - rowH + 0.12 * CM,
        width: tableW,
        height: rowH,
        color: ROW_BG,
        borderWidth: 0,
      });
    }
    ctx.page.drawRectangle({
      x,
      y: yy - rowH + 0.12 * CM,
      width: tableW,
      height: rowH,
      borderColor: LINE_GRAY,
      borderWidth: 0.7,
    });
    drawRight(ctx, ctx.width - 2.4 * CM, yy - 0.38 * CM, label, 9.5);
    drawRight(ctx, ctx.width - 10.2 * CM, yy - 0.38 * CM, value, 9.5);
  });
  return y - rows.length * rowH - 0.2 * CM;
}

function drawSalaryTableEn(ctx: DrawCtx, rows: [string, string][], y: number) {
  const rowH = 0.72 * CM;
  const tableW = ctx.width - 4 * CM;
  const x = 2 * CM;
  rows.forEach(([label, value], i) => {
    const yy = y - i * rowH;
    if (i === rows.length - 1) {
      ctx.page.drawRectangle({
        x,
        y: yy - rowH + 0.12 * CM,
        width: tableW,
        height: rowH,
        color: ROW_BG,
        borderWidth: 0,
      });
    }
    ctx.page.drawRectangle({
      x,
      y: yy - rowH + 0.12 * CM,
      width: tableW,
      height: rowH,
      borderColor: LINE_GRAY,
      borderWidth: 0.7,
    });
    drawLeft(ctx, x + 0.35 * CM, yy - 0.38 * CM, `${label}: ${value}`, 9.5);
  });
  return y - rows.length * rowH - 0.2 * CM;
}

async function embedLogo(pdf: PDFDocument) {
  for (const name of ["logo.png", "logo.jpeg", "logo.jpg"]) {
    const logoPath = path.join(process.cwd(), "public", name);
    if (!fs.existsSync(logoPath)) continue;
    try {
      const bytes = fs.readFileSync(logoPath);
      const isPng = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const isJpg = bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
      if (isPng) return pdf.embedPng(bytes);
      if (isJpg) return pdf.embedJpg(bytes);
    } catch {
      /* try next */
    }
  }
  return null;
}

function drawArabicOffer(ctx: DrawCtx, offer: JobOffer, logo: Awaited<ReturnType<typeof embedLogo>>) {
  const logoBox = drawLogo(ctx, logo);

  const companyLines = [
    COMPANY.nameAr,
    `رقم المنشأة: ${COMPANY.establishmentNo}`,
    `س.ت: ${COMPANY.cr}`,
    `هاتف: ${COMPANY.phone}`,
    `الرقم الضريبي: ${COMPANY.taxId}`,
  ];
  let hy = ctx.height - 1.35 * CM;
  for (const line of companyLines) {
    drawRight(ctx, ctx.width - MARGIN_X, hy, line, 10, ctx.fontAr, NAVY);
    hy -= 0.46 * CM;
  }

  const ruleY = Math.min(logoBox.bottom, hy) - 0.45 * CM;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ruleY },
    end: { x: ctx.width - MARGIN_X, y: ruleY },
    thickness: 2,
    color: NAVY,
  });

  const boxW = 5.6 * CM;
  const boxH = 0.9 * CM;
  const boxY = ruleY - 1.15 * CM;
  ctx.page.drawRectangle({
    x: ctx.width / 2 - boxW / 2,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: NAVY,
    borderWidth: 1.2,
  });
  drawCentered(ctx, boxY + 0.28 * CM, "عرض وظيفي", 16, ctx.fontAr, NAVY);

  const date = new Date(offer.sentAt || offer.createdAt || Date.now()).toLocaleDateString("en-GB");
  const footer = resolveFooterFields(offer);
  const net = offer.netSalary ?? Math.round(offer.totalSalary - offer.insurance);

  let y = boxY - 0.85 * CM;
  drawRight(ctx, ctx.width - 2 * CM, y, `التاريخ: ${date}`, 11);
  y -= 0.66 * CM;
  drawRight(ctx, ctx.width - 2 * CM, y, `إلى السيد: ${offer.candidateName} المحترم،،،`, 11);
  y -= 0.66 * CM;
  drawRight(ctx, ctx.width - 2 * CM, y, `رقم الإقامة / الوثيقة: ${offer.documentNumber || "—"}`, 11);
  y -= 0.8 * CM;

  drawSectionTitleAr(ctx, y, "تفاصيل الوظيفة");
  y -= 0.95 * CM;
  for (const [label, value] of [
    ["المسمى الوظيفي", offer.jobTitle],
    ["القسم", offer.department || "—"],
    ["موقع العمل", offer.location || "—"],
  ] as const) {
    drawRight(ctx, ctx.width - 2.3 * CM, y, `${label}: ${value}`, 10.5);
    y -= 0.52 * CM;
  }
  y -= 0.28 * CM;

  drawSectionTitleAr(ctx, y, "تفاصيل العقد");
  y -= 0.95 * CM;
  for (const [label, value] of [
    ["نوع العقد", offer.contractType || "—"],
    ["مدة العقد", offer.contractDuration || "—"],
    ["أيام العمل", offer.workDays || "—"],
    ["فترة التجربة", offer.probation || "—"],
    ["الإجازة السنوية", offer.annualLeave || "—"],
  ] as const) {
    drawRight(ctx, ctx.width - 2.3 * CM, y, `${label}: ${value}`, 10.5);
    y -= 0.52 * CM;
  }
  y -= 0.28 * CM;

  drawSectionTitleAr(ctx, y, "تفاصيل الراتب الشهري");
  y -= 0.9 * CM;
  y = drawSalaryTableAr(
    ctx,
    [
      ["الراتب الأساسي", `${money(offer.basic ?? 0)} ريال سعودي`],
      ["بدل السكن", `${money(offer.housing ?? 0)} ريال سعودي`],
      ["بدل النقل", `${money(offer.transport ?? 0)} ريال سعودي`],
      ["إجمالي الراتب", `${money(offer.totalSalary)} ريال سعودي`],
      ["خصم التأمينات الاجتماعية", `${money(offer.insurance)} ريال سعودي`],
      ["صافي الراتب", `${money(net)} ريال سعودي`],
    ],
    y,
  );
  drawRight(ctx, ctx.width - 2.3 * CM, y, `صافي الراتب كتابة: فقط ${salaryArWords(net)}`, 10);
  y -= 0.78 * CM;

  drawSectionTitleAr(ctx, y, "المزايا");
  y -= 0.95 * CM;
  drawRight(ctx, ctx.width - 2.3 * CM, y, "التأمين الطبي: يُوفر وفقًا لمتطلبات الوظيفة", 10.5);
  y -= 0.52 * CM;
  drawRight(ctx, ctx.width - 2.3 * CM, y, "مزايا أخرى: حسب السياسات الداخلية للشركة", 10.5);
  y -= 0.7 * CM;

  for (const block of [
    footer.footerSalaryReview,
    footer.footerValidity,
    footer.footerAcceptance,
    footer.footerRejection,
  ]) {
    if (!block) continue;
    y = drawWrappedAr(ctx, block, ctx.width - MARGIN_X, y, CONTENT_W, 9.2);
    y -= 0.14 * CM;
  }

  ctx.page.drawLine({
    start: { x: 2 * CM, y: 2.35 * CM },
    end: { x: ctx.width - 2 * CM, y: 2.35 * CM },
    thickness: 1,
    color: NAVY,
  });
  drawRight(ctx, ctx.width - 2.2 * CM, 1.35 * CM, "إدارة الموارد البشرية", 10.5);
}

function drawEnglishOffer(ctx: DrawCtx, offer: JobOffer, logo: Awaited<ReturnType<typeof embedLogo>>) {
  const logoBox = drawLogo(ctx, logo);

  const companyLines = [
    COMPANY.nameEn,
    `Establishment No: ${COMPANY.establishmentNo}`,
    `C.R: ${COMPANY.cr}`,
    `Phone: ${COMPANY.phone}`,
    `Tax ID: ${COMPANY.taxId}`,
  ];
  let hy = ctx.height - 1.35 * CM;
  for (const line of companyLines) {
    drawLeft(ctx, ctx.width - MARGIN_X - widthOf(ctx.fontEn, line, 10), hy, line, 10, ctx.fontEn, NAVY);
    hy -= 0.46 * CM;
  }

  const ruleY = Math.min(logoBox.bottom, hy) - 0.45 * CM;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ruleY },
    end: { x: ctx.width - MARGIN_X, y: ruleY },
    thickness: 2,
    color: NAVY,
  });

  const boxW = 5.6 * CM;
  const boxH = 0.9 * CM;
  const boxY = ruleY - 1.15 * CM;
  ctx.page.drawRectangle({
    x: ctx.width / 2 - boxW / 2,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: NAVY,
    borderWidth: 1.2,
  });
  drawCentered(ctx, boxY + 0.28 * CM, "JOB OFFER", 16, ctx.fontEnBold, NAVY);

  const date = new Date(offer.sentAt || offer.createdAt || Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const footer = resolveFooterFields(offer);
  const net = offer.netSalary ?? Math.round(offer.totalSalary - offer.insurance);
  const x = MARGIN_X + 0.3 * CM;

  let y = boxY - 0.85 * CM;
  const enRows: [string, string][] = [
    ["Date", date],
    ["To", `Mr. ${offer.candidateName}`],
    ["Document No.", offer.documentNumber || "—"],
  ];
  for (const [label, value] of enRows) {
    const prefix = `${label}: `;
    if (hasArabic(value)) {
      drawLeft(ctx, x, y, prefix, 10);
      const shaped = arText(value);
      drawLeft(ctx, x + widthOf(ctx.fontEn, prefix, 10), y, shaped, 10, ctx.fontAr);
    } else {
      drawLeft(ctx, x, y, `${prefix}${value}`, 10);
    }
    y -= 0.58 * CM;
  }
  y -= 0.17 * CM;

  drawSectionTitleEn(ctx, y, "Job Details");
  y -= 0.9 * CM;
  for (const [label, value] of [
    ["Job Title", offer.jobTitle],
    ["Department", offer.department || "—"],
    ["Work Location", offer.location || "—"],
  ] as const) {
    drawLeft(ctx, x, y, `${label}: ${value}`, 10);
    y -= 0.5 * CM;
  }
  y -= 0.25 * CM;

  drawSectionTitleEn(ctx, y, "Contract Details");
  y -= 0.9 * CM;
  for (const [label, value] of [
    ["Contract Type", offer.contractType || "—"],
    ["Duration", offer.contractDuration || "—"],
    ["Working Days", offer.workDays || "—"],
    ["Probation Period", offer.probation || "—"],
    ["Annual Leave", offer.annualLeave || "—"],
  ] as const) {
    drawLeft(ctx, x, y, `${label}: ${value}`, 10);
    y -= 0.5 * CM;
  }
  y -= 0.25 * CM;

  drawSectionTitleEn(ctx, y, "Monthly Salary Details");
  y -= 0.85 * CM;
  y = drawSalaryTableEn(
    ctx,
    [
      ["Basic Salary", `${money(offer.basic ?? 0)} SAR`],
      ["Housing Allowance", `${money(offer.housing ?? 0)} SAR`],
      ["Transport Allowance", `${money(offer.transport ?? 0)} SAR`],
      ["Gross Salary", `${money(offer.totalSalary)} SAR`],
      ["GOSI Deduction", `${money(offer.insurance)} SAR`],
      ["Net Salary", `${money(net)} SAR`],
    ],
    y,
  );
  y = drawWrappedEn(ctx, `Salary in Words: ${salaryEnWords(net)}`, x, y, CONTENT_W, 9.4, 0.42 * CM);
  y -= 0.35 * CM;

  drawSectionTitleEn(ctx, y, "Benefits");
  y -= 0.9 * CM;
  drawLeft(ctx, x, y, "Medical Insurance: Provided as per job requirements", 10);
  y -= 0.5 * CM;
  drawLeft(ctx, x, y, "Other Benefits: As per company internal policies", 10);
  y -= 0.65 * CM;

  for (const block of [
    footer.footerSalaryReview,
    footer.footerValidity,
    footer.footerAcceptance,
    footer.footerRejection,
  ]) {
    if (!block) continue;
    if (hasArabic(block)) y = drawWrappedAr(ctx, block, ctx.width - MARGIN_X, y, CONTENT_W);
    else y = drawWrappedEn(ctx, block, x, y, CONTENT_W);
    y -= 0.12 * CM;
  }

  ctx.page.drawLine({
    start: { x: 2 * CM, y: 2.35 * CM },
    end: { x: ctx.width - 2 * CM, y: 2.35 * CM },
    thickness: 1,
    color: NAVY,
  });
  drawLeft(ctx, 2.3 * CM, 1.35 * CM, "Human Resources Department", 9.5);
}

export async function buildOfferPdf(offer: JobOffer): Promise<Uint8Array> {
  const isAr = (offer.language || "العربية") === "العربية";
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle("DABOUQ Job Offer");

  const fontPath = path.join(process.cwd(), "public", "IBMPlexSansArabic-Regular.ttf");
  const fontAr = await pdf.embedFont(fs.readFileSync(fontPath), { subset: false });
  const fontEn = await pdf.embedFont(StandardFonts.Helvetica);
  const fontEnBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);

  const page = pdf.addPage(A4);
  const ctx: DrawCtx = {
    page,
    width: A4[0],
    height: A4[1],
    fontAr,
    fontEn,
    fontEnBold,
  };

  if (isAr) drawArabicOffer(ctx, offer, logo);
  else drawEnglishOffer(ctx, offer, logo);

  return pdf.save();
}
