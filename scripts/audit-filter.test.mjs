import { test } from "node:test";
import assert from "node:assert/strict";
import { filterAudit } from "./audit-filter.mjs";

const adv = (id, severity, title = id) => ({
  url: `https://github.com/advisories/${id}`,
  severity,
  title,
});

// The shape of the 2026-11-17 report: picomatch, and four packages
// vulnerable only through it.
const picomatchOnly = {
  vulnerabilities: {
    picomatch: { via: [adv("GHSA-fc5q-39xc-vjpf", "high")] },
    fdir: { via: ["picomatch"] },
    tinyglobby: { via: ["fdir", "picomatch"] },
    vite: { via: ["picomatch", "tinyglobby"] },
    vitest: { via: ["picomatch", "tinyglobby", "vite"] },
  },
};

test("an ignored advisory and its dependents do not block", () => {
  const { blocking, seen } = filterAudit(picomatchOnly, new Set(["GHSA-fc5q-39xc-vjpf"]));
  assert.deepEqual(blocking, []);
  assert.ok(seen.has("GHSA-fc5q-39xc-vjpf"));
});

test("the same advisory blocks when it is not ignored", () => {
  const { blocking } = filterAudit(picomatchOnly, new Set());
  assert.equal(blocking.length, 1);
  assert.equal(blocking[0].name, "picomatch");
});

test("another advisory on an ignored package still blocks", () => {
  const report = structuredClone(picomatchOnly);
  report.vulnerabilities.vite.via.push(adv("GHSA-new0-0000-0000", "critical"));
  const { blocking } = filterAudit(report, new Set(["GHSA-fc5q-39xc-vjpf"]));
  assert.deepEqual(
    blocking.map((b) => [b.name, b.id]),
    [["vite", "GHSA-new0-0000-0000"]],
  );
});

test("moderate and low advisories do not block", () => {
  const report = { vulnerabilities: { a: { via: [adv("GHSA-mod", "moderate"), adv("GHSA-low", "low")] } } };
  assert.deepEqual(filterAudit(report, new Set()).blocking, []);
});

test("a gone advisory is not seen, so the gate can say remove it", () => {
  const { seen } = filterAudit({ vulnerabilities: {} }, new Set(["GHSA-fc5q-39xc-vjpf"]));
  assert.equal(seen.has("GHSA-fc5q-39xc-vjpf"), false);
});

test("a cycle in via does not loop", () => {
  const report = { vulnerabilities: { a: { via: ["b"] }, b: { via: ["a", adv("GHSA-x", "high")] } } };
  assert.deepEqual(filterAudit(report, new Set()).blocking.map((b) => b.name), ["b"]);
});

test("an advisory with no URL still blocks", () => {
  const report = { vulnerabilities: { a: { via: [{ source: 1234, severity: "high", title: "no url" }] } } };
  const { blocking } = filterAudit(report, new Set());
  assert.deepEqual(blocking.map((b) => [b.name, b.id]), [["a", "no-id:1234"]]);
});
