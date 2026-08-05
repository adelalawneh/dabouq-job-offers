export const COMPANY = {
  nameAr: "شركة دابوق التجارية شركة شخص واحد",
  nameEn: "Dabouq Commercial Company One Person Co.",
  establishmentNo: "7013895862",
  cr: "3550102093",
  phone: "0556018251",
  taxId: "311280392800003",
} as const;

export const OFFER_VALIDITY_DAYS = 10;

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
  contractType: "محدد المدة (فردي)",
  contractDuration: "سنة",
  workDays: "٦ أيام في الأسبوع - 9 ساعات يوميًا تتضمن ساعة راحة",
  probation: "٩٠ يومًا",
  annualLeave: "٢١ يومًا في السنة",
} as const;

export const DEFAULT_OFFER_FOOTER = {
  ar: {
    salaryReview:
      "سيتم مراجعة الراتب بعد مرور ثلاثة (3) أشهر من تاريخ مباشرة العمل، وذلك لغرض النظر في إمكانية زيادة الراتب وتثبيت الموظف بناءً على تقييم الأداء.",
    validity: "ويُعتبر هذا العرض ساري المفعول لمدة عشرة (10) أيام فقط من تاريخ صدوره.",
    acceptance: "أوافق على ما ورد أعلاه، وأقر بأن تاريخ بدء عملي سيكون اعتبارًا من:      /      / ٢٠٢٦",
    rejection: "لا أوافق على العرض المذكور أعلاه للأسباب التالية: ........................................................",
  },
  en: {
    salaryReview:
      "Salary will be reviewed after three (3) months from the date of joining, for the purpose of considering a salary increase and confirmation based on performance evaluation.",
    validity: "This offer is valid for ten (10) days only from the date of issuance.",
    acceptance: "I agree to the terms above. My start date will be: ____ / ____ / 2026",
    rejection: "I do not agree to the above offer for the following reasons: ........................................................",
  },
} as const;
