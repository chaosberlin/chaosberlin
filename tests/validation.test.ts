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
