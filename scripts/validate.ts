// Shared validator for CI: `bun ./scripts/validate.ts [--changed-only]`
import { validateAll } from "../src/store";

const results = await validateAll();
let failed = 0;
for (const r of results) {
  if (r.ok) {
    const v = (r as { value: { subdomain: string; type: string; content: string } }).value;
    console.log(`ok  ${r.file} (${v.subdomain} ${v.type} -> ${v.content})`);
  } else {
    failed++;
    console.error(`fail ${r.file}: ${(r as { errors: string[] }).errors.join("; ")}`);
  }
}
if (results.length === 0) console.log("no requests/*.json files yet — nothing to validate");
if (failed > 0) {
  console.error(`${failed} invalid request(s)`);
  process.exit(1);
}
