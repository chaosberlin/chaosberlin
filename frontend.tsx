import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

interface Entry {
  file: string;
  subdomain?: string;
  type?: string;
  content?: string;
  owner?: string;
  error?: string[];
}

function App() {
  const [me, setMe] = useState<{ login: string } | null>(null);
  const [domain, setDomain] = useState("example.com");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState({ subdomain: "", type: "CNAME", content: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
    fetch("/api/subdomains")
      .then((r) => r.json())
      .then((d) => {
        setDomain(d.domain);
        setEntries(d.requests ?? []);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("...");
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMsg(res.ok ? `Saved ${data.file} → open a PR to get ${data.fqdn}` : JSON.stringify(data));
  }

  return (
    <main>
      <h1>chaosberlin subdomain self-service</h1>
      <p><a href="/">« back to the 90s landing page</a></p>
      <p>
        1. <a href="/api/auth/login">Login with GitHub</a>
        {me ? <> as <b>{me.login}</b> (<a href="/api/auth/logout">logout</a>)</> : " (required)"}
      </p>
      <p>
        2. Request a name → creates <code>requests/&lt;name&gt;.json</code> → open a PR.{" "}
        3. Merge triggers GitHub Action → Cloudflare DNS for <code>*.{domain}</code>.
      </p>

      <form onSubmit={submit}>
        <input
          placeholder="subdomain (e.g. myapp)"
          value={form.subdomain}
          onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
          required
        />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option>CNAME</option>
          <option>A</option>
          <option>AAAA</option>
          <option>TXT</option>
        </select>
        <input
          placeholder="target (hostname or IP)"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          required
        />
        <button type="submit">Request</button>
      </form>
      {msg && <pre>{msg}</pre>}

      <h2>Pending requests ({entries.length})</h2>
      <ul>
        {entries.map((r) => (
          <li key={r.file}>
            <code>{r.file}</code>{" "}
            {r.error ? <span style={{ color: "red" }}>{r.error.join("; ")}</span> : `${r.subdomain}.${domain} ${r.type} → ${r.content} (by ${r.owner})`}
          </li>
        ))}
      </ul>
      <p>
        Prefer PRs manually? See <code>requests/README.md</code> for the file format.
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
