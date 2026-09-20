import Link from "next/link";
import { STATUS_LABELS } from "@/lib/config";
import { getStats, listOffers } from "@/lib/offers";
import { money } from "@/lib/helpers";
import { AppShell, Surface } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "all";
  const q = params.q || "";
  const [stats, offers] = await Promise.all([getStats(), listOffers(status, q)]);

  return (
    <AppShell
      title="العروض الوظيفية"
      subtitle="أنشئ عروض العمل وأرسلها للمرشحين من مكان واحد."
      actions={
        <Link href="/new" className="btn btn-primary">
          إنشاء عرض جديد
        </Link>
      }
    >
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["الإجمالي", stats.total || 0],
          ["مسودة", stats.draft || 0],
          ["مُرسل", stats.sent || 0],
          ["مقبول", stats.accepted || 0],
          ["مرفوض", stats.rejected || 0],
          ["منتهي", stats.expired || 0],
        ].map(([label, value]) => (
          <Surface key={String(label)} className="!p-3.5">
            <div className="muted text-xs">{label}</div>
            <div className="mt-1 text-xl font-bold">{value}</div>
          </Surface>
        ))}
      </section>

      <Surface className="mb-4">
        <form method="get" className="flex flex-wrap gap-2.5">
          <input
            name="q"
            defaultValue={q}
            placeholder="بحث بالاسم أو البريد أو المسمى…"
            className="field-input min-w-[200px] flex-1"
          />
          <select name="status" defaultValue={status} className="field-input w-auto">
            <option value="all">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="sent">مُرسل</option>
            <option value="accepted">مقبول</option>
            <option value="rejected">مرفوض</option>
            <option value="expired">منتهي</option>
          </select>
          <button type="submit" className="btn btn-secondary">
            تصفية
          </button>
        </form>
      </Surface>

      <Surface className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-right">
                <th className="muted px-3.5 py-3 text-xs font-semibold">المرشح</th>
                <th className="muted px-3.5 py-3 text-xs font-semibold">المسمى</th>
                <th className="muted px-3.5 py-3 text-xs font-semibold">صافي الراتب</th>
                <th className="muted px-3.5 py-3 text-xs font-semibold">الحالة</th>
                <th className="muted px-3.5 py-3 text-xs font-semibold">التاريخ</th>
                <th className="muted px-3.5 py-3 text-xs font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted px-3.5 py-8 text-center">
                    لا توجد عروض بعد.
                  </td>
                </tr>
              ) : (
                offers.map((o) => (
                  <tr key={o.id} className="border-t border-[var(--border)]">
                    <td className="px-3.5 py-3.5 align-top">
                      <Link href={`/offers/${o.id}`} className="font-semibold text-[var(--primary)] hover:underline">
                        {o.candidateName}
                      </Link>
                      <div className="muted text-xs">{o.candidateEmail || "—"}</div>
                    </td>
                    <td className="px-3.5 py-3.5 align-top">{o.jobTitle}</td>
                    <td className="px-3.5 py-3.5 align-top">
                      {money(o.netSalary ?? o.totalSalary - o.insurance)} ر.س
                    </td>
                    <td className="px-3.5 py-3.5 align-top">
                      <span className={`status-pill ${statusClass(o.status)}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 align-top">
                      {new Date(o.createdAt).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="px-3.5 py-3.5 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/offers/${o.id}`} className="btn btn-secondary !px-2.5 !py-1 text-xs">
                          عرض
                        </Link>
                        <Link href={`/offers/${o.id}/edit`} className="btn btn-primary !px-2.5 !py-1 text-xs">
                          تعديل
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Surface>
    </AppShell>
  );
}

function statusClass(status: string) {
  switch (status) {
    case "accepted":
      return "!bg-[color-mix(in_oklch,var(--success)_22%,transparent)] !text-[oklch(0.86_0.08_150)]";
    case "rejected":
      return "!bg-[color-mix(in_oklch,var(--destructive)_22%,transparent)] !text-[oklch(0.86_0.08_25)]";
    case "sent":
      return "!bg-[color-mix(in_oklch,var(--primary)_22%,transparent)] !text-[var(--primary)]";
    case "expired":
      return "!bg-[color-mix(in_oklch,var(--warning)_22%,transparent)] !text-[oklch(0.86_0.08_85)]";
    default:
      return "";
  }
}
