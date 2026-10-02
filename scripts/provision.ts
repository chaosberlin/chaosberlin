// Provisions Cloudflare DNS from requests/*.json.
// Usage: bun ./scripts/provision.ts [--dry-run]
// CI (provision.yml) runs this on push to main with real secrets.
import { loadCfConfig, upsertRecord } from "../src/cloudflare";
import { validateAll } from "../src/store";

const dryRun = process.argv.includes("--dry-run");

let cfg;
try {
  cfg = loadCfConfig(process.env);
} catch (e) {
  if (dryRun) {
    console.log(`(dry-run) ${String(e)} — validating files only`);
  } else {
    throw e;
  }
}

const results = await validateAll();
let failed = 0;
for (const r of results) {
  if (!r.ok) {
    failed++;
    console.error(`skip invalid ${r.file}: ${(r as { errors: string[] }).errors.join("; ")}`);
    continue;
  }
  const v = (r as { value: { subdomain: string; type: string; content: string; ttl?: number; proxied?: boolean } }).value;
  const fqdn = `${v.subdomain}.${cfg?.baseDomain ?? process.env.BASE_DOMAIN ?? "example.com"}`;
  if (dryRun || !cfg) {
    console.log(`(dry-run) would upsert ${fqdn} ${v.type} -> ${v.content}`);
    continue;
  }
  const rec = await upsertRecord(cfg, v);
  console.log(`upserted ${rec.name} ${rec.type} -> ${rec.content} (id ${rec.id})`);
}
if (failed > 0) process.exit(1);
if (results.length === 0) console.log("nothing to provision");
