import Image from "next/image";
import Link from "next/link";

function portalHomeUrl() {
  // Client + server must match: only NEXT_PUBLIC_* is available in the browser.
  return (process.env.NEXT_PUBLIC_PORTAL_URL || "https://www.dabouqtools.com").replace(
    /\/$/,
    "",
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  narrow,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  narrow?: boolean;
}) {
  const portalUrl = portalHomeUrl();

  return (
    <div>
      <header className="app-topbar">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/dabouq-logo.png"
              alt="Dabouq Group"
              width={1024}
              height={609}
              priority
              className="h-auto w-[180px] max-w-full object-contain sm:w-[220px]"
            />
          </Link>
          <p className="muted m-0 hidden text-sm sm:block">مولّد العروض الوظيفية</p>
        </div>
        <a href={portalUrl} className="portal-back-btn">
          العودة إلى البورتال
        </a>
      </header>

      <div className={`page ${narrow ? "page-narrow" : ""}`}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {title ? (
              <h1 className="mt-0 mb-0 text-2xl font-bold tracking-tight text-[var(--brand)]">
                {title}
              </h1>
            ) : null}
            {subtitle ? <p className="muted mt-1 mb-0 text-sm leading-6">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

export function BackLink({ href = "/", label = "العودة إلى القائمة" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="muted mb-3 inline-block text-sm hover:text-[var(--foreground)]">
      ← {label}
    </Link>
  );
}

export function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`surface p-4 md:p-5 ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="muted font-semibold">{label}</span>
      {children}
    </label>
  );
}
