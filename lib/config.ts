export const COMPANY = {
  nameAr: "شركة دابوق التجارية شركة شخص واحد",
  nameEn: "Dabouq Commercial Company One Person Co.",
  establishmentNo: "7013895862",
  cr: "3550102093",
  phone: "0556018251",
  taxId: "311280392800003",
} as const;

export const OFFER_VALIDITY_DAYS = 3;

export const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسل",
  accepted: "مقبول",
  rejected: "مرفوض",
  expired: "منتهي",
};

export const JOB_TEMPLATES = {
  "مندوب مبيعات": {
    jobTitle: "مندوب مبيعات",
    department: "المبيعات",
    location: "منطقة الرياض",
    totalSalary: 3500,
  },
  محاسب: {
    jobTitle: "محاسب",
    department: "المالية",
    location: "منطقة الرياض",
    totalSalary: 5000,
  },
  سائق: {
    jobTitle: "سائق",
    department: "العمليات",
    location: "منطقة الرياض",
    totalSalary: 3000,
  },
  "مشرف مستودع": {
    jobTitle: "مشرف مستودع",
    department: "المستودعات",
    location: "منطقة الرياض",
    totalSalary: 4500,
  },
} as const;

export const DEFAULT_CONTRACT = {
  ar: {
    contractType: "محدد المدة - فردي",
    contractDuration: "سنة",
    workDays: "6 أيام في الأسبوع – 9 ساعات يوميًا تتضمن ساعة راحة",
    probation: "90 يومًا",
    annualLeave: "21 يومًا في السنة",
  },
  en: {
    contractType: "Fixed-term (Individual)",
    contractDuration: "1 Year",
    workDays: "6 days per week — 9 hours daily including 1 hour break",
    probation: "90 days",
    annualLeave: "21 days per year",
  },
} as const;

/** Known AR↔EN pairs so PDF/email can localize stored defaults without AI. */
export const CONTRACT_VALUE_LOCALIZATIONS: Record<string, { ar: string; en: string }> = {
  "محدد المدة - فردي": {
    ar: DEFAULT_CONTRACT.ar.contractType,
    en: DEFAULT_CONTRACT.en.contractType,
  },
  "محدد المدة (فردي)": {
    ar: DEFAULT_CONTRACT.ar.contractType,
    en: DEFAULT_CONTRACT.en.contractType,
  },
  [DEFAULT_CONTRACT.en.contractType]: {
    ar: DEFAULT_CONTRACT.ar.contractType,
    en: DEFAULT_CONTRACT.en.contractType,
  },
  سنة: {
    ar: DEFAULT_CONTRACT.ar.contractDuration,
    en: DEFAULT_CONTRACT.en.contractDuration,
  },
  [DEFAULT_CONTRACT.en.contractDuration]: {
    ar: DEFAULT_CONTRACT.ar.contractDuration,
    en: DEFAULT_CONTRACT.en.contractDuration,
  },
  [DEFAULT_CONTRACT.ar.workDays]: {
    ar: DEFAULT_CONTRACT.ar.workDays,
    en: DEFAULT_CONTRACT.en.workDays,
  },
  [DEFAULT_CONTRACT.en.workDays]: {
    ar: DEFAULT_CONTRACT.ar.workDays,
    en: DEFAULT_CONTRACT.en.workDays,
  },
  [DEFAULT_CONTRACT.ar.probation]: {
    ar: DEFAULT_CONTRACT.ar.probation,
    en: DEFAULT_CONTRACT.en.probation,
  },
  [DEFAULT_CONTRACT.en.probation]: {
    ar: DEFAULT_CONTRACT.ar.probation,
    en: DEFAULT_CONTRACT.en.probation,
  },
  [DEFAULT_CONTRACT.ar.annualLeave]: {
    ar: DEFAULT_CONTRACT.ar.annualLeave,
    en: DEFAULT_CONTRACT.en.annualLeave,
  },
  [DEFAULT_CONTRACT.en.annualLeave]: {
    ar: DEFAULT_CONTRACT.ar.annualLeave,
    en: DEFAULT_CONTRACT.en.annualLeave,
  },
};

export function contractDefaults(language: string) {
  return language === "English" ? DEFAULT_CONTRACT.en : DEFAULT_CONTRACT.ar;
}

export function localizeContractValue(value: string | null | undefined, language: string) {
  const raw = (value || "").trim();
  if (!raw) return "—";
  const mapped = CONTRACT_VALUE_LOCALIZATIONS[raw];
  if (!mapped) return raw;
  return language === "English" ? mapped.en : mapped.ar;
}

export const DEFAULT_OFFER_FOOTER = {
  ar: {
    salaryReview:
      "بعد مرور ثلاثة (3) أشهر من تاريخ مباشرة العمل، يتم تقييم أداء الموظف ومراجعة راتبه، ويكون أي تعديل على الراتب خاضعًا لنتيجة التقييم واحتياجات العمل وموافقة الشركة، دون أن يترتب على هذه المراجعة أي استحقاق تلقائي لزيادة الراتب.",
    validity:
      "يُعتبر هذا العرض ساري المفعول لمدة ثلاثة (3) أيام فقط من تاريخ صدوره، ويُلغى تلقائيًا بعد انتهاء هذه المدة ما لم توافق الشركة على تمديده.",
    notice:
      "يُعد هذا العرض الوظيفي عرضًا مبدئيًا، ولا يُنشئ علاقة تعاقدية أو التزامًا نهائيًا على الشركة، ولا تصبح علاقة العمل نافذة وملزمة إلا بعد توقيع عقد العمل من الطرفين واستكمال متطلبات وإجراءات التوظيف المعتمدة لدى الشركة.",
    acceptance:
      "أوافق على ما ورد في هذا العرض، وأقر بأن تاريخ بدء عملي سيكون اعتبارًا من: ____ / ____ / ______م",
    rejection: "لا أوافق على العرض المذكور أعلاه، للأسباب التالية:",
  },
  en: {
    salaryReview:
      "After three (3) months from the start date, the employee’s performance and salary will be reviewed. Any salary change is subject to the evaluation result, business needs, and company approval, and this review does not create an automatic entitlement to an increase.",
    validity:
      "This offer is valid for three (3) days only from the date of issuance, and it is automatically cancelled after that period unless the company agrees to extend it.",
    notice:
      "This job offer is preliminary and does not create a final contractual relationship or binding obligation on the company. Employment becomes effective and binding only after both parties sign the employment contract and complete the company’s hiring requirements and procedures.",
    acceptance:
      "I agree to the terms of this offer, and I confirm that my start date will be: ____ / ____ / ________",
    rejection: "I do not agree to the above offer, for the following reasons:",
  },
} as const;

export const OFFER_BENEFITS = {
  ar: {
    medical: "التأمين الطبي: وفقًا للأنظمة والسياسات المعتمدة لدى الشركة.",
    other: "مزايا أخرى: حسب السياسات الداخلية المعتمدة لدى الشركة.",
    deductionsNote: "تطبق الاستقطاعات النظامية – إن وجدت – وفقًا للأنظمة المعمول بها.",
  },
  en: {
    medical: "Medical insurance: As per the company’s approved regulations and policies.",
    other: "Other benefits: As per the company’s approved internal policies.",
    deductionsNote: "Statutory deductions – if any – apply in accordance with applicable regulations.",
  },
} as const;
