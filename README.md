# Dabouq Job Offers — Next.js (Vercel)

Domain: `https://offers.dabouqtools.com`

## Local

```bash
pnpm install   # or npm install
cp .env.example .env.local
pnpm db:push
pnpm dev       # http://localhost:3002
```

## Vercel

1. Import this repo
2. Framework = Next.js (root of repo)
3. Env from `.env.example`
4. Domain: `offers.dabouqtools.com`

## Portal SSO

App expects launch URL: `/auth/portal?code=...`  
Exchange: `POST {PORTAL_URL}/api/v1/sso/exchange`  
Catalog slug in portal: `job-offers`
