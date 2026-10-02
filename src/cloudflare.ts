// Minimal Cloudflare DNS v4 client using fetch (works in Bun + GitHub Actions).
// Docs: https://developers.cloudflare.com/api/ (DNS records)

export interface CfConfig {
  apiToken: string;
  zoneId: string;
  baseDomain: string;
}

export function loadCfConfig(env: Record<string, string | undefined>): CfConfig {
  const apiToken = (env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const zoneId = (env.CLOUDFLARE_ZONE_ID ?? "").trim();
  const baseDomain = (env.BASE_DOMAIN ?? "").trim().toLowerCase();
  if (!apiToken || apiToken === "changeme")
    throw new Error("CLOUDFLARE_API_TOKEN is not set (see .env.example)");
  if (!zoneId || zoneId === "changeme")
    throw new Error("CLOUDFLARE_ZONE_ID is not set (see .env.example)");
  if (!baseDomain) throw new Error("BASE_DOMAIN is not set");
  return { apiToken, zoneId, baseDomain };
}

const API = "https://api.cloudflare.com/client/v4";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

export async function listRecords(
  cfg: CfConfig,
  name: string,
): Promise<DnsRecord[]> {
  const url = `${API}/zones/${cfg.zoneId}/dns_records?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: headers(cfg.apiToken) });
  const body = (await res.json()) as {
    success: boolean;
    errors: unknown[];
    result: DnsRecord[];
  };
  if (!res.ok || !body.success)
    throw new Error(`Cloudflare list failed: ${JSON.stringify(body.errors)}`);
  return body.result ?? [];
}

export async function upsertRecord(
  cfg: CfConfig,
  opts: {
    subdomain: string;
    type: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
  },
): Promise<DnsRecord> {
  const name = `${opts.subdomain.toLowerCase()}.${cfg.baseDomain}`;
  const existing = await listRecords(cfg, name);
  const match = existing.find(
    (r) => r.type === opts.type.toUpperCase() && r.name.toLowerCase() === name.toLowerCase(),
  );

  const payload = {
    type: opts.type.toUpperCase(),
    name,
    content: opts.content,
    ttl: opts.ttl ?? 1,
    ...(opts.type.toUpperCase() === "TXT"
      ? {}
      : { proxied: opts.proxied ?? false }),
  };

  if (match) {
    // No-op if identical
    if (
      match.content === payload.content &&
      match.ttl === payload.ttl &&
      (payload as { proxied?: boolean }).proxied === undefined
    )
      return match;
    const res = await fetch(`${API}/zones/${cfg.zoneId}/dns_records/${match.id}`, {
      method: "PUT",
      headers: headers(cfg.apiToken),
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      success: boolean;
      errors: unknown[];
      result: DnsRecord;
    };
    if (!res.ok || !body.success)
      throw new Error(`Cloudflare update failed: ${JSON.stringify(body.errors)}`);
    return body.result;
  }

  const res = await fetch(`${API}/zones/${cfg.zoneId}/dns_records`, {
    method: "POST",
    headers: headers(cfg.apiToken),
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as {
    success: boolean;
    errors: unknown[];
    result: DnsRecord;
  };
  if (!res.ok || !body.success)
    throw new Error(`Cloudflare create failed: ${JSON.stringify(body.errors)}`);
  return body.result;
}
