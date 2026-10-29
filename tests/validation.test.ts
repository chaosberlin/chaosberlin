import { test, expect } from "bun:test";
import { fqdn, validateRequest } from "../src/validation";

test("accepts valid CNAME", () => {
  const r = validateRequest({
    subdomain: "myapp",
    type: "CNAME",
    content: "myapp.pages.dev",
    owner: "octocat",
  });
  expect(r.ok).toBe(true);
});

test("rejects reserved + bad names", () => {
  expect(validateRequest({ subdomain: "www", type: "A", content: "1.2.3.4", owner: "a" }).ok).toBe(false);
  expect(validateRequest({ subdomain: "Bad_Name!", type: "A", content: "1.2.3.4", owner: "a" }).ok).toBe(false);
});

test("rejects A with hostname", () => {
  const r = validateRequest({ subdomain: "x", type: "A", content: "example.com", owner: "a" });
  expect(r.ok).toBe(false);
});

test("fqdn helper", () => {
  expect(fqdn("MyApp", "Example.com")).toBe("myapp.example.com");
});

test("rejects private addresses and long TXT", () => {
  expect(validateRequest({ subdomain: "x", type: "A", content: "192.168.1.1", owner: "a" }).ok).toBe(false);
  expect(validateRequest({ subdomain: "x", type: "AAAA", content: "fd00::1", owner: "a" }).ok).toBe(false);
  expect(validateRequest({ subdomain: "x", type: "AAAA", content: "not:an:ip", owner: "a" }).ok).toBe(false);
  expect(validateRequest({ subdomain: "x", type: "AAAA", content: "2001:db8::1", owner: "a" }).ok).toBe(true);
  expect(validateRequest({ subdomain: "x", type: "TXT", content: "a".repeat(256), owner: "a" }).ok).toBe(false);
});
