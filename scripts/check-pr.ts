// PR gate, run by check.yml via pull_request_target. This code always comes from
// main, and the PR's files are only read as data (git show + YAML parse), never
// executed, so a PR cannot change the rules it is checked against.
//
// Env: GITHUB_REPOSITORY, GH_TOKEN, PR_NUMBER, AUTHOR
import { appendFile, cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { authorize, type Change, type Problem } from "../src/permissions";
import { parseRequestText, REQUEST_FILE_RE, REQUESTS_DIR, validateAll } from "../src/store";

const { GITHUB_REPOSITORY: repo, GH_TOKEN: token, PR_NUMBER: pr, AUTHOR: author } = process.env;
if (!repo || !token || !pr || !author) throw new Error("GITHUB_REPOSITORY, GH_TOKEN, PR_NUMBER and AUTHOR are required");

async function isMaintainer(login: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${repo}/collaborators/${login}/permission`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return false;
  const { permission } = (await res.json()) as { permission?: string };
  return ["admin", "maintain", "write"].includes(permission ?? "");
}

const gitShow = async (ref: string, path: string) => {
  const r = await $`git show ${`${ref}:${path}`}`.quiet().nothrow();
  return r.exitCode === 0 ? r.stdout.toString() : undefined;
};

const maintainer = await isMaintainer(author);
await $`git fetch --no-tags --quiet origin +refs/pull/${pr}/head:refs/remotes/pr/head`;
const mergeBase = (await $`git merge-base HEAD pr/head`.text()).trim();
const diff = (await $`git diff --name-status --no-renames ${mergeBase} pr/head`.text()).trim();

const problems: Problem[] = [];
const changes: Change[] = [];
const work = await mkdtemp(join(tmpdir(), "requests-"));
await cp(REQUESTS_DIR, work, { recursive: true });

for (const line of diff ? diff.split("\n") : []) {
  const [status, path] = line.split("\t") as [string, string];
  const file = path.slice("requests/".length);
  const isRequest = path.startsWith("requests/") && REQUEST_FILE_RE.test(file) && file !== "example.yaml";
  if (!isRequest) {
    if (!maintainer) problems.push({ message: `only requests/<name>.yaml may be changed (got ${path})` });
    continue;
  }

  const beforeText = await gitShow("HEAD", path);
  const afterText = status === "D" ? undefined : await gitShow("pr/head", path);
  if (afterText === undefined) await rm(join(work, file), { force: true });
  else await writeFile(join(work, file), afterText);

  const parse = (text?: string) => {
    if (text === undefined) return undefined;
    try {
      return parseRequestText(text) ?? null;
    } catch {
      return null; // reported by the format check below
    }
  };
  changes.push({ file, before: parse(beforeText), after: parse(afterText) });
}

// Format check on main + this PR, using main's validator.
const results = await validateAll(work);
for (const r of results) if (!r.ok) for (const message of r.errors) problems.push({ file: r.file, message });

if (!maintainer) {
  const owned = results.filter((r) => r.ok && r.value.owner.toLowerCase() === author.toLowerCase()).length;
  problems.push(...authorize(author, changes, owned));
}
await rm(work, { recursive: true, force: true });

for (const p of problems) console.log(`::error${p.file ? ` file=requests/${p.file}` : ""}::${p.message}`);
const summary = [
  `### Subdomain request check`,
  `PR author **${author}**${maintainer ? " (maintainer)" : ""}, ${changes.length} request file(s) changed.`,
  "",
  problems.length ? problems.map((p) => `- ❌ ${p.file ? `\`${p.file}\`: ` : ""}${p.message}`).join("\n") : "✅ All checks passed.",
].join("\n");
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
console.log(summary);
process.exit(problems.length ? 1 : 0);
