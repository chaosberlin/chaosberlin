# chaos.berlin

Free `<name>.chaos.berlin` subdomains, handed out by pull request.

Example: [hello.chaos.berlin](https://hello.chaos.berlin) ([source](https://github.com/chaosberlin/hello), [request](requests/hello.json), [PR #1](https://github.com/chaosberlin/chaosberlin/pull/1))

## Get a subdomain

1. **Host your site.** For example GitHub Pages, Vercel, Netlify, Cloudflare Pages or your own server.
2. **Add a request file.** [Create `requests/<name>.json`](https://github.com/chaosberlin/chaosberlin/new/main/requests). GitHub forks the repo for you.

   ```json
   {
     "subdomain": "alice",
     "type": "CNAME",
     "content": "alice.github.io",
     "proxied": false,
     "owner": "your-github-username",
     "description": "My personal site"
   }
   ```

3. **Open a pull request.** The template has a checklist. The **validate** check must pass.
4. **Wait for the merge.** The record goes live a few minutes after a maintainer merges. The `dns/publish` status on the merge commit shows ✓ when it's done.
5. **Set `<name>.chaos.berlin` as the custom domain at your host.**

To change or give up a name, open a PR that edits or deletes your file.

## Rules

| Field | Rule |
| --- | --- |
| `subdomain` | `a-z`, `0-9`, `-`, max 63 characters. Must match the file name. Not [reserved](src/validation.ts) (`www`, `mail`, `api`, …). |
| `type` | `CNAME` (hostname), `A` (public IPv4), `AAAA` (public IPv6) or `TXT` (max 255 characters) |
| `owner` | Your GitHub username. You can only add, change or delete your own names. |
| `proxied` | Optional. `true` routes the name through Cloudflare. Keep `false` for GitHub Pages, Vercel and Netlify. Not allowed for `TXT`. |
| `ttl` | Optional. `1` (auto, the default) or 60–86400 seconds. |

A PR may only touch `requests/<name>.json`. Names used for spam, phishing or malware are removed. More detail: [requests/README.md](requests/README.md).

## How it works

```
PR adds requests/<name>.json ─→ validate (format + ownership) ─→ maintainer merges
  ─→ notify-backend ─→ chaosberlin/backend: re-validate, sync Cloudflare DNS
  ─→ dns/publish status on the merge commit
```

| Repo | Visibility | Role |
| --- | --- | --- |
| [chaosberlin/chaosberlin](https://github.com/chaosberlin/chaosberlin) | public | Request files, PR checks, this README (also the profile page) |
| chaosberlin/backend | private | Holds the Cloudflare credentials, writes DNS, reports back |
| [chaosberlin/hello](https://github.com/chaosberlin/hello) | public | Example site behind `hello.chaos.berlin` |

[chaos.berlin](https://chaos.berlin) itself redirects here.

## Development

```sh
bun install
bun test             # validation rules
bun run validate     # check requests/*.json
bun run dev          # local helper app at http://localhost:3000 (GitHub login, writes request files)
bun run build:site   # static portal into dist/
```

Copy `.env.example` to `.env` for the helper app. The repo needs one secret, `CROSS_REPO_TOKEN`: a fine-grained token with *Actions: write* and *Commit statuses: write* on this repo and `chaosberlin/backend`.

| Path | Purpose |
| --- | --- |
| `requests/` | One JSON file per subdomain |
| `src/validation.ts` | Request rules, shared by CI, the helper app and the portal |
| `.github/workflows/validate.yml` | Checks PRs |
| `.github/workflows/notify-backend.yml` | Starts the backend after merges to `main` |
| `index.ts`, `src/auth.ts`, `src/store.ts` | Local helper app |
| `portal.js`, `index.html` | Static portal |
