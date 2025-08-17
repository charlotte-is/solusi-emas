# Solusi Emas — quick deploy notes

## Struktur (penting)
- data/price.json              <- source of truth untuk harga
- functions/get-price.js       <- serverless GET (reads data/price.json)
- functions/update-price.js    <- serverless POST (protected) -> commit to GitHub
- public/                      <- isi web (index.html, harga.html, admin, assets, js, css)
- scripts/sync-from-api.js     <- optional script (GitHub Actions) untuk auto-sync

## ENV (Netlify / Vercel / GitHub Actions)
Set environment variables before deploy:
- ADMIN_KEY        (secret string used by admin UI to authenticate)
- GITHUB_TOKEN     (PAT with repo scope, used by update-price / sync scripts)
- REPO_OWNER       (GitHub owner, e.g. Aderu-Cujoh)
- REPO_NAME        (repo name, e.g. Solusi-Emas)
- BRANCH           (branch to commit, e.g. main)
- EXTERNAL_API_URL (optional, for auto-sync script)

## Deploy instructions (Netlify)
1. Push repo to GitHub.
2. Connect repo to Netlify.
3. In Netlify dashboard -> Site settings -> Build & deploy -> Environment -> add env vars above.
4. Netlify will detect functions/ and install dependencies from functions/package.json (node-fetch).
5. After deploy, visit `/` and `/admin/index.html`.

## Admin usage
- Open `/admin/index.html` (preferably protect this path).
- Enter ADMIN_KEY (the key you put in Netlify env or a separate key you choose).
- Update fields, press Update -> backend will commit to /data/price.json.

## Auto-sync (optional)
- Create GitHub Actions workflow to run `node scripts/sync-from-api.js` periodically (cron) or on push.
- Ensure GITHUB_TOKEN and EXTERNAL_API_URL set in secrets.

## Security notes
- Do NOT hardcode ADMIN_KEY or GITHUB_TOKEN in client code.
- Prefer to protect `/admin` via Netlify Access / Basic Auth / server-side login.
