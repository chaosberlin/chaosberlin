## Publish to chaos.berlin

The `Publish website` workflow builds the static interface and deploys it to GitHub Pages
on pushes to `main`, or via manual dispatch. Enable GitHub Actions as the Pages source
in repository Settings → Pages, and configure `chaos.berlin` as the custom domain.
The build includes `CNAME` with that domain.

Cloudflare must manage the domain DNS. For an apex domain pointing directly to GitHub
Pages, use GitHub's documented apex DNS records and verify the domain in GitHub.
Check existing DNS before changing records; preserve mail records.
Worker routing for member subdomains is a separate deployment.

## Static design preview

The public interface uses plain HTML, CSS, and JavaScript. It includes channel navigation,
a namespace registry, a request JSON generator using the shared validator, and sample mailbox messages.
The mailbox is a design preview, not a connected email service. The domain is intentionally
unspecified until configured. Generated request files retain the existing schema.

```sh
bun run build:site
python3 -m http.server 4173 --directory dist
# Open http://localhost:4173
```

`dist/` is the GitHub Pages artifact. The build includes only public interface assets and
validated requests, excluding `requests/example.json`. No backend or secrets are bundled.
The existing authenticated backend portal remains available at `/app` with `bun run dev`.

# chaosberlin backend — subdomain self-service

Anyone who logs in with GitHub can get `<name>.<your-domain>` by opening a PR.
Merging the PR triggers a GitHub Action that creates the Cloudflare DNS record.
No manual Cloudflare dashboard work. Secrets come later (see below).

## How it works

```
login with GitHub → add requests/<name>.json → open PR
  → validate.yml checks the file (must pass)
  → merge to main → provision.yml upserts Cloudflare DNS
```

- Request files: `requests/*.json` (see `requests/README.md` + `requests/example.json`)
- Validation: `src/validation.ts` (shared by backend + CI)
- DNS: `src/cloudflare.ts` via Cloudflare v4 API (`POST/PATCH /zones/:id/dns_records`)
- Backend (Bun): `index.ts` — serves UI + `/api/subdomains`, `/api/requests`, GitHub OAuth

## Run locally (no secrets needed to boot)

```sh
bun install
cp .env.example .env   # keep placeholders, app still boots
bun run dev            # http://localhost:3000
bun test               # validation tests
bun run validate       # checks requests/*.json
bun run provision:dry  # prints what would be created, no Cloudflare call
```

## Add Cloudflare + .env later (when ready)

1. Cloudflare dashboard → your zone → copy **Zone ID**. Create API token with
   `Zone:DNS:Edit` on that zone only.
2. GitHub repo → Settings → Secrets and variables:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`
   - Variables: `BASE_DOMAIN` (e.g. `chaosberlin.de`)
3. Locally: fill `.env` (copy from `.env.example`).
4. GitHub OAuth app (`https://github.com/settings/developers`):
   - Authorization callback: `http://localhost:3000/api/auth/callback` (dev)
     + `https://<your-host>/api/auth/callback` (prod)
   - Set `GITHUB_CLIENT_ID / SECRET / CALLBACK_URL` in `.env` + prod secrets.

## Push with your SSH key

Your key is `~/.ssh/id_chaosberlin_ed25519` (you wrote `id_chaos_ed2556` — check the name):

```sh
# one-time: add ~/.ssh/id_chaosberlin_ed25519.pub as deploy key / to github.com/chaosberlin SSH keys
ssh-add ~/.ssh/id_chaosberlin_ed25519
git init -b main
git add .
git commit -m "scaffold subdomain self-service"
git remote add origin git@github.com:chaosberlin/backend.git  # create empty repo first if 404
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_chaosberlin_ed25519" git push -u origin main
```

Note: `github.com/chaosberlin` is a user account with only `chaosberlin/chaosberlin`
right now — `chaosberlin/backend` returns 404 until you create it.

## Repo layout

```
index.ts            Bun.serve (UI + API + OAuth)
frontend.tsx        tiny React UI
src/validation.ts   PR file rules (single source of truth)
src/cloudflare.ts   fetch-based DNS upsert
src/auth.ts         GitHub OAuth + cookie session
src/store.ts        requests/*.json helpers
scripts/validate.ts CI validator
scripts/provision.ts  CI provisioner (supports --dry-run)
.github/workflows/ validate.yml (on PR) + provision.yml (on merge)
requests/           user PRs land here
data/subdomains.json optional live registry mirror
```
