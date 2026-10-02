# How to get a subdomain

Anyone logged in with GitHub can get `YOURNAME.<domain>`:

1. Fork this repo (or edit in the GitHub web UI).
2. Copy `requests/example.json` → `requests/<yourname>.json`.
3. Fill in `subdomain`, `type`, `content`, `owner` (your GitHub username).
4. Open a Pull Request. The `Validate subdomain requests` action checks:
   - name is lowercase `a-z0-9-`, ≤63 chars, not reserved
   - `type` is A / AAAA / CNAME / TXT with a valid target
   - filename matches `subdomain` (e.g. `myapp.json` for `"subdomain": "myapp"`)
5. After merge, the `Provision Cloudflare DNS` action creates/updates the
   Cloudflare DNS record automatically. No manual Cloudflare step needed.

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

- `type: A` → `content` must be IPv4 (e.g. `192.0.2.1`)
- `type: AAAA` → `content` must be IPv6
- `type: CNAME` → `content` must be a hostname (e.g. `x.pages.dev`, no `https://`)
- `type: TXT` → any text, `proxied` must be false/omitted
- `ttl`: `1` (auto) or 60–86400
- Reserved names (`www`, `mail`, `admin`, `api`, …) are rejected — see `src/validation.ts`.

## Local backend shortcut

If the backend is running (`bun run dev`) and you're logged in via
`/api/auth/login`, you can POST to `/api/requests` instead of hand-editing
JSON — it writes the same file, you still open the PR.
