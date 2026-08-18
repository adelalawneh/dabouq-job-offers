export type PortalBlockedOptions = {
  portalUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safePortalUrl(portalUrl: string | null) {
  if (!portalUrl || !/^https?:\/\//i.test(portalUrl)) return null;
  return escapeHtml(portalUrl.replace(/\/$/, ""));
}

function minimalShell(portalUrl: string | null) {
  const safePortal = safePortalUrl(portalUrl);
  const logo = safePortal ? `${safePortal}/dabouq-logo.png` : null;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <title>الدخول عن طريق البورتال فقط</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    body{
      margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:20px;padding:24px;font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;
      background:#f7f8fa;color:#0b192e;text-align:center
    }
    .logo{max-width:200px;height:auto}
    p{margin:0;font-size:1.05rem;font-weight:600;line-height:1.6}
  </style>
</head>
<body>
  ${logo && safePortal ? `<a href="${safePortal}"><img class="logo" src="${logo}" alt="Dabouq Group" /></a>` : logo ? `<img class="logo" src="${logo}" alt="Dabouq Group" />` : ""}
  <p>الدخول عن طريق البورتال فقط</p>
</body>
</html>`;
}

export function portalOnlyBlockedHtml({ portalUrl }: PortalBlockedOptions) {
  return minimalShell(portalUrl);
}
