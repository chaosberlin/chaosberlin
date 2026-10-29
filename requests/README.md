# How to get a subdomain

Anyone logged in with GitHub can get `YOURNAME.<domain>`:

1. Fork this repo (or edit in the GitHub web UI).
2. Copy `requests/example.json` → `requests/<yourname>.json`.
3. Fill in `subdomain`, `type`, `content`, `owner` (your GitHub username).
4. Open a Pull Request. The `Validate subdomain requests` action checks:
   - name is lowercase `a-z0-9-`, ≤63 chars, not reserved
   - `type` is A / AAAA / CNAME / TXT with a valid target
   - filename matches `subdomain` (e.g. `myapp.json` for `"subdomain": "myapp"`)
   It also checks that `owner` is you, and that you own any existing name you change or delete.
5. After a maintainer merges, the DNS record goes live within a minute or two.
   The `dns/publish` status on the merge commit shows the result.

## File format

```json
{
  "subdomain": "myapp",
  "type": "CNAME",
  "content": "myapp.pages.dev",
  "ttl": 1,
  "proxied": false,
  "owner": "your-github-username",
  "description": "my demo"
}
```

- `type: A` → `content` must be a public IPv4 address
- `type: AAAA` → `content` must be a public IPv6 address
- `type: CNAME` → `content` must be a hostname (e.g. `x.pages.dev`, no `https://`)
- `type: TXT` → up to 255 characters, `proxied` must be false/omitted
- `ttl`: `1` (auto) or 60–86400
- Reserved names (`www`, `mail`, `admin`, `api`, …) are rejected — see `src/validation.ts`.

## Local backend shortcut

If the backend is running (`bun run dev`) and you're logged in via
`/api/auth/login`, you can POST to `/api/requests` instead of hand-editing
JSON — it writes the same file, you still open the PR.
