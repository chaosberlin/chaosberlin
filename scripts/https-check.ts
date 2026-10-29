// Checks that every web subdomain answers over HTTPS with a valid certificate
// and prints a Markdown report. https-check.yml posts it to the "HTTPS status" issue.
//
//   bun scripts/https-check.ts [--domain chaos.berlin]
import { $ } from "bun";
import { validateAll } from "../src/store";

const domain = process.argv.includes("--domain") ? process.argv[process.argv.indexOf("--domain") + 1] : "chaos.berlin";
const GRACE_HOURS = 24; // hosts usually issue a certificate within an hour of DNS going live

async function addedAt(file: string): Promise<Date | undefined> {
  const out = (await $`git log --diff-filter=A --format=%cI -- ${`requests/${file}`}`.nothrow().text()).trim().split("\n").at(-1);
  return out ? new Date(out) : undefined;
}

async function probe(host: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`https://${host}/`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    return { ok: true, detail: `HTTP ${res.status}` };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return { ok: false, detail: err.code ?? err.message ?? String(e) };
  }
}

const rows: { name: string; owner: string; status: string; detail: string }[] = [];
for (const r of await validateAll()) {
  if (!r.ok || r.value.type === "TXT") continue;
  const host = `${r.value.subdomain}.${domain}`;
  const { ok, detail } = await probe(host);
  const added = await addedAt(r.file);
  const isNew = added !== undefined && Date.now() - added.getTime() < GRACE_HOURS * 3600_000;
  rows.push({ name: host, owner: r.value.owner, status: ok ? "✅" : isNew ? "⏳ new" : "❌", detail });
}

const failing = rows.filter((r) => r.status === "❌").length;
console.log(`# HTTPS status

${rows.length} web subdomain(s), ${failing} without working HTTPS. Updated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.

| Subdomain | Owner | HTTPS | Detail |
| --- | --- | --- | --- |
${rows.map((r) => `| [${r.name}](https://${r.name}) | \`${r.owner}\` | ${r.status} | ${r.detail} |`).join("\n") || "| – | – | – | – |"}

❌ means the name doesn't answer over HTTPS with a valid certificate. To fix it, set \`${"<name>"}.${domain}\` as the custom domain at your host and turn on its HTTPS option, or set \`proxied: true\` so Cloudflare serves HTTPS. ⏳ = added in the last ${GRACE_HOURS} h, the certificate may still be on its way.`);
process.exitCode = failing ? 1 : 0;
