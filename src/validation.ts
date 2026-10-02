export type DnsType = "A" | "AAAA" | "CNAME" | "TXT";

export interface SubdomainRequest {
  subdomain: string;
  type: DnsType;
  content: string;
  ttl?: number;
  proxied?: boolean;
  owner: string;
  description?: string;
}

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// Names we never hand out via self-service PRs. Keep apex + mail infra safe.
export const RESERVED = new Set([
  "@",
  "www",
  "mail",
  "smtp",
  "imap",
  "pop",
  "autoconfig",
  "autodiscover",
  "_dmarc",
  "_domainkey",
  "ns1",
  "ns2",
  "admin",
  "api",
  "auth",
  "login",
  "backend",
  "cloudflare",
  "github",
]);

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const HOSTNAME_RE =
  /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.?$/i;

export function validateRequest(
  req: unknown,
): { ok: true; value: SubdomainRequest } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof req !== "object" || req === null) {
    return { ok: false, errors: ["request must be a JSON object"] };
  }
  const r = req as Record<string, unknown>;

  const subdomain =
    typeof r.subdomain === "string" ? r.subdomain.toLowerCase().trim() : "";
  if (!subdomain) errors.push("subdomain is required");
  else {
    if (subdomain.length > 63) errors.push("subdomain must be <= 63 chars");
    if (!SUBDOMAIN_RE.test(subdomain))
      errors.push(
        "subdomain must be lowercase a-z, 0-9, hyphen, not start/end with hyphen",
      );
    if (RESERVED.has(subdomain))
      errors.push(`subdomain '${subdomain}' is reserved`);
  }

  const type = typeof r.type === "string" ? r.type.toUpperCase() : "";
  if (!["A", "AAAA", "CNAME", "TXT"].includes(type))
    errors.push("type must be one of A, AAAA, CNAME, TXT");

  const content = typeof r.content === "string" ? r.content.trim() : "";
  if (!content) errors.push("content/target is required");
  else if (type === "A" && !IPV4_RE.test(content))
    errors.push("A record content must be a valid IPv4 address");
  else if (type === "AAAA" && !content.includes(":"))
    errors.push("AAAA record content must be a valid IPv6 address");
  else if (type === "CNAME" && !HOSTNAME_RE.test(content))
    errors.push("CNAME content must be a valid hostname (no IP, no URL)");
  else if (type === "CNAME" && IPV4_RE.test(content))
    errors.push("CNAME content must be a hostname, not an IP");
  else if (type === "TXT" && content.length > 2048)
    errors.push("TXT content must be <= 2048 chars");

  if (r.ttl !== undefined) {
    const ttl = Number(r.ttl);
    if (!Number.isInteger(ttl) || (ttl !== 1 && (ttl < 60 || ttl > 86400)))
      errors.push("ttl must be 1 (auto) or 60-86400");
  }

  if (r.proxied !== undefined && typeof r.proxied !== "boolean")
    errors.push("proxied must be a boolean");
  if (r.proxied === true && type === "TXT")
    errors.push("TXT records cannot be proxied");

  const owner = typeof r.owner === "string" ? r.owner.trim() : "";
  if (!owner) errors.push("owner (GitHub username) is required");
  else if (!/^[a-z0-9-]{1,39}$/i.test(owner))
    errors.push("owner must be a valid GitHub username");

  if (
    r.description !== undefined &&
    (typeof r.description !== "string" || r.description.length > 500)
  )
    errors.push("description must be a string <= 500 chars");

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      subdomain,
      type: type as DnsType,
      content,
      ttl: r.ttl === undefined ? 1 : Number(r.ttl),
      proxied: r.proxied === true,
      owner,
      description:
        typeof r.description === "string" ? r.description : undefined,
    },
  };
}

export function requestFilename(req: SubdomainRequest): string {
  return `${req.subdomain.toLowerCase()}.json`;
}

export function fqdn(subdomain: string, baseDomain: string): string {
  return `${subdomain.toLowerCase()}.${baseDomain.toLowerCase()}`;
}
