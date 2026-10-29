# Requesting a subdomain

Each subdomain is one file, `requests/<name>.yaml`. Start from [`example.yaml`](example.yaml).

```yaml
subdomain: alice            # must match the file name: requests/alice.yaml
type: CNAME                 # CNAME, A, AAAA or TXT
content: alice.github.io
proxied: false
owner: alice                # your GitHub username
collaborators: [bob]        # optional
description: My personal site
```

| Field | Required | Rule |
| --- | --- | --- |
| `subdomain` | yes | `a-z`, `0-9`, `-`, max 63 characters, not reserved (`www`, `mail`, `api`, … see [`src/validation.ts`](../src/validation.ts)) |
| `type` | yes | `CNAME`, `A`, `AAAA` or `TXT` |
| `content` | yes | `CNAME`: a hostname (no `https://`). `A`/`AAAA`: a public IP address. `TXT`: max 255 characters. |
| `owner` | yes | GitHub username of the person responsible for the name |
| `collaborators` | no | Up to 10 GitHub usernames who may edit the records |
| `proxied` | no | `true` routes the name through Cloudflare. Keep `false` for GitHub Pages, Vercel and Netlify. Not allowed for `TXT`. |
| `ttl` | no | `1` (auto, default) or 60–86400 seconds |
| `description` | no | Max 500 characters |

## Who can change what

| | Add a new name | Edit records | Edit `collaborators` | Delete | Change `owner` |
| --- | --- | --- | --- | --- | --- |
| Anyone | ✅ as owner, max 5 names | — | — | — | — |
| Collaborator | — | ✅ | — | — | — |
| Owner | — | ✅ | ✅ | ✅ | — |
| Maintainer | ✅ | ✅ | ✅ | ✅ | ✅ |

- The PR author is the person being checked. Owners and collaborators are matched by GitHub username, ignoring case.
- A request PR may only change files in `requests/`.
- Renaming counts as deleting the old name and adding a new one.
- To transfer a name, ask a maintainer.

These rules are enforced by the **validate** check. It always runs the version of the rules on `main`, so a PR can't change them.
