// The web half of the audit gate: `npm audit --json` with a short list of
// advisories accepted until a fix exists (docs/DECISIONS.md D-012).
//
//   node scripts/audit-filter.mjs <apps/web>
//
// Fails on any high or critical advisory not in scripts/audit-ignore.json,
// including packages that are vulnerable only through such an advisory's
// dependents. Says when an ignored advisory is gone, so the entry can go too.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const LEVELS = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

const ghsa = (url) => (url || "").split("/").pop();

// report: parsed `npm audit --json` (v2). ignored: a set of GHSA ids.
// Returns { blocking: [{ name, id, severity, title }], seen: Set of ids }.
export function filterAudit(report, ignored, level = "high") {
  const vulns = report.vulnerabilities || {};
  const min = LEVELS[level];
  const seen = new Set();
  const memo = new Map();

  // A package is blocking if it carries an advisory at or above the level
  // that is not ignored, or depends on a blocking package.
  const blockingVia = (name, stack = new Set()) => {
    if (memo.has(name)) return memo.get(name);
    if (stack.has(name)) return [];
    stack.add(name);
    const found = [];
    for (const via of vulns[name]?.via || []) {
      if (typeof via === "string") {
        if (blockingVia(via, stack).length) found.push({ name, via });
      } else {
        const id = ghsa(via.url);
        seen.add(id);
        if (LEVELS[via.severity] >= min && !ignored.has(id)) {
          found.push({ name, id, severity: via.severity, title: via.title });
        }
      }
    }
    stack.delete(name);
    memo.set(name, found);
    return found;
  };

  const blocking = [];
  for (const name of Object.keys(vulns)) {
    for (const f of blockingVia(name)) if (f.id) blocking.push(f);
  }
  return { blocking, seen };
}

function main() {
  const web = process.argv[2] || ".";
  const here = path.dirname(fileURLToPath(import.meta.url));
  const ignore = JSON.parse(readFileSync(path.join(here, "audit-ignore.json"), "utf8"));
  const ignored = new Set(Object.keys(ignore));

  let out;
  try {
    // A fixed command string: npm is npm.cmd on Windows, so it needs a shell.
    out = execSync("npm audit --json", { cwd: web, encoding: "utf8" });
  } catch (err) {
    out = err.stdout; // npm audit exits 1 when it finds anything
  }
  const report = JSON.parse(out);
  if (report.error) {
    console.error(`npm audit failed: ${report.error.summary || JSON.stringify(report.error)}`);
    process.exit(1);
  }

  const { blocking, seen } = filterAudit(report, ignored);
  for (const id of ignored) {
    if (seen.has(id)) console.log(`ignored ${id}: ${ignore[id]}`);
    else console.log(`${id} is no longer reported: remove it from scripts/audit-ignore.json (D-012)`);
  }
  if (blocking.length) {
    for (const b of blocking) console.log(`${b.severity}: ${b.name}: ${b.title} (${b.id})`);
    console.log(`${blocking.length} high or critical advisories`);
    process.exit(1);
  }
  console.log("npm audit: no high or critical advisories outside audit-ignore.json");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
