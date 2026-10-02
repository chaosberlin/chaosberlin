import index from "./index.html";
import app from "./app.html";
import {
  exchangeCode,
  fetchGhUser,
  getCookie,
  loginUrl,
  signSession,
  verifySession,
} from "./src/auth";
import { readRegistry, saveRequest, validateAll } from "./src/store";
import { validateRequest } from "./src/validation";

const PORT = Number(process.env.PORT ?? 3000);
const SESSION = "chaos_session";
const BASE_DOMAIN = process.env.BASE_DOMAIN ?? "example.com";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sessionUser(req: Request) {
  return verifySession(
    getCookie(req, SESSION),
    process.env.SESSION_SECRET ?? "",
  );
}

Bun.serve({
  port: PORT,
  routes: {
    "/": index,
    "/app": app,
    "/registry.json": async () => {
      const requests = await validateAll();
      return json(requests.filter(r => r.ok && r.file !== "example.json").map(r => (r as { value: object }).value));
    },

    "/api/health": () => json({ ok: true, domain: BASE_DOMAIN }),

    "/api/subdomains": async () => {
      const registry = await readRegistry();
      const pending = await validateAll();
      return json({
        domain: BASE_DOMAIN,
        live: registry,
        requests: pending.map((p) =>
          p.ok
            ? { file: p.file, ...(p as { value: object }).value }
            : { file: p.file, error: (p as { errors: string[] }).errors },
        ),
      });
    },

    "/api/auth/login": () => {
      if (
        !process.env.GITHUB_CLIENT_ID ||
        process.env.GITHUB_CLIENT_ID === "changeme"
      )
        return json(
          { error: "GitHub OAuth not configured yet (see .env.example)" },
          500,
        );
      return Response.redirect(loginUrl(process.env), 302);
    },

    "/api/auth/callback": async (req) => {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      if (!code) return json({ error: "missing code" }, 400);
      try {
        const token = await exchangeCode(code, process.env);
        const user = await fetchGhUser(token);
        const signed = signSession(user, process.env.SESSION_SECRET ?? "");
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/app",
            "Set-Cookie": `${SESSION}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          },
        });
      } catch (e) {
        return json({ error: String(e) }, 500);
      }
    },

    "/api/auth/logout": () =>
      new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": `${SESSION}=; Path=/; HttpOnly; Max-Age=0`,
        },
      }),

    "/api/me": (req) => {
      const user = sessionUser(req);
      if (!user) return json({ user: null });
      return json({ user });
    },

    // Authenticated helper: creates/updates requests/<sub>.json locally.
    // Merging to main still goes through a GitHub PR (see requests/README.md).
    "/api/requests": {
      GET: async () => json({ requests: await validateAll() }),
      POST: async (req) => {
        const user = sessionUser(req);
        if (!user)
          return json(
            { error: "login with GitHub first (GET /api/auth/login)" },
            401,
          );
        const body = await req.json().catch(() => null);
        const v = validateRequest({ ...body, owner: user.login });
        if (!v.ok) return json({ errors: v.errors }, 400);
        await saveRequest(v.value);
        return json({
          ok: true,
          file: `requests/${v.value.subdomain}.json`,
          fqdn: `${v.value.subdomain}.${BASE_DOMAIN}`,
          next: "open a PR with this file — merge triggers Cloudflare provisioning",
        });
      },
    },
  },
  development: { hmr: true, console: true },
});

console.log(`chaosberlin backend on http://localhost:${PORT} (domain: ${BASE_DOMAIN})`);
