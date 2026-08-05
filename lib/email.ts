import nodemailer from "nodemailer";
import type { JobOffer } from "@/lib/db";
import { COMPANY, OFFER_VALIDITY_DAYS } from "./config";
import { cleanFilename, money } from "./helpers";
import { appBaseUrl } from "./session";

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export function respondUrl(token: string) {
  return `${appBaseUrl()}/r/${token}`;
}

function offerEmailHtml(offer: JobOffer, url: string) {
  const isAr = (offer.language || "العربية") === "العربية";
  const net = offer.netSalary ?? Math.round(offer.totalSalary - offer.insurance);
  if (isAr) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><body style="font-family:Tahoma,Arial,sans-serif;background:#f4f6f9;padding:24px">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
        <div style="background:#0f213a;color:#fff;padding:24px;text-align:center">
          <h1 style="margin:0;font-size:22px">عرض وظيفي</h1>
          <p style="margin:8px 0 0;opacity:.8;font-size:13px">${COMPANY.nameAr}</p>
        </div>
        <div style="padding:28px;color:#1a1a2e;line-height:1.7">
          <p>السيد/ <strong>${offer.candidateName}</strong> المحترم،</p>
          <p>يسعدنا إبلاغكم بأنه تم إعداد عرض وظيفي لكم بمسمى <strong>${offer.jobTitle}</strong>
          براتب صافي <strong>${money(net)} ريال سعودي</strong>.</p>
          <p>يرجى الاطلاع على المرفق والرد خلال <strong>${OFFER_VALIDITY_DAYS} أيام</strong>.</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${url}" style="background:#0f213a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">قبول / رفض العرض</a>
          </p>
          <p style="font-size:13px;color:#888">للاستفسار: ${COMPANY.phone}<br>إدارة الموارد البشرية</p>
        </div>
      </div></body></html>`;
  }
  return `<!DOCTYPE html><html lang="en"><body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6f9;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:#0f213a;color:#fff;padding:24px;text-align:center">
        <h1 style="margin:0;font-size:22px">Job Offer</h1>
        <p style="margin:8px 0 0;opacity:.8;font-size:13px">${COMPANY.nameEn}</p>
      </div>
      <div style="padding:28px;color:#1a1a2e;line-height:1.7">
        <p>Dear <strong>${offer.candidateName}</strong>,</p>
        <p>We are pleased to share a job offer for <strong>${offer.jobTitle}</strong>
        with a net salary of <strong>${money(net)} SAR</strong>.</p>
        <p>Please review the attached PDF and respond within <strong>${OFFER_VALIDITY_DAYS} days</strong>.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${url}" style="background:#0f213a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Accept / Decline</a>
        </p>
        <p style="font-size:13px;color:#888">Contact: ${COMPANY.phone}<br>Human Resources</p>
      </div>
    </div></body></html>`;
}

export async function sendOfferEmail(offer: JobOffer, pdfBytes: Uint8Array) {
  if (!smtpConfigured()) {
    throw new Error("SMTP غير مضبوط. أضف SMTP_HOST و SMTP_USER في متغيرات البيئة.");
  }
  if (!offer.candidateEmail) {
    throw new Error("بريد المرشح مطلوب لإرسال العرض.");
  }

  const isAr = (offer.language || "العربية") === "العربية";
  const url = respondUrl(offer.token);
  const pdfName = `DABOUQ_JOB_OFFER_${cleanFilename(offer.candidateName)}_${isAr ? "AR" : "EN"}.pdf`;
  const subject = isAr ? `عرض وظيفي — ${COMPANY.nameAr}` : `Job Offer — ${COMPANY.nameEn}`;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const hr = process.env.HR_EMAIL || undefined;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from,
    to: offer.candidateEmail,
    cc: hr,
    subject,
    html: offerEmailHtml(offer, url),
    attachments: [
      {
        filename: pdfName,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });
}
