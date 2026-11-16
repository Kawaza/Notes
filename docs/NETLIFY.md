# Netlify web app (dinonotes)

The site at **https://dinonotes.netlify.app** is the **same React app** as the Windows desktop build. Netlify runs `npm run build:web` (see `netlify.toml`) and publishes `dist/`. Workspace features (folders, tasks, notes, realtime, notifications) use Supabase and behave the same in the browser.

Desktop builds are **unchanged**: they use `npm run build` with `base: ./` and Electron. Web uses `VITE_BASE=/`.

---

## 1. Netlify environment variables (required)

`VITE_*` values are **baked in at build time**. Set them under **Site configuration → Environment variables** (Production context), then **trigger a new deploy** after any change.

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | Same project URL as desktop (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Same **anon / publishable** key as desktop |
| `VITE_AUTH_REDIRECT_URL` | `https://dinonotes.netlify.app/auth/confirmed` (recommended for signup emails) |

`VITE_BASE=/` is already set in `netlify.toml` — do not override unless you use a subpath deploy.

**Symptom if missing:** the site shows *“Cloud sync not configured”* and none of the app loads.

---

## 2. Supabase Auth (URLs + no signup emails)

### URL configuration

| Setting | Value |
|---------|--------|
| **Site URL** | `https://dinonotes.netlify.app` (use the web URL here—not `notes://`) |
| **Redirect URLs** → Add URL | `https://dinonotes.netlify.app/**` |
| | `https://dinonotes.netlify.app/auth/confirmed` |
| | `notes://auth/confirmed` (optional; only if you enable email confirm for desktop) |

Add your **custom domain** too if you use one. Save after each change.

### No confirmation emails (same as desktop)

1. **Authentication → Providers → Email** → turn **Confirm email** **OFF**.
2. Do **not** set `VITE_SIGNUP_EMAIL_CONFIRM` on Netlify or desktop (default: no signup emails, no redirect links).

New users can sign up and sign in immediately with password—no inbox step.

Use your **custom domain** in addition to `*.netlify.app` if you add one later.

---

## 3. Supabase SQL (same as desktop)

Run once on the project (if not already):

- `supabase/00-full-schema.sql` or your cumulative patches
- `supabase/patch-workspace-tasks-realtime.sql`
- `supabase/patch-workspace-notes-realtime.sql`
- `supabase/patch-workspace-folders-realtime.sql`
- `supabase/patch-workspace-realtime-replica.sql`

Without these, teammates may not see live task/folder updates (polling still partially covers tasks).

---

## 4. Deploy flow

1. Push to `main` on GitHub (Netlify auto-builds).
2. Confirm the deploy log used commit **≥ 1.0.104** for notifications + folder realtime.
3. After env var changes, use **Deploys → Trigger deploy → Clear cache and deploy site**.

Local check before pushing:

```bash
npm run build:web
# optional: npx vite preview --port 5174
```

---

## 5. Web vs desktop (intentional differences)

| | Desktop (Electron) | Web (Netlify) |
|--|-------------------|---------------|
| **Workspaces / shared folders** | Supabase | Same |
| **Notifications / realtime** | Same | Same |
| **Personal notes storage** | Cloud-only when Supabase is configured (no local JSON file) | Browser `localStorage` + encrypted cloud sync |
| **Auto-update** | Settings → Updates | Refresh page / new Netlify deploy |
| **Email confirm link** | `notes://auth/confirmed` | `https://…/auth/confirmed` |

Signing in with the **same account** on web and desktop shows the **same workspaces**. Personal-folder notes sync via cloud when encryption/sync is enabled.

---

## 6. Quick verification checklist

- [ ] Open `https://dinonotes.netlify.app` → sign in (not “Cloud sync not configured”).
- [ ] Sidebar shows **Workspaces**, **Notifications**, **My Tasks**.
- [ ] Teammate creates/renames a shared folder → appears without manual refresh.
- [ ] Task assigned to you → toast + Notifications entry.
- [ ] Sign up from web → email link lands on `/auth/confirmed` → **Continue to Notes** → sign in.

---

## 7. Troubleshooting

| Problem | Likely cause |
|---------|----------------|
| Cloud sync not configured | Missing `VITE_SUPABASE_*` on Netlify or deploy before vars were set |
| Sign-in works on desktop, not web | Redirect URL / Site URL in Supabase |
| Workspace empty but desktop has data | Wrong Supabase project keys on Netlify |
| Live sync flaky | Realtime SQL patches not applied |
| Stale UI after deploy | Hard refresh or clear cache; confirm env vars and redeploy |

Desktop installers are built locally with `.env` at **build time** (`npm run build`); Netlify does **not** use your local `.env` file.