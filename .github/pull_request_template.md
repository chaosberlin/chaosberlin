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

Add exactly **one** file, `requests/<name>.json`:

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

| `type`  | `content`                                         |
| ------- | ------------------------------------------------- |
| `CNAME` | a hostname, e.g. `alice.github.io`, `x.pages.dev`, `x.vercel.app` (no `https://`) |
| `A`     | a public IPv4 address                             |
| `AAAA`  | a public IPv6 address                             |
| `TXT`   | text, up to 255 characters                        |

- Leave `proxied` as `false` for GitHub Pages, Vercel and Netlify, so they can issue your HTTPS certificate.
- Remember to add `<name>.chaos.berlin` as the custom domain at your host as well.

## ✅ Checklist

- [ ] The file is `requests/<name>.json`, and `"subdomain"` matches `<name>`
- [ ] `"owner"` is **my** GitHub username (the check fails otherwise)
- [ ] This PR changes nothing outside `requests/`
- [ ] The name isn't reserved (`www`, `mail`, `api`, `admin`, … see `src/validation.ts`)
- [ ] I'll set `<name>.chaos.berlin` as the custom domain at my host
- [ ] No spam, phishing, malware or anything illegal. Abused names get removed.

## 🚦 What happens next

1. **Validate** checks the file and that you own the name. Fix anything it flags.
2. A maintainer reviews and merges.
3. The DNS record goes live within a few minutes. The **`dns/publish`** status on the merge commit shows ✓ when it's done.

To change or give up your name later, open another PR that edits or deletes your file.
