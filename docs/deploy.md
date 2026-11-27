# Deploying Job Radar

Three pieces: a Postgres database (Neon), the daily scraper (GitHub Actions) and the dashboard (Vercel). Do the steps in this order. Steps 1, 3 and 4 create accounts or projects, so the repo owner does them.

## 1. Database (Neon)

1. Create a Neon project and copy the **owner** connection string. It looks like `postgresql://owner:...@ep-xxx.neon.tech/neondb?sslmode=require`.
2. Apply the migrations and load a first batch of data from your machine (the scraper applies pending migrations itself):

   ```bash
   cd scraper
   DATABASE_URL='<owner connection string>' uv run python -m jobradar.run --source remoteok --source arbeitnow
   ```

3. Create the read-only role for the dashboard (see `db/readonly_role.sql`):

   ```bash
   psql '<owner connection string>' -v web_password='<long random password>' -f db/readonly_role.sql
   ```

   Build the dashboard's connection string from that role: same host and database, user `jobradar_web`, and the password you chose.

## 2. Verify before going live

- `psql '<read-only connection string>' -c 'select count(*) from jobs'` works.
- `psql '<read-only connection string>' -c 'delete from jobs'` fails with `permission denied`.

## 3. Daily scrape (GitHub Actions)

1. Push the repo to GitHub.
2. Add a repository secret `DATABASE_URL` with the **owner** connection string (the scraper must write).
3. Run the **Daily scrape** workflow manually (`Actions` tab, `Run workflow`). First with `dry_run` ticked, then without.
4. The cron then runs every day at 00:00 UTC (07:00 in Vietnam).

The default source list is in `.github/workflows/daily.yml` (`DEFAULT_SOURCES`). Add a source there only after you have read its terms (see `docs/sources.md`).

## 4. Dashboard (Vercel)

1. Import the GitHub repo as a new Vercel project.
2. Set **Root Directory** to `web`. The framework preset is detected as Next.js; no `vercel.json` is needed.
3. Add the environment variable `DATABASE_URL` with the **read-only** connection string. Never use the owner string here.
4. Deploy. The build does not need a database. Pages query it at request time.

## 5. Link it from the portfolio

Once the dashboard has a URL, add it to the "Now" section of the portfolio (a separate repo) and to the README of this repo.

## Checklist

- [ ] Neon project created, first data loaded
- [ ] Read-only role created and checked
- [ ] `DATABASE_URL` secret set on GitHub, daily workflow ran once by hand
- [ ] Vercel project deployed with the read-only `DATABASE_URL`
- [ ] Terms read for every source in `DEFAULT_SOURCES`
- [ ] Dashboard URL added to the README and the portfolio
