import Link from "next/link";
import { STATUS_LABELS } from "@/lib/config";
import { getStats, listOffers } from "@/lib/offers";
import { money } from "@/lib/helpers";

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
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 28 }}>
        <div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>شركة دابوق التجارية</p>
          <h1 style={{ margin: "6px 0 0", fontSize: "1.75rem", fontWeight: 700 }}>العروض الوظيفية</h1>
        </div>
        <Link
          href="/new"
          style={{
            background: "var(--accent)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          عرض جديد
        </Link>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          ["الإجمالي", stats.total || 0],
          ["مسودة", stats.draft || 0],
          ["مُرسل", stats.sent || 0],
          ["مقبول", stats.accepted || 0],
          ["مرفوض", stats.rejected || 0],
          ["منتهي", stats.expired || 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </section>

      <form
        method="get"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="بحث بالاسم أو البريد أو المسمى…"
          style={{
            flex: 1,
            minWidth: 200,
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "10px 12px",
            background: "#fff",
          }}
        />
        <select
          name="status"
          defaultValue={status}
          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", background: "#fff" }}
        >
          <option value="all">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="sent">مُرسل</option>
          <option value="accepted">مقبول</option>
          <option value="rejected">مرفوض</option>
          <option value="expired">منتهي</option>
        </select>
        <button
          type="submit"
          style={{
            background: "var(--ink)",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          تصفية
        </button>
      </form>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f0f4f7", textAlign: "right" }}>
              <th style={th}>المرشح</th>
              <th style={th}>المسمى</th>
              <th style={th}>صافي الراتب</th>
              <th style={th}>الحالة</th>
              <th style={th}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--muted)" }}>
                  لا توجد عروض بعد.
                </td>
              </tr>
            ) : (
              offers.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>
                    <Link href={`/offers/${o.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {o.candidateName}
                    </Link>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{o.candidateEmail || "—"}</div>
                  </td>
                  <td style={td}>{o.jobTitle}</td>
                  <td style={td}>{money(o.netSalary ?? o.totalSalary - o.insurance)} ر.س</td>
                  <td style={td}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: statusBg(o.status),
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td style={td}>{new Date(o.createdAt).toLocaleDateString("ar-SA")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th: React.CSSProperties = { padding: "12px 14px", fontWeight: 600, fontSize: 12, color: "var(--muted)" };
const td: React.CSSProperties = { padding: "14px", verticalAlign: "top" };

function statusBg(status: string) {
  switch (status) {
    case "accepted":
      return "#dcfae6";
    case "rejected":
      return "#fee4e2";
    case "sent":
      return "#e0f2fe";
    case "expired":
      return "#fef0c7";
    default:
      return "#eef2f6";
  }
}
