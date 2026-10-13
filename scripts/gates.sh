#!/usr/bin/env bash
# studio - quality gates for SPICE: a FastAPI backend (apps/api) and a Next.js
# frontend (apps/web) in one repo. Repo-local runner built from the studio's
# python-service and web-app profiles; honours the gate contract in
# studio/profiles/README.md. The docs gate is the shared one, verbatim.
# Runs cheapest-first. Exit 0 only when every selected gate passes.
#
#   scripts/gates.sh            # all gates
#   scripts/gates.sh tests      # one gate
#   SKIP_SLOW=1 scripts/gates.sh
#
# Gates: lint, format, tests (API) - types, unit, build, e2e (web) - audit (both) - docs.
# The evals are not a gate: they call the real model, cost money and are not
# deterministic. CI runs them when it has a key (docs/DECISIONS.md D-006).

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
ROOT="$PWD"
API="$ROOT/apps/api"
WEB="$ROOT/apps/web"

ONLY="${1:-}"
NAME="$(basename "$PWD")"

# A workspace-local Playwright browser install (Windows) is used when present.
[ -d "$WEB/.playwright" ] && export PLAYWRIGHT_BROWSERS_PATH="$WEB/.playwright"

# The interpreter the gates run on. The repo's own venv wins, because SPICE pins a
# different ruff from the rest of the suite and the machine-wide Python is shared.
# Otherwise: the first that can start a child once its own stdin has been redirected,
# which pytest does on every run. (2026-10-13: the install manager's python3.exe
# launcher fails that with "[WinError 6] The handle is invalid", so the tests gate
# failed on the machine, not the code; the interpreter it starts is fine.)
PY_PROBE='import os, subprocess, sys
os.dup2(os.open(os.devnull, os.O_RDONLY), 0)
subprocess.run([sys.executable, "-c", ""], capture_output=True, check=True)'
PY="" PY_TRIED=()
for cand in "$API/.venv/Scripts/python.exe" "$API/.venv/bin/python"; do
  [ -x "$cand" ] || continue
  PY_TRIED+=("$cand")
  if "$cand" -c "$PY_PROBE" >/dev/null 2>&1; then PY="$cand"; break; fi
done
if [ -z "$PY" ]; then
  for name in python python3 py; do
    found="$(command -v "$name" 2>/dev/null)" || continue
    # the command itself, then the interpreter it names (what a launcher starts)
    for cand in "$found" "$("$found" -c 'import sys; print(sys.executable)' 2>/dev/null | tr -d '\r')"; do
      [ -n "$cand" ] || continue
      PY_TRIED+=("$cand")
      if "$cand" -c "$PY_PROBE" >/dev/null 2>&1; then PY="$cand"; break 2; fi
    done
  done
fi

FAILED=()
run_gate() {
  local name="$1"; shift
  [ -n "$ONLY" ] && [ "$ONLY" != "$name" ] && return 0
  local start; start=$(date +%s)
  local out; out=$("$@" 2>&1); local code=$?
  local secs=$(( $(date +%s) - start ))
  if [ $code -eq 0 ]; then
    printf '  [PASS] %-10s (%ss)\n' "$name" "$secs"
  else
    printf '  [FAIL] %-10s (%ss)\n' "$name" "$secs"
    echo "$out" | tail -40 | sed 's/^/      /'
    FAILED+=("$name")
  fi
}
skip() {
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return 0
  printf '  [SKIP] %-10s (%s)\n' "$1" "$2"
}

echo
echo "studio gates - $NAME"
echo

# ---------------------------------------------------------------- API ------

# Desk and CI must lint and format with the same ruff: there is no ruff config,
# so the rule set is whatever that release's defaults are.
ruff_pinned() {
  local want have
  want="$(grep -oE '^ruff==[0-9.]+' "$API/requirements-dev.txt" | cut -d= -f3)"
  have="$("$PY" -m ruff --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
  if [ -n "$want" ] && [ "$want" != "$have" ]; then
    echo "ruff ${have:-not installed} here, but apps/api/requirements-dev.txt pins $want, which is what CI runs."
    echo "This is the machine, not the code. Make the repo's venv:"
    echo "  python -m venv apps/api/.venv && apps/api/.venv/Scripts/python -m pip install -r apps/api/requirements-dev.txt"
    return 1
  fi
}
api_lint()   { ruff_pinned && cd "$API" && "$PY" -m ruff check .; }
api_format() { ruff_pinned && cd "$API" && "$PY" -m ruff format --check .; }
api_tests()  {
  local sep=":"; case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) sep=";";; esac
  cd "$API" && PYTHONPATH="../../packages${sep}." "$PY" -m pytest -q --tb=short
}

# No interpreter is the machine's fault, and is said as that: never as failed tests.
if [ -z "$PY" ]; then
  echo "  [FAIL] python     (0s)"
  echo "      No Python here can start a child process once its stdin is redirected, so the API gates can't run."
  echo "      This is the machine, not the code. Tried: ${PY_TRIED[*]:-nothing: no python3, python or py on PATH}"
  FAILED+=("python")
else
  run_gate lint   api_lint
  run_gate format api_format
  run_gate tests  api_tests
fi

# ---------------------------------------------------------------- web ------

WEB_OK=1
if [ ! -d "$WEB/node_modules" ]; then
  echo "  [FAIL] node       (0s)"
  echo "      apps/web/node_modules is missing - run 'npm ci' in apps/web first."
  FAILED+=("node"); WEB_OK=0
fi
web_npm() { cd "$WEB" && npm run --silent "$@"; }

# Playwright reuses whatever already answers on 3737 (reuseExistingServer outside
# CI), so a dev server left running from another checkout would be the thing
# tested, and the gate would pass or fail on someone else's code.
web_e2e() {
  if node -e "require('net').connect(3737,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
    echo "Something is already listening on 127.0.0.1:3737. Playwright would test that server, not this tree."
    echo "Stop it and run the gate again."
    return 1
  fi
  web_npm test:e2e
}

if [ "$WEB_OK" = "1" ]; then
  run_gate types web_npm typecheck
  run_gate unit  web_npm test
  run_gate build web_npm build
fi

# e2e and audit are slow and rarely the thing that just broke, so they run
# last. SKIP_SLOW keeps the inner dev loop tight; never use it to land.
check_audit() {
  local code=0
  if command -v pip-audit >/dev/null 2>&1; then
    pip-audit --strict --progress-spinner off -r "$API/requirements-dev.txt" || code=1
  else
    echo "pip-audit not installed: the Python half was not audited"; code=1
  fi
  if [ "$WEB_OK" = "1" ]; then
    (cd "$WEB" && npm audit --audit-level=high) || code=1
  fi
  return $code
}
if [ "${SKIP_SLOW:-0}" != "1" ]; then
  [ "$WEB_OK" = "1" ] && run_gate e2e web_e2e
  run_gate audit check_audit
else
  skip e2e "SKIP_SLOW"; skip audit "SKIP_SLOW"
fi

# Docs gate: a roadmap row marked Complete must carry acceptance evidence.
check_docs() {
  local problems=0
  for doc in README.md docs/CURRENT_SPRINT.md docs/ROADMAP.md; do
    [ -f "$doc" ] || continue
    local dir; dir="$(dirname "$doc")"
    while IFS= read -r target; do
      [ -z "$target" ] && continue
      local resolved="$target"
      [ "$dir" != "." ] && resolved="$dir/$target"
      if [ ! -f "$resolved" ]; then
        echo "$doc -> missing link target '$target'"; problems=$((problems + 1))
      fi
    done < <(grep -oE '\]\([^)#:]+\.md' "$doc" 2>/dev/null | sed 's/^](//')
  done
  # The sprint file is the resume point; if source has moved on without it,
  # the next session inherits a false account of where the work stands.
  if [ -f docs/CURRENT_SPRINT.md ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local claimed last_src
    claimed=$(head -20 docs/CURRENT_SPRINT.md | grep -oE '^Last updated:[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}' | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    # Source commits only - a docs-only commit touching this very line must not
    # make the file look stale against itself.
    last_src=$(git log -1 --format=%ad --date=short -- . ':(exclude)docs' ':(exclude)*.md' 2>/dev/null)
    if [ -n "$claimed" ] && [ -n "$last_src" ] && [[ "$last_src" > "$claimed" ]]; then
      echo "CURRENT_SPRINT.md claims $claimed but source changed $last_src - the resume point is stale"
      problems=$((problems + 1))
    fi
  fi

  # 'Complete' is a claim about evidence, not about code having been written.
  # The evidence column is located from each table's header, not a fixed index:
  # roadmaps carry either 4 columns or 5 (with 'Gate'), and a hardcoded index
  # silently reads the wrong column instead of failing. The whole file is walked
  # rather than grepping Complete rows, because the header must be seen first.
  if [ -f docs/ROADMAP.md ]; then
    while IFS= read -r problem; do
      echo "$problem"
      problems=$((problems + 1))
    done < <(awk -F'|' '
      /^[[:space:]]*\|/ {
        for (i = 1; i <= NF; i++) gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i)
        hdr = 0
        for (i = 1; i <= NF; i++) {
          if (tolower($i) ~ /^acceptance/ || tolower($i) == "evidence") { ev = i; hdr = 1 }
          if (tolower($i) == "id") idc = i
        }
        if (hdr) next
        done_row = 0
        for (i = 1; i <= NF; i++) if ($i == "Complete") done_row = 1
        if (!done_row) next
        if (ev == 0) {
          print "ROADMAP: a Complete row appears before any header naming an acceptance column"
          next
        }
        if (NF < ev || $ev == "") {
          id = (idc > 0 && NF >= idc) ? $idc : "?"
          printf "ROADMAP: %c%s%c is Complete with no acceptance evidence\n", 39, id, 39
        }
      }
    ' docs/ROADMAP.md 2>/dev/null)
  fi
  [ "$problems" -eq 0 ]
}
cd "$ROOT" || exit 1
run_gate docs check_docs

echo
echo "----------------------------------------------------------"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "GATES FAILED: ${FAILED[*]}"
  echo
  exit 1
fi
echo "All gates passed."
echo
exit 0
