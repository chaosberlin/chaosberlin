# chaos.berlin

Free `<name>.chaos.berlin` subdomains. One YAML file, one pull request.

**[→ Claim a subdomain](https://chaos.berlin/new)** · [HTTPS status](https://github.com/chaosberlin/chaosberlin/issues/5) · Example: [hello.chaos.berlin](https://hello.chaos.berlin) ([request](requests/hello.yaml))

## Claim

1. Open [chaos.berlin/new](https://chaos.berlin/new). It creates `requests/<name>.yaml` in your fork.
2. Fill it in and open a pull request. Two checks must pass: **validate** (format + permissions) and **https** (your target can serve HTTPS).
3. A maintainer merges it, and DNS is live within minutes.
4. Add `<name>.chaos.berlin` as the custom domain at your host.

```yaml
subdomain: alice            # = file name
type: CNAME                 # CNAME | A | AAAA | TXT
content: alice.github.io
proxied: false
owner: alice                # your GitHub username
collaborators: [bob]        # optional
description: Personal site  # optional
```

| Field | Rule |
| --- | --- |
| `subdomain` | `a-z0-9-`, max 63, not [reserved](src/validation.ts) |
| `content` | CNAME: hostname · A/AAAA: public IP · TXT: max 255 chars |
| `proxied` | `true` = traffic and HTTPS through Cloudflare. Not for TXT. |
| `ttl` | `1` (auto) or 60–86400 |

## Permissions

| | Add | Edit records | Edit collaborators | Delete | Transfer |
| --- | --- | --- | --- | --- | --- |
| Anyone | ✅ as owner, max 5 | | | | |
| Collaborator | | ✅ | | | |
| Owner | | ✅ | ✅ | ✅ | |
| Maintainer | ✅ | ✅ | ✅ | ✅ | ✅ |

- A PR may only change `requests/<name>.yaml`.
- These rules run from `main`, so a PR can't change them ([`src/permissions.ts`](src/permissions.ts)).

## HTTPS

- `proxied: true`: Cloudflare serves HTTPS automatically.
- `proxied: false`: your host issues the certificate once DNS points to it. GitHub Pages, Vercel, Netlify and Cloudflare Pages do this on their own. On GitHub Pages, also turn on *Enforce HTTPS*. On your own server, use Let's Encrypt.

Every 6 hours, [`https-check.yml`](.github/workflows/https-check.yml) tests all names and updates the [HTTPS status](https://github.com/chaosberlin/chaosberlin/issues/5) issue.

## How it works

```
PR → validate (format + permissions, from main) → merge
   → notify-backend → chaosberlin/backend (private): re-validate, sync Cloudflare
   → dns/publish status on the merge commit
```

| Repo | |
| --- | --- |
| [chaosberlin/chaosberlin](https://github.com/chaosberlin/chaosberlin) | requests, checks, profile page |
| chaosberlin/backend (private) | Cloudflare credentials, DNS sync |
| [chaosberlin/hello](https://github.com/chaosberlin/hello) | example site |
