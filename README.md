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

# chaosberlin — subdomain self-service

Anyone with a GitHub account can get `<name>.chaos.berlin` by opening a PR.
This public repo is where requests come in. The DNS records are written by the private
`chaosberlin/backend` repo, which holds the Cloudflare credentials.

## How it works

```
add requests/<name>.json → open PR
  → validate.yml checks the file and that you own the name (must pass)
  → maintainer merges to main
  → notify-backend.yml starts chaosberlin/backend's publish workflow
  → backend re-validates, syncs Cloudflare DNS, and sets the
    "dns/publish" commit status on the merge commit here
```

- Request files: `requests/*.json` (see `requests/README.md` + `requests/example.json`)
- Validation: `src/validation.ts` (shared by the site, the local backend and CI)
- Local helper app (Bun): `index.ts` — serves UI + `/api/subdomains`, `/api/requests`, GitHub OAuth

## Run locally (no secrets needed to boot)

```sh
bun install
cp .env.example .env   # keep placeholders, app still boots
bun run dev            # http://localhost:3000
bun test               # validation tests
bun run validate       # checks requests/*.json
```

## Settings

- Secret `CROSS_REPO_TOKEN`: fine-grained PAT of `chaosberlin` for `chaosberlin/backend` +
  `chaosberlin/chaosberlin` with **Actions: Read and write** and **Commit statuses: Read and write**.
  It lets `notify-backend.yml` start the backend's publish workflow.
- GitHub OAuth app for the local helper (`https://github.com/settings/developers`):
  - Authorization callback: `http://localhost:3000/api/auth/callback` (dev)
    + `https://<your-host>/api/auth/callback` (prod)
  - Set `GITHUB_CLIENT_ID / SECRET / CALLBACK_URL` in `.env` + prod secrets.

## Repo layout

```
index.ts            Bun.serve (UI + API + OAuth)
frontend.tsx        tiny React UI
src/validation.ts   PR file rules (single source of truth for this repo)
src/auth.ts         GitHub OAuth + cookie session
src/store.ts        requests/*.json helpers
scripts/validate.ts CI validator
.github/workflows/  validate.yml (on PR), notify-backend.yml (on merge), pages.yml (site)
requests/           user PRs land here
data/subdomains.json optional live registry mirror
```
