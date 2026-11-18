// Filters `npm audit --json` against advisories accepted until a fix exists
// (docs/DECISIONS.md D-012). The gate runs scripts/audit-gate.mjs, which uses it.

const LEVELS = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

// An advisory with no usable URL still gets an id, so it can never be dropped.
const idOf = (via) => (via.url || "").split("/").pop() || `no-id:${via.source ?? via.title ?? "unknown"}`;

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
        const id = idOf(via);
        seen.add(id);
        // An unknown severity counts as critical rather than being dropped.
        if ((LEVELS[via.severity] ?? LEVELS.critical) >= min && !ignored.has(id)) {
          found.push({ root: true, name, id, severity: via.severity, title: via.title });
        }
      }
    }
    stack.delete(name);
    memo.set(name, found);
    return found;
  };

  const blocking = [];
  for (const name of Object.keys(vulns)) {
    for (const f of blockingVia(name)) if (f.root) blocking.push(f);
  }
  return { blocking, seen };
}
