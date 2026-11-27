# Job Radar web

Next.js dashboard (App Router, Tailwind 4) that reads the Postgres database filled by `../scraper`.

- Pages: `/{lang}` overview, `/{lang}/skills/{slug}`, `/{lang}/salary`. `lang` is `en` or `vi`
  (UI strings live in `messages/`). `proxy.ts` redirects `/` using `Accept-Language`.
- Region filter: `?region=vn` or `?region=intl` (default: all).
- Data is read at request time (`lib/db.ts` awaits `connection()`), so `npm run build` needs no database.

## Run locally

```bash
cp .env.example .env.local   # set DATABASE_URL
npm install
npm run dev
```

Use a database role that only has `SELECT` in production.
