<!--
  Thanks for joining the namespace! Fill in the blanks below.
  Lines between these arrows are hidden in the PR, so you can leave them.
-->

## 🌐 Subdomain

**Name:** `____.chaos.berlin`
<!-- e.g. `alice.chaos.berlin` -->

**What will live there?**
<!-- One or two sentences: a personal site, a project, a demo, an API… -->

**Link to the project or repo (optional):**

## 📄 Request file

Add or edit **one** file, `requests/<name>.yaml` (or use [chaos.berlin/new](https://chaos.berlin/new)):

```yaml
subdomain: alice
type: CNAME
content: alice.github.io
proxied: false
owner: your-github-username
# collaborators: [friend]   # optional: may edit records, not delete or share
description: My personal site
```

| `type`  | `content`                                         |
| ------- | ------------------------------------------------- |
| `CNAME` | a hostname, e.g. `alice.github.io`, `x.pages.dev`, `x.vercel.app` (no `https://`) |
| `A`     | a public IPv4 address                             |
| `AAAA`  | a public IPv6 address                             |
| `TXT`   | text, up to 255 characters                        |

- **HTTPS:** with `proxied: false`, your host issues the certificate (GitHub Pages: turn on *Enforce HTTPS*). With `proxied: true`, Cloudflare does it.
- Add `<name>.chaos.berlin` as the custom domain at your host.

## ✅ Checklist

- [ ] The file is `requests/<name>.yaml`, and `subdomain` matches `<name>`
- [ ] New name: `owner` is **my** GitHub username. Existing name: I'm its owner or a collaborator.
- [ ] This PR changes nothing outside `requests/`
- [ ] The name isn't reserved (`www`, `mail`, `api`, `admin`, … see `src/validation.ts`)
- [ ] I'll set `<name>.chaos.berlin` as the custom domain at my host
- [ ] No spam, phishing, malware or anything illegal. Abused names get removed.

## 🚦 What happens next

1. **validate** checks the file and your permissions, **https** checks that your target can serve HTTPS ([who can change what](../blob/main/requests/README.md#who-can-change-what)). Fix anything it flags.
2. A maintainer reviews and merges.
3. The DNS record goes live within a few minutes. The **`dns/publish`** status on the merge commit shows ✓ when it's done.

To change or give up your name later, open another PR that edits or deletes your file.
