# chaos.berlin

Community free `<name>.chaos.berlin` subdomains.

**[→ Get a subdomain](https://chaos.berlin/new)** · [HTTPS status](https://github.com/chaosberlin/chaosberlin/issues/5) · Example: [hello.chaos.berlin](https://hello.chaos.berlin) ([request](requests/hello.yaml))

## How?

1. Open [chaos.berlin/new](https://chaos.berlin/new). It creates `requests/<name>.yaml` in your fork.
2. Fill it in and open a pull request. Two checks must pass: **validate** (format + permissions) and **https** (your target can serve HTTPS).
3. After approval the DNS is live within around 15 minutes.

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

## HTTPS

- `proxied: true`: Serves HTTPS automatically.
- `proxied: false`: Your host issues the certificate once DNS points to it. On your own server, use Let's Encrypt.

Every 6 hours, [`https-check.yml`](.github/workflows/https-check.yml) tests all names and updates the [HTTPS status](https://github.com/chaosberlin/chaosberlin/issues/5) issue.


| Repo | |
| --- | --- |
| [chaosberlin/chaosberlin](https://github.com/chaosberlin/chaosberlin) | requests, checks, profile page |
| chaosberlin/backend (private) | Cloudflare credentials, DNS sync |
| [chaosberlin/hello](https://github.com/chaosberlin/hello) | example site |
