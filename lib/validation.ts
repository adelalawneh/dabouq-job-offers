import { ZodError, type ZodIssue } from "zod";

const FIELD_LABELS: Record<string, string> = {
  candidateName: "الاسم",
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
  totalSalary: "الراتب الإجمالي",
  insurance: "التأمين",
  language: "اللغة",
};

function issueMessage(issue: ZodIssue): string {
  const key = String(issue.path[0] ?? "");
  const label = FIELD_LABELS[key] || key || "الحقل";

  if (issue.code === "too_small") {
    if (issue.type === "string") return `${label} مطلوب`;
    if (issue.type === "number") return `${label} يجب أن يكون أكبر من صفر`;
  }
  if (issue.code === "invalid_type") return `${label} غير صالح`;
  if (issue.code === "invalid_string" && issue.validation === "email") {
    return "البريد الإلكتروني غير صالح";
  }
  return `${label}: ${issue.message}`;
}

export function formatZodError(error: ZodError): string {
  const lines = error.issues.map(issueMessage);
  return [...new Set(lines)].join(" · ");
}

export function apiErrorMessage(error: unknown, fallback = "طلب غير صالح"): string {
  if (error instanceof ZodError) return formatZodError(error);
  if (error instanceof Error) return error.message;
  return fallback;
}
