# Python Request Protection

## What Request Protection Is

Request protection inspects HTTP requests — headers, IP, body — to enforce security rules on API routes and form handlers. Works with FastAPI (async) and Flask (sync).

**Version compatibility:**

- **Python:** ≥ 3.10 (declared in `pyproject.toml`). Older versions will fail to install — warn the user and stop.
- **FastAPI / Flask:** no formal peer dependency — the SDK adapts to whatever request shape is passed (ASGI scope dict, Flask/Werkzeug `Request`, Django `HttpRequest`, or a pre-built `RequestContext`). The SDK's own tests run against `fastapi==0.135.1` and `flask==3.1.3`; very old releases of either may not expose the expected request attributes.

> _Version info last verified against `arcjet` v0.7.0 on **2026-05-20**. Before relying on these numbers, check the `requires-python` field in the current [`pyproject.toml`](https://github.com/arcjet/arcjet-py/blob/main/pyproject.toml) — minimums tend to creep upward over time._

## Installation

Install with whichever package manager the project already uses (`pip install`, `uv add`, `poetry add`, etc.) — don't hand-edit `requirements.txt` with a guessed version like `arcjet>=1.0.0` (that release doesn't exist; current is `>=0.7.0`).

```bash
pip install arcjet
```

Read the installed package's types and docstrings for the full API surface.

## Architecture: Why Things Go Where They Do

### Client(s) at module scope

The Python SDK's `arcjet()` / `arcjet_sync()` constructor takes the full rule set at creation time — there is **no** `with_rule()` chain method on the resulting client (that pattern only exists in the JS SDKs). To apply different rules to different routes, create one client per rule set:

```python
import os
from arcjet import BotCategory, Mode, arcjet, detect_bot, shield, sliding_window

# Read endpoints: shield + bot detection + lenient rate limit
aj_read = arcjet(
    key=os.environ["ARCJET_KEY"],
    rules=[
        shield(mode=Mode.LIVE),
        detect_bot(mode=Mode.LIVE, allow=[BotCategory.SEARCH_ENGINE]),
        sliding_window(mode=Mode.LIVE, interval=60, max=100),
    ],
)

# Write endpoints: same plus a stricter limit
aj_write = arcjet(
    key=os.environ["ARCJET_KEY"],
    rules=[
        shield(mode=Mode.LIVE),
        detect_bot(mode=Mode.LIVE, allow=[BotCategory.SEARCH_ENGINE]),
        sliding_window(mode=Mode.LIVE, interval=60, max=15),
    ],
)
```

For projects with multiple route files, put these clients in a separate `lib/arcjet.py` and import them. For single-file apps, define at the top of the file. Use `arcjet()` for async (FastAPI) and `arcjet_sync()` for sync (Flask). Create clients at module scope only — never inside a handler.

If you only need one rule set across the whole app, a single client is fine.

### protect() in route handlers

Call `protect()` inside each route handler, once per request. Pass the framework's request object directly.

## Choosing Rules

See the "Choosing the Right Rules" section in the main skill for rule selection guidance and rate limiting strategy comparisons. Key framework-specific notes:

- **shield** — always include. No configuration needed.
- **detect_bot** — `allow` and `deny` are mutually exclusive.
- **Rate limits** — use `characteristics` to key by something other than IP.
- **validate_email** — for signup/login forms.
- **detect_sensitive_info** — blocks PII in request bodies.
- **detect_prompt_injection** — for AI endpoints receiving user prompts.
- **filter_request** — block by IP metadata (VPN, Tor, country).

## Framework-Specific protect() Calls

### FastAPI (async)

```python
from fastapi import Request, HTTPException

@app.get("/api/items")
async def list_items(request: Request):
    decision = await aj.protect(request)
    if decision.is_denied():
        if decision.reason_v2.type == "RATE_LIMIT":
            raise HTTPException(status_code=429, detail="Too many requests")
        raise HTTPException(status_code=403, detail="Forbidden")
    # proceed...
```

### Flask (sync)

```python
from flask import request, jsonify

@app.get("/api/items")
def list_items():
    decision = aj.protect(request)
    if decision.is_denied():
        if decision.reason_v2.type == "RATE_LIMIT":
            return jsonify(error="Too many requests"), 429
        return jsonify(error="Forbidden"), 403
    # proceed...
```

## Decision Handling

`decision.is_denied()` means a LIVE rule triggered a denial. Map `decision.reason_v2.type` to HTTP status codes, but **only branch on reasons that produce a different response** — skip arms that would just return the same status as the default 403:

- `"RATE_LIMIT"` → 429
- `"EMAIL"` → 400
- `"SENSITIVE_INFO"` → 400
- `"PROMPT_INJECTION"` → 400
- everything else (`"BOT"`, `"SHIELD"`, `"FILTER"`, fallback) → default 403

A branch that returns 403 for SHIELD when the default already returns 403 is dead code; drop it.

`decision.is_error()` means something went wrong during rule evaluation but the SDK failed open. Log it and allow the request.

## Deprecations

As of `arcjet` 0.7.0, the request-based SDK carries a few deprecated bits. New code should avoid them; existing code in the project that uses them should be migrated when convenient.

- **`decision.reason` / `result.reason` → use `decision.reason_v2` / `result.reason_v2`.** The legacy `reason` accessor returns a tagged-union helper (`reason.is_rate_limit()`, etc.) and is marked `@deprecated`. `reason_v2` returns a typed discriminated union — branch on `reason_v2.type` (`"RATE_LIMIT"`, `"BOT"`, etc.) and read typed fields directly (`reason_v2.remaining`, `reason_v2.spoofed`). A TODO in the SDK notes the name `reason_v2` is itself transitional — in a future major it's planned to fold back into `reason`, but until then `reason_v2` is the right call.
- **`detect_prompt_injection(threshold=...)`** — the `threshold` parameter is no longer respected by the server and will be removed. Drop it from new configs; remove it from existing configs when touching them. The detection runs without it.
- **`PromptInjectionReason.score`** — the `score` field on the reason returned for prompt-injection denials is no longer populated meaningfully and will be removed. Don't read it; rely on `reason_v2.type == "PROMPT_INJECTION"` instead.
- **`arcjet._decision.Reason`** — internal type; use `arcjet._dataclasses.Reason` (re-exported as `arcjet.Reason`) if you need the type annotation. Most callers won't touch this directly.

> _Deprecations last verified against `arcjet` v0.7.0 on **2026-05-20**. Before relying on the items above, grep the installed package for new `@deprecated` markers — see [`src/arcjet/_decision.py`](https://github.com/arcjet/arcjet-py/blob/main/src/arcjet/_decision.py) and [`src/arcjet/_dataclasses.py`](https://github.com/arcjet/arcjet-py/blob/main/src/arcjet/_dataclasses.py)._

## Key Patterns

- Rules that need extra input at protect() time: `token_bucket` needs `requested=N`, `validate_email` needs `email="..."`, `detect_sensitive_info` needs `sensitive_info_value="..."`, `detect_prompt_injection` needs `detect_prompt_injection_message="..."`.
- Every rule accepts `mode=Mode.LIVE` or `mode=Mode.DRY_RUN`. Start with DRY_RUN to verify rules match expected traffic.
- For existing projects, check for an existing Arcjet client before creating a new one — add the new rule to the existing client's `rules=[...]` list, or define a sibling client with the rules you need.
