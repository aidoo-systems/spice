"""Best-effort parsing of an incomplete JSON document.

Used while the model streams: each snapshot of the text so far is closed off
at the latest safe point so the UI can render the plan as it is written.
"""

import json

_CLOSERS = {"{": "}", "[": "]"}


def parse_partial(text: str) -> dict | None:
    """Return the largest valid object prefix of ``text``, or None.

    Walks the text once, remembering every point where truncating is safe
    (right after an opening bracket or before a comma) together with the
    brackets open at that point. Candidates are tried from the end backwards;
    the very end is tried first, closing any unterminated string value.
    """
    stack: list[str] = []
    in_str = False
    esc = False
    # (cut index, closers needed) — cut is exclusive.
    safe: list[tuple[int, str]] = []

    for i, ch in enumerate(text):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch in _CLOSERS:
            stack.append(_CLOSERS[ch])
            safe.append((i + 1, "".join(reversed(stack))))
        elif ch in "}]":
            if not stack:
                return None
            stack.pop()
            safe.append((i + 1, "".join(reversed(stack))))
        elif ch == ",":
            safe.append((i, "".join(reversed(stack))))

    if not stack and not in_str:
        return _loads(text)

    closers = "".join(reversed(stack))
    candidates = [text + ('"' if in_str and not esc else "") + closers]
    candidates += [text[:cut] + c for cut, c in reversed(safe)]
    for cand in candidates:
        result = _loads(cand)
        if result is not None:
            return result
    return None


def _loads(text: str) -> dict | None:
    try:
        value = json.loads(text)
    except ValueError:
        return None
    return value if isinstance(value, dict) else None
