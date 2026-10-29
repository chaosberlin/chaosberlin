// PR check "https": can the requested target serve HTTPS once DNS is live?
// Before merge the name itself doesn't resolve yet, so this checks the target:
//   proxied: true  → Cloudflare serves the certificate, always ok
//   CNAME          → the target host must answer HTTPS with a valid certificate
//                    (GitHub Pages, Vercel, Netlify, … then issue one for <name>.chaos.berlin)
//   A / AAAA       → the server must accept TLS connections on port 443
// Runs from main via pull_request_target like check-pr.ts; PR files are only read as data.
//
// Env: PR_NUMBER
import { appendFile } from "node:fs/promises";
import { connect } from "node:net";
import { $ } from "bun";
import { parseRequestText, REQUEST_FILE_RE } from "../src/store";
import { validateRequest, type SubdomainRequest } from "../src/validation";

const pr = process.env.PR_NUMBER;
if (!pr) throw new Error("PR_NUMBER is required");
const domain = process.env.BASE_DOMAIN || "chaos.berlin";

await $`git fetch --no-tags --quiet origin +refs/pull/${pr}/head:refs/remotes/pr/head`;
const mergeBase = (await $`git merge-base HEAD pr/head`.text()).trim();
const changed = (await $`git diff --name-only --no-renames --diff-filter=AM ${mergeBase} pr/head -- requests/`.text())
  .split("\n").filter((p) => REQUEST_FILE_RE.test(p.slice("requests/".length)) && !p.endsWith("/example.yaml"));

async function tlsCertificate(host: string): Promise<string | undefined> {
  try {
    await fetch(`https://${host}/`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return err.code ?? err.message ?? String(e);
  }
}

function port443(ip: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const socket = connect({ host: ip, port: 443, timeout: 8_000 });
    socket.once("connect", () => (socket.destroy(), resolve(undefined)));
    socket.once("timeout", () => (socket.destroy(), resolve("timed out")));
    socket.once("error", (e: NodeJS.ErrnoException) => resolve(e.code ?? e.message));
  });
}

async function check(r: SubdomainRequest): Promise<{ ok: boolean; detail: string }> {
  if (r.type === "TXT") return { ok: true, detail: "TXT, no HTTPS needed" };
  if (r.proxied) return { ok: true, detail: "proxied, Cloudflare serves HTTPS" };
  if (r.type === "CNAME") {
    const error = await tlsCertificate(r.content);
    return error
      ? { ok: false, detail: `\`${r.content}\` has no valid HTTPS (${error})` }
      : { ok: true, detail: `\`${r.content}\` serves valid HTTPS; add \`${r.subdomain}.${domain}\` as custom domain there` };
  }
  const error = await port443(r.content);
  return error
    ? { ok: false, detail: `\`${r.content}\` does not accept connections on port 443 (${error})` }
    : { ok: true, detail: `port 443 open on \`${r.content}\`; get a certificate for \`${r.subdomain}.${domain}\` (e.g. Let's Encrypt)` };
}

const rows: string[] = [];
let failed = 0;
for (const path of changed) {
  const text = (await $`git show ${`pr/head:${path}`}`.quiet().nothrow()).stdout.toString();
  let v;
  try {
    v = validateRequest(parseRequestText(text));
  } catch {
    continue; // reported by the validate check
  }
  if (!v.ok) continue;
  const { ok, detail } = await check(v.value);
  if (!ok) {
    failed++;
    console.log(`::error file=${path}::${detail.replaceAll("`", "")}`);
  }
  rows.push(`| \`${v.value.subdomain}.${domain}\` | ${ok ? "✅" : "❌"} | ${detail} |`);
}

const summary = rows.length
  ? `### HTTPS readiness\n\n| Name | | Detail |\n| --- | --- | --- |\n${rows.join("\n")}\n` +
    (failed ? "\nFix the target, or set `proxied: true` so Cloudflare serves HTTPS.\n" : "")
  : "### HTTPS readiness\n\nNo web records changed.\n";
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
process.exit(failed ? 1 : 0);
