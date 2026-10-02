import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { validateRequest, type SubdomainRequest } from "./validation";

export const REQUESTS_DIR = join(import.meta.dir, "..", "requests");
export const DATA_FILE = join(import.meta.dir, "..", "data", "subdomains.json");

export async function listRequestFiles(): Promise<string[]> {
  try {
    const files = await readdir(REQUESTS_DIR);
    return files.filter((f) => f.endsWith(".json") && f !== "example.json");
  } catch {
    return [];
  }
}

export async function readRequest(
  file: string,
): Promise<{ file: string; raw: unknown }> {
  const raw = JSON.parse(await readFile(join(REQUESTS_DIR, file), "utf8"));
  return { file, raw };
}

export async function validateAll(): Promise<
  { file: string; ok: true; value: SubdomainRequest } | { file: string; ok: false; errors: string[] }[]
> {
  const out: { file: string; ok: boolean; errors?: string[]; value?: SubdomainRequest }[] = [];
  const seen = new Map<string, string>();
  for (const file of await listRequestFiles()) {
    const { raw } = await readRequest(file);
    const v = validateRequest(raw);
    if (!v.ok) {
      out.push({ file, ok: false, errors: (v as { errors: string[] }).errors });
      continue;
    }
    const value = (v as { value: SubdomainRequest }).value;
    // filename must match subdomain
    if (file.toLowerCase() !== `${value.subdomain.toLowerCase()}.json`) {
      out.push({
        file,
        ok: false,
        errors: [`filename must be ${value.subdomain.toLowerCase()}.json`],
      });
      continue;
    }
    if (seen.has(value.subdomain)) {
      out.push({
        file,
        ok: false,
        errors: [`duplicate subdomain '${value.subdomain}' (also in ${seen.get(value.subdomain)})`],
      });
      continue;
    }
    seen.set(value.subdomain, file);
    out.push({ file, ok: true, value });
  }
  return out as never;
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
  const file = join(REQUESTS_DIR, `${req.subdomain.toLowerCase()}.json`);
  await writeFile(file, JSON.stringify(req, null, 2) + "\n");
  return file;
}
