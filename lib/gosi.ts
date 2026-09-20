import { salarySplit } from "./helpers";

export type GosiScheme = {
  id: string;
  companyPct: number;
  employeePct: number;
  withSaned: boolean;
  labelAr: string;
};

/** Saudi GOSI contribution presets (company % / employee %). */
export const GOSI_SCHEMES: GosiScheme[] = [
  {
    id: "11_9",
    companyPct: 11,
    employeePct: 9,
    withSaned: false,
    labelAr: "شركة 11% — موظف 9% — بدون ساند",
  },
  {
    id: "11.75_9.75",
    companyPct: 11.75,
    employeePct: 9.75,
    withSaned: true,
    labelAr: "شركة 11.75% — موظف 9.75% — مع ساند",
  },
  {
    id: "11.5_9.5",
    companyPct: 11.5,
    employeePct: 9.5,
    withSaned: false,
    labelAr: "النظام الجديد — شركة 11.5% — موظف 9.5% — بدون ساند",
  },
  {
    id: "12_10",
    companyPct: 12,
    employeePct: 10,
    withSaned: false,
    labelAr: "النظام الجديد — شركة 12% — موظف 10% — بدون ساند",
  },
  {
    id: "12.75_10.75",
    companyPct: 12.75,
    employeePct: 10.75,
    withSaned: true,
    labelAr: "النظام الجديد — شركة 12.75% — موظف 10.75% — مع ساند",
  },
];

export const DEFAULT_GOSI_SCHEME_ID = "11.75_9.75";

export function getGosiScheme(id: string | null | undefined) {
  return GOSI_SCHEMES.find((s) => s.id === id) || GOSI_SCHEMES.find((s) => s.id === DEFAULT_GOSI_SCHEME_ID)!;
}

export type SalaryBreakdown = {
  basic: number;
  housing: number;
  transport: number;
  /** الأجر الخاضع للتأمينات = أساسي + سكن */
  gosiBase: number;
  employeePct: number;
  companyPct: number;
  /** خصم الموظف */
  employeeDeduction: number;
  /** مساهمة الشركة */
  companyContribution: number;
  netSalary: number;
  companyCost: number;
  schemeId: string;
  schemeLabel: string;
};

export function computeSaudiSalaryBreakdown(
  totalSalary: number,
  schemeId: string = DEFAULT_GOSI_SCHEME_ID,
): SalaryBreakdown {
  const total = Math.max(0, Math.round(Number(totalSalary) || 0));
  const { basic, housing, transport } = salarySplit(total);
  return computeFromComponents(basic, housing, transport, schemeId, true);
}

/** Primary path: enter basic / housing / transport → total & GOSI follow. */
export function computeFromComponents(
  basicIn: number,
  housingIn: number,
  transportIn: number,
  schemeId: string = DEFAULT_GOSI_SCHEME_ID,
  isSaudi = true,
): SalaryBreakdown {
  const basic = Math.max(0, Math.round(Number(basicIn) || 0));
  const housing = Math.max(0, Math.round(Number(housingIn) || 0));
  const transport = Math.max(0, Math.round(Number(transportIn) || 0));
  const total = basic + housing + transport;
  // GOSI applies only to basic + housing — transport is excluded.
  const gosiBase = basic + housing;

  if (!isSaudi) {
    return {
      basic,
      housing,
      transport,
      gosiBase,
      employeePct: 0,
      companyPct: 0,
      employeeDeduction: 0,
      companyContribution: 0,
      netSalary: total,
      companyCost: total,
      schemeId: "",
      schemeLabel: "",
    };
  }

  const scheme = getGosiScheme(schemeId);
  const employeeDeduction = Math.round(gosiBase * (scheme.employeePct / 100));
  const companyContribution = Math.round(gosiBase * (scheme.companyPct / 100));
  return {
    basic,
    housing,
    transport,
    gosiBase,
    employeePct: scheme.employeePct,
    companyPct: scheme.companyPct,
    employeeDeduction,
    companyContribution,
    netSalary: Math.round(total - employeeDeduction),
    companyCost: Math.round(total + companyContribution),
    schemeId: scheme.id,
    schemeLabel: scheme.labelAr,
  };
}

export function computeNonSaudiSalaryBreakdown(totalSalary: number, insurance = 0) {
  const total = Math.max(0, Math.round(Number(totalSalary) || 0));
  const { basic, housing, transport } = salarySplit(total);
  const employeeDeduction = Math.max(0, Math.round(insurance));
  const netSalary = Math.round(total - employeeDeduction);
  return {
    basic,
    housing,
    transport,
    gosiBase: basic + housing,
    employeePct: 0,
    companyPct: 0,
    employeeDeduction,
    companyContribution: 0,
    netSalary,
    companyCost: total,
    schemeId: "",
    schemeLabel: "",
  } satisfies SalaryBreakdown;
}

export function looksSaudiNationality(nationality: string | null | undefined) {
  const n = (nationality || "").trim().toLowerCase();
  if (!n) return false;
  return (
    n.includes("سعود") ||
    n.includes("saudi") ||
    n === "ksa" ||
    n.includes("المملكة العربية")
  );
}
