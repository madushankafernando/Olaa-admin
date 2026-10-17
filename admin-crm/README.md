# olaa admin CRM

React-Admin inside Next.js, exported as static files and hosted on Cloudflare Pages. Admins sign in with their
Supabase email + password; every action goes through the backend's `/admin/*` API, which checks the account is in
`admin_users`.

| Screen | What it's for |
|---|---|
| **Dashboard** | Waiting for review, changes requested, approved, paying members, matches this week / all-time |
| **Review queue** | Profiles waiting for a decision, oldest first |
| **Member page** | Photos (with automatic moderation flags, thumbs up/down per photo), details, answers, decision history. **Approve** (starts the 14-day trial, emails + pushes the member), **Ask for changes** (note required; member edits and resubmits), **Reject** (note required; data deleted everywhere within 30 days), **Suspend / Reinstate**, **Delete now** |
| **Members** | Everyone, searchable by name / email / phone / city, filter by status, CSV export |
| **Matches** | Who matched, whether the chat is open or closed, last message time |
| **Reports** | Members reported from a chat, with the reason; click through to suspend |

## Run locally

```bash
npm install                       # repo root
cp admin-crm/.env.example admin-crm/.env.local   # Supabase URL + anon key, backend URL
npm run dev:admin                 # http://localhost:3001
```

The backend must allow the CRM's origin: `CORS_ORIGINS=http://localhost:3001` (add your Pages domain in production).
Make an account an admin with the SQL in `backend/README.md`.

## Deploy to Cloudflare Pages

- Connect the GitHub repo in Cloudflare Pages.
- **Build command:** `npm ci && npm run build -w @olaa/admin-crm`
- **Build output directory:** `admin-crm/out`
- **Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, and `NODE_VERSION=22`.
- Put the site behind **Cloudflare Access** (Zero Trust → Access → Applications) so only your team's emails can even
  load it. That's a second lock on top of the admin check in the API.

Routing uses `#/…` hashes, so no rewrite rules are needed. `public/_headers` blocks framing and search indexing.

## Tests

```bash
npm test -w @olaa/admin-crm       # data provider mapping
npm run typecheck -w @olaa/admin-crm
```
