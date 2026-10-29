import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { requestToYaml, validateRequest, type SubdomainRequest } from "./validation";

export const REQUESTS_DIR = join(import.meta.dir, "..", "requests");
export const DATA_FILE = join(import.meta.dir, "..", "data", "subdomains.json");
export const REQUEST_FILE_RE = /^[a-z0-9-]+\.yaml$/;
const MAX_FILE_BYTES = 4096;

type Result = { file: string; ok: true; value: SubdomainRequest } | { file: string; ok: false; errors: string[] };

// Parses request YAML as plain data. The size cap keeps hostile files (e.g. alias bombs) cheap.
export function parseRequestText(text: string): unknown {
  if (text.length > MAX_FILE_BYTES) throw new Error(`file is larger than ${MAX_FILE_BYTES} bytes`);
  return Bun.YAML.parse(text);
}

export async function listRequestFiles(dir = REQUESTS_DIR): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f !== "README.md" && f !== "example.yaml").sort();
  } catch {
    return [];
  }
}

export async function validateAll(dir = REQUESTS_DIR): Promise<Result[]> {
  const out: Result[] = [];
  const seen = new Map<string, string>();
  for (const file of await listRequestFiles(dir)) {
    if (!REQUEST_FILE_RE.test(file)) {
      out.push({ file, ok: false, errors: ["request files must be named <name>.yaml"] });
      continue;
    }
    let raw: unknown;
    try {
      raw = parseRequestText(await readFile(join(dir, file), "utf8"));
    } catch (e) {
      out.push({ file, ok: false, errors: [`invalid YAML: ${(e as Error).message}`] });
      continue;
    }
    const v = validateRequest(raw);
    if (!v.ok) {
      out.push({ file, ok: false, errors: v.errors });
      continue;
    }
    if (file !== `${v.value.subdomain}.yaml`) {
      out.push({ file, ok: false, errors: [`filename must be ${v.value.subdomain}.yaml`] });
      continue;
    }
    if (seen.has(v.value.subdomain)) {
      out.push({ file, ok: false, errors: [`duplicate subdomain '${v.value.subdomain}' (also in ${seen.get(v.value.subdomain)})`] });
      continue;
    }
    seen.set(v.value.subdomain, file);
    out.push({ file, ok: true, value: v.value });
  }
  return out;
}

export async function readRegistry(): Promise<SubdomainRequest[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function saveRequest(req: SubdomainRequest): Promise<string> {
  await mkdir(REQUESTS_DIR, { recursive: true });
  const file = join(REQUESTS_DIR, `${req.subdomain.toLowerCase()}.yaml`);
  await writeFile(file, requestToYaml(req));
  return file;
}
