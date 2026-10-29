import { test, expect } from "bun:test";
import { authorize, MAX_NAMES_PER_OWNER } from "../src/permissions";
import { parseRequestText } from "../src/store";
import { requestToYaml, validateRequest } from "../src/validation";

const alice = { subdomain: "alice", type: "CNAME", content: "alice.github.io", owner: "alice", collaborators: ["bob"] };
const messages = (p: { message: string }[]) => p.map((x) => x.message).join(" | ");

test("anyone can add a name they own", () => {
  expect(authorize("carol", [{ file: "carol.yaml", after: { owner: "Carol" } }], 1)).toEqual([]);
  expect(messages(authorize("carol", [{ file: "x.yaml", after: { owner: "alice" } }], 0))).toContain("owner must be your GitHub username");
});

test("nobody but the owner can delete", () => {
  expect(authorize("alice", [{ file: "alice.yaml", before: alice }], 0)).toEqual([]);
  expect(messages(authorize("bob", [{ file: "alice.yaml", before: alice }], 0))).toContain("only the owner (alice) can delete");
  expect(messages(authorize("mallory", [{ file: "alice.yaml", before: alice }], 0))).toContain("only the owner (alice) can delete");
});

test("strangers cannot edit, collaborators can edit records only", () => {
  const edited = { ...alice, content: "new.example.com" };
  expect(messages(authorize("mallory", [{ file: "alice.yaml", before: alice, after: edited }], 0))).toContain("not the owner");
  expect(authorize("bob", [{ file: "alice.yaml", before: alice, after: edited }], 0)).toEqual([]);
  expect(messages(authorize("bob", [{ file: "alice.yaml", before: alice, after: { ...alice, collaborators: ["bob", "mallory"] } }], 0))).toContain("only the owner (alice) can change collaborators");
  expect(messages(authorize("bob", [{ file: "alice.yaml", before: alice, after: { ...alice, owner: "bob", collaborators: [] } }], 0))).toContain("changing the owner needs a maintainer");
});

test("owner can manage collaborators but not transfer", () => {
  expect(authorize("alice", [{ file: "alice.yaml", before: alice, after: { ...alice, collaborators: [] } }], 1)).toEqual([]);
  expect(messages(authorize("alice", [{ file: "alice.yaml", before: alice, after: { ...alice, owner: "bob", collaborators: [] } }], 1))).toContain("needs a maintainer");
});

test("a file with no valid owner on main is maintainer-only", () => {
  expect(messages(authorize("alice", [{ file: "x.yaml", before: null, after: alice }], 1))).toContain("only a maintainer");
});

test("quota applies when adding names", () => {
  expect(messages(authorize("carol", [{ file: "c.yaml", after: { owner: "carol" } }], MAX_NAMES_PER_OWNER + 1))).toContain("at most");
  expect(authorize("carol", [{ file: "c.yaml", before: { owner: "carol" }, after: { owner: "carol" } }], MAX_NAMES_PER_OWNER + 1)).toEqual([]);
});

test("YAML round trip and size cap", () => {
  const v = validateRequest(alice);
  expect(v.ok).toBe(true);
  const text = requestToYaml((v as { value: object }).value);
  expect(validateRequest(parseRequestText(text))).toEqual(v);
  expect(() => parseRequestText("a: " + "x".repeat(5000))).toThrow();
  expect(validateRequest({ ...alice, collaborators: ["alice"] }).ok).toBe(false); // owner can't also be a collaborator
  expect(validateRequest({ ...alice, collaborators: ["bob", "BOB"] }).ok).toBe(false);
  expect(validateRequest({ ...alice, extra: 1 }).ok).toBe(false);
});
