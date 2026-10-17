# olaa admin CRM

React-Admin inside Next.js, exported as static files and hosted on Vercel. See [admin-crm/README.md](admin-crm/README.md)
for the screens and how admin sign-in works.

```
admin-crm/                    the CRM
packages/shared/              plans and limits, Cid personas, profile questions, photo URL builder, shared types
vercel.json                   build settings and security headers
.github/workflows/ci-cd.yml   typecheck + tests, then deploy to Vercel
```

`packages/shared` is a copy of the same package in the olaa monorepo. Change it there first, then copy it here, so the
CRM, backend and app agree on plans and limits.

## Run locally

```bash
npm install
cp admin-crm/.env.example admin-crm/.env.local   # Supabase URL + anon key, backend URL
npm run dev                                      # http://localhost:3001
```

## Deploy

GitHub Actions deploys every push to `main` to production and every pull request to a preview URL, after typecheck
and tests pass. It needs three repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

The `NEXT_PUBLIC_*` variables are set in the Vercel project (Settings → Environment Variables) and baked into the
build. The backend must list the CRM's URL in `CORS_ORIGINS`.
