import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ArabicShaper } from "arabic-persian-reshaper";
import type { JobOffer } from "@/lib/db";
import { COMPANY, DEFAULT_OFFER_FOOTER, OFFER_BENEFITS } from "./config";
import { money, resolveFooterFields } from "./helpers";
import { localizeOfferFieldsForPdf, type PdfLocaleFields } from "./translate";

const A4: [number, number] = [595.28, 841.89];
const CM = 28.35;
const MARGIN_X = 2 * CM;
const CONTENT_W = A4[0] - 4 * CM;
const PAGE_BOTTOM = 1.6 * CM;
const PAGE_TOP = A4[1] - 1.4 * CM;
const NAVY = rgb(0.06, 0.13, 0.23);
const LINE_GRAY = rgb(0.8, 0.83, 0.88);
const ROW_BG = rgb(0.94, 0.96, 0.98);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

/** Normalize punctuation that often breaks Arabic PDF fonts / BiDi. */
function sanitizePdfText(text: string) {
  return String(text ?? "")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/\u00A0/g, " ")
    // Keep "(3)" as one LTR unit so the digit stays inside the parentheses in RTL layout.
    .replace(/\(\s*(\d+)\s*\)/g, "\u200E($1)\u200E")
    .trim();
}

/**
 * Shape Arabic letter forms for pdf-lib.
 * Do NOT run a bidi visual reorder here — with right-aligned drawText that
 * double-flips the line and produces scrambled glyphs.
 * Do NOT swap () globally — that pulls digits out of "(3)" and leaves empty parens.
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

/** Split mixed Arabic/Latin so digits render cleanly with RTL drawRight. */
function segmentMixed(text: string): TextSeg[] {
  const raw = String(text ?? "");
  if (!raw) return [];
  const segs: TextSeg[] = [];
  let buf = "";
  let kind: "ar" | "lt" | null = null;

  const isArDigit = (ch: string) => /[\u0660-\u0669\u06F0-\u06F9]/.test(ch);
  const isArChar = (ch: string) =>
    !isArDigit(ch) &&
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch);
  // Keep colon/comma/space/slash with the current run. Parentheses around numbers are handled below.
  const isNeutral = (ch: string) => /[\s:：؛،,\-\/\u200E\u200F]/.test(ch);

  const flush = () => {
    if (buf && kind) segs.push({ text: buf, kind });
    buf = "";
    kind = null;
  };

  for (let i = 0; i < raw.length; i++) {
    // Keep "(123)" / "\u200E(123)\u200E" as one Latin token so the digit stays inside.
    if (raw[i] === "(" || raw[i] === "\u200E") {
      const slice = raw.slice(i);
      const m = slice.match(/^(?:\u200E)?\(\s*(\d+)\s*\)(?:\u200E)?/);
      if (m) {
        flush();
        segs.push({ text: `(${m[1]})`, kind: "lt" });
        i += m[0].length - 1;
        continue;
      }
    }

    const ch = raw[i]!;
    const next: "ar" | "lt" = isArChar(ch) ? "ar" : "lt";
    if (kind === null) {
      kind = next;
      buf = ch;
      continue;
    }
    if (isNeutral(ch) || next === kind) {
      buf += ch;
      continue;
    }
    flush();
    kind = next;
    buf = ch;
  }
  flush();
  return segs;
}

function measureMixed(ctx: DrawCtx, text: string, size: number) {
  let w = 0;
  for (const seg of segmentMixed(sanitizePdfText(text))) {
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
  for (const seg of segmentMixed(sanitizePdfText(text))) {
    const drawn = seg.kind === "ar" ? arText(seg.text) : seg.text;
    if (!drawn) continue;
    const tw = widthOf(ctx.fontAr, drawn, size);
    cursor -= tw;
    ctx.page.drawText(drawn, { x: cursor, y, size, font: ctx.fontAr, color });
  }
}

/** LTR draw — never pass Arabic through Helvetica/WinAnsi. */
function drawLeft(ctx: DrawCtx, x: number, y: number, text: string, size: number, font = ctx.fontEn, color = BLACK) {
  if (!hasArabic(text)) {
    ctx.page.drawText(text, { x, y, size, font, color });
    return;
  }
  let cursor = x;
  for (const seg of segmentMixed(text)) {
    const drawn = seg.kind === "ar" ? arText(seg.text) : seg.text;
    if (!drawn) continue;
    const tw = widthOf(ctx.fontAr, drawn, size);
    ctx.page.drawText(drawn, { x: cursor, y, size, font: ctx.fontAr, color });
    cursor += tw;
  }
}

function measureLine(ctx: DrawCtx, text: string, size: number, preferEnFont?: PDFFont) {
  if (hasArabic(text)) return measureMixed(ctx, text, size);
  return widthOf(preferEnFont ?? ctx.fontEn, text, size);
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
  for (const line of wrapByWidth(ctx, sanitizePdfText(text), maxWidth, size)) {
    drawRight(ctx, xRight, yy, line, size);
    yy -= gap;
  }
  return yy;
}

type OfferFlow = {
  pdf: PDFDocument;
  ctx: DrawCtx;
  y: number;
};

function startNewContentPage(flow: OfferFlow) {
  const page = flow.pdf.addPage(A4);
  flow.ctx = { ...flow.ctx, page };
  flow.y = PAGE_TOP;
  drawRight(flow.ctx, flow.ctx.width - MARGIN_X, flow.y, "عرض وظيفي - تابع", 9, flow.ctx.fontAr, NAVY);
  flow.y -= 0.7 * CM;
}

function ensureSpace(flow: OfferFlow, needed: number) {
  if (flow.y - needed < PAGE_BOTTOM) startNewContentPage(flow);
}

function drawArSection(flow: OfferFlow, title: string) {
  ensureSpace(flow, 1.4 * CM);
  drawSectionTitleAr(flow.ctx, flow.y, title);
  flow.y -= 0.78 * CM;
}

function drawArKv(flow: OfferFlow, label: string, value: string, size = 9.5) {
  const line = sanitizePdfText(`${label}: ${value || "—"}`);
  const lines = wrapByWidth(flow.ctx, line, CONTENT_W - 0.3 * CM, size);
  for (const row of lines) {
    ensureSpace(flow, 0.55 * CM);
    drawRight(flow.ctx, flow.ctx.width - 2.3 * CM, flow.y, row, size);
    flow.y -= 0.42 * CM;
  }
}

function drawArParagraph(flow: OfferFlow, text: string, size = 8.6) {
  const gap = 0.4 * CM;
  for (const line of wrapByWidth(flow.ctx, sanitizePdfText(text), CONTENT_W, size)) {
    ensureSpace(flow, gap + 0.1 * CM);
    drawRight(flow.ctx, flow.ctx.width - MARGIN_X, flow.y, line, size);
    flow.y -= gap;
  }
}

function drawSalaryTableArFlow(flow: OfferFlow, rows: [string, string][]) {
  const rowH = 0.62 * CM;
  const tableW = flow.ctx.width - 4 * CM;
  const x = 2 * CM;
  ensureSpace(flow, rows.length * rowH + 0.3 * CM);
  rows.forEach(([label, value], i) => {
    const yy = flow.y - i * rowH;
    if (i === rows.length - 1) {
      flow.ctx.page.drawRectangle({
        x,
        y: yy - rowH + 0.1 * CM,
        width: tableW,
        height: rowH,
        color: ROW_BG,
        borderWidth: 0,
      });
    }
    flow.ctx.page.drawRectangle({
      x,
      y: yy - rowH + 0.1 * CM,
      width: tableW,
      height: rowH,
      borderColor: LINE_GRAY,
      borderWidth: 0.7,
    });
    drawRight(flow.ctx, flow.ctx.width - 2.4 * CM, yy - 0.34 * CM, sanitizePdfText(label), 9);
    drawRight(flow.ctx, flow.ctx.width - 10.2 * CM, yy - 0.34 * CM, sanitizePdfText(value), 9);
  });
  flow.y -= rows.length * rowH + 0.16 * CM;
}

function drawArabicOffer(
  flow: OfferFlow,
  offer: JobOffer,
  fields: PdfLocaleFields,
  logo: Awaited<ReturnType<typeof embedLogo>>,
) {
  const ctx = flow.ctx;
  const logoBox = drawLogo(ctx, logo);

  const companyLines = [
    COMPANY.nameAr,
    `رقم المنشأة: ${COMPANY.establishmentNo}`,
    `س.ت: ${COMPANY.cr}`,
    `هاتف: ${COMPANY.phone}`,
    `الرقم الضريبي: ${COMPANY.taxId}`,
  ];
  let hy = ctx.height - 1.15 * CM;
  for (const line of companyLines) {
    drawRight(ctx, ctx.width - MARGIN_X, hy, line, 9, ctx.fontAr, NAVY);
    hy -= 0.4 * CM;
  }

  const ruleY = Math.min(logoBox.bottom, hy) - 0.35 * CM;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ruleY },
    end: { x: ctx.width - MARGIN_X, y: ruleY },
    thickness: 2,
    color: NAVY,
  });

  const boxW = 5.2 * CM;
  const boxH = 0.78 * CM;
  const boxY = ruleY - 1.0 * CM;
  ctx.page.drawRectangle({
    x: ctx.width / 2 - boxW / 2,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: NAVY,
    borderWidth: 1.2,
  });
  drawCentered(ctx, boxY + 0.22 * CM, "عرض وظيفي", 15, ctx.fontAr, NAVY);

  const date = new Date(offer.sentAt || offer.createdAt || Date.now()).toLocaleDateString("en-GB");
  flow.y = boxY - 0.7 * CM;

  drawArKv(flow, "التاريخ", date, 10);
  drawArKv(flow, "إلى السيد/ة", `${sanitizePdfText(offer.candidateName)} المحترم/ة`, 10);
  drawArKv(flow, "رقم الإقامة / الوثيقة", offer.documentNumber || "—", 10);
  flow.y -= 0.12 * CM;

  drawArSection(flow, "تفاصيل الوظيفة");
  drawArKv(flow, "المسمى الوظيفي", fields.jobTitle);
  drawArKv(flow, "القسم", fields.department);
  drawArKv(flow, "موقع العمل", fields.location);
  flow.y -= 0.1 * CM;

  drawArSection(flow, "تفاصيل العقد");
  drawArKv(flow, "نوع العقد", fields.contractType);
  drawArKv(flow, "مدة العقد", fields.contractDuration);
  drawArKv(flow, "أيام العمل", fields.workDays);
  drawArKv(flow, "فترة التجربة", fields.probation);
  drawArKv(flow, "الإجازة السنوية", fields.annualLeave);
  flow.y -= 0.1 * CM;

  drawArSection(flow, "تفاصيل الراتب الشهري");
  drawSalaryTableArFlow(flow, [
    ["الراتب الأساسي", `${money(offer.basic ?? 0)} ريال سعودي`],
    ["بدل السكن", `${money(offer.housing ?? 0)} ريال سعودي`],
    ["بدل النقل", `${money(offer.transport ?? 0)} ريال سعودي`],
    ["إجمالي الراتب", `${money(offer.totalSalary)} ريال سعودي`],
  ]);
  drawArParagraph(flow, OFFER_BENEFITS.ar.deductionsNote, 8.5);
  flow.y -= 0.16 * CM;

  drawArSection(flow, "المزايا");
  drawArParagraph(flow, OFFER_BENEFITS.ar.medical, 9);
  drawArParagraph(flow, OFFER_BENEFITS.ar.other, 9);
  flow.y -= 0.12 * CM;

  drawArSection(flow, "مراجعة الراتب");
  drawArParagraph(flow, fields.footerSalaryReview);
  flow.y -= 0.1 * CM;

  drawArSection(flow, "صلاحية العرض");
  drawArParagraph(flow, fields.footerValidity);
  flow.y -= 0.1 * CM;

  drawArSection(flow, "تنويه");
  drawArParagraph(flow, DEFAULT_OFFER_FOOTER.ar.notice);
  flow.y -= 0.1 * CM;

  drawArSection(flow, "قبول العرض");
  drawArParagraph(flow, `[ ] ${fields.footerAcceptance}`, 8.8);
  flow.y -= 0.08 * CM;
  drawArParagraph(flow, `[ ] ${fields.footerRejection}`, 8.8);
  drawArParagraph(flow, "....................................................................................", 9);
  flow.y -= 0.12 * CM;

  for (const line of [
    "اسم الموظف: ........................................................",
    "التوقيع: ..............................................................",
    "التاريخ: ____ / ____ / ______م",
  ]) {
    ensureSpace(flow, 0.5 * CM);
    drawRight(flow.ctx, flow.ctx.width - 2.3 * CM, flow.y, line, 9);
    flow.y -= 0.4 * CM;
  }
  flow.y -= 0.12 * CM;
  for (const line of [
    "اعتماد إدارة الموارد البشرية: ....................................",
    "التوقيع: ..............................................................",
    "التاريخ: ____ / ____ / ______م",
  ]) {
    ensureSpace(flow, 0.5 * CM);
    drawRight(flow.ctx, flow.ctx.width - 2.3 * CM, flow.y, line, 9);
    flow.y -= 0.4 * CM;
  }
}

function drawWrappedEn(ctx: DrawCtx, text: string, x: number, y: number, maxWidth: number, size = 8.7, gap = 0.48 * CM) {
  let yy = y;
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    const trial = [...current, word].join(" ");
    if (measureLine(ctx, trial, size) <= maxWidth || current.length === 0) current.push(word);
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
  // Strong header mark — multipage flow keeps the body from clipping.
  const maxW = 12 * CM;
  const maxH = 3.1 * CM;
  const aspect = logo.width / Math.max(logo.height, 1);
  let drawH = Math.min(maxH, maxW / aspect);
  let drawW = drawH * aspect;
  if (drawW > maxW) {
    drawW = maxW;
    drawH = drawW / aspect;
  }
  const top = ctx.height - 0.75 * CM;
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

function drawEnglishOffer(
  ctx: DrawCtx,
  offer: JobOffer,
  fields: PdfLocaleFields,
  logo: Awaited<ReturnType<typeof embedLogo>>,
) {
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
    drawLeft(ctx, ctx.width - MARGIN_X - measureLine(ctx, line, 10), hy, line, 10, ctx.fontEn, NAVY);
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
  const x = MARGIN_X + 0.3 * CM;

  let y = boxY - 0.85 * CM;
  const enRows: [string, string][] = [
    ["Date", date],
    ["To", `Mr./Ms. ${offer.candidateName}`],
    ["Document No.", offer.documentNumber || "—"],
  ];
  for (const [label, value] of enRows) {
    drawLeft(ctx, x, y, `${label}: ${value}`, 10);
    y -= 0.52 * CM;
  }
  y -= 0.14 * CM;

  drawSectionTitleEn(ctx, y, "Job Details");
  y -= 0.82 * CM;
  for (const [label, value] of [
    ["Job Title", fields.jobTitle],
    ["Department", fields.department],
    ["Work Location", fields.location],
  ] as const) {
    drawLeft(ctx, x, y, `${label}: ${value}`, 10);
    y -= 0.46 * CM;
  }
  y -= 0.18 * CM;

  drawSectionTitleEn(ctx, y, "Contract Details");
  y -= 0.82 * CM;
  for (const [label, value] of [
    ["Contract Type", fields.contractType],
    ["Duration", fields.contractDuration],
    ["Working Days", fields.workDays],
    ["Probation Period", fields.probation],
    ["Annual Leave", fields.annualLeave],
  ] as const) {
    drawLeft(ctx, x, y, `${label}: ${value}`, 10);
    y -= 0.46 * CM;
  }
  y -= 0.18 * CM;

  drawSectionTitleEn(ctx, y, "Monthly Salary Details");
  y -= 0.78 * CM;
  y = drawSalaryTableEn(
    ctx,
    [
      ["Basic Salary", `${money(offer.basic ?? 0)} SAR`],
      ["Housing Allowance", `${money(offer.housing ?? 0)} SAR`],
      ["Transport Allowance", `${money(offer.transport ?? 0)} SAR`],
      ["Gross Salary", `${money(offer.totalSalary)} SAR`],
    ],
    y,
  );
  y = drawWrappedEn(ctx, OFFER_BENEFITS.en.deductionsNote, x, y, CONTENT_W, 9, 0.4 * CM);
  y -= 0.22 * CM;

  drawSectionTitleEn(ctx, y, "Benefits");
  y -= 0.82 * CM;
  drawLeft(ctx, x, y, OFFER_BENEFITS.en.medical, 9.5);
  y -= 0.46 * CM;
  drawLeft(ctx, x, y, OFFER_BENEFITS.en.other, 9.5);
  y -= 0.5 * CM;

  drawSectionTitleEn(ctx, y, "Salary Review");
  y -= 0.78 * CM;
  y = drawWrappedEn(ctx, fields.footerSalaryReview, x, y, CONTENT_W, 8.8);
  y -= 0.18 * CM;

  drawSectionTitleEn(ctx, y, "Offer Validity");
  y -= 0.78 * CM;
  y = drawWrappedEn(ctx, fields.footerValidity, x, y, CONTENT_W, 8.8);
  y -= 0.18 * CM;

  drawSectionTitleEn(ctx, y, "Notice");
  y -= 0.78 * CM;
  y = drawWrappedEn(ctx, DEFAULT_OFFER_FOOTER.en.notice, x, y, CONTENT_W, 8.8);
  y -= 0.18 * CM;

  drawSectionTitleEn(ctx, y, "Offer Acceptance");
  y -= 0.78 * CM;
  drawLeft(ctx, x, y, `[ ] ${fields.footerAcceptance}`, 9);
  y -= 0.5 * CM;
  drawLeft(ctx, x, y, `[ ] ${fields.footerRejection}`, 9);
  y -= 0.4 * CM;
  y = drawWrappedEn(ctx, "....................................................................................", x, y, CONTENT_W, 9);
  y -= 0.3 * CM;

  for (const line of [
    "Employee name: ........................................................",
    "Signature: ..............................................................",
    "Date: ____ / ____ / ________",
  ]) {
    drawLeft(ctx, x, y, line, 9);
    y -= 0.4 * CM;
  }
  y -= 0.16 * CM;
  for (const line of [
    "HR approval: ....................................................",
    "Signature: ..............................................................",
    "Date: ____ / ____ / ________",
  ]) {
    drawLeft(ctx, x, y, line, 9);
    y -= 0.4 * CM;
  }
}

export async function buildOfferPdf(offer: JobOffer): Promise<Uint8Array> {
  const isAr = (offer.language || "العربية") === "العربية";
  const footer = resolveFooterFields(offer);
  const fields = await localizeOfferFieldsForPdf(offer, footer);

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

  if (isAr) {
    const flow: OfferFlow = { pdf, ctx, y: PAGE_TOP };
    drawArabicOffer(flow, offer, fields, logo);
  } else {
    drawEnglishOffer(ctx, offer, fields, logo);
  }

  return pdf.save();
}
