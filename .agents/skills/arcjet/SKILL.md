---
name: arcjet
license: Apache-2.0
description: Add Arcjet security protection to any code path — HTTP route handlers, API endpoints, AI agent tool calls, MCP servers, background jobs, and queue workers. Covers rate limiting, bot detection, email validation, prompt injection detection, sensitive information blocking, and abuse prevention. Works across Next.js, Express, Fastify, SvelteKit, Remix, Bun, Deno, NestJS, FastAPI, Flask, and non-HTTP contexts. Use this skill when the user wants to add security, rate limiting, bot protection, or abuse prevention to any part of their application — whether they say "protect my API," "rate limit tool calls," "block bots," "secure my endpoint," "add security to my MCP server," or "prevent abuse" without mentioning Arcjet specifically.
metadata:
  author: arcjet
---

# Arcjet

## Contents

- [Add Arcjet Protection to Your App](#add-arcjet-protection-to-your-app)
- [Choosing Protections](#choosing-protections)
- [Resources](#resources)

## Add Arcjet Protection to Your App

### Checklist

- [ ] **Step 1:** Verify language support (JS/TS or Python only — stop if unsupported)
- [ ] **Step 2:** Connect to Arcjet platform (CLI → MCP → manual dashboard)
- [ ] **Step 3:** Detect protection type and read the appropriate reference file
- [ ] **Step 4:** Implement protection (separate client file, correct SDK, correct patterns)
- [ ] **Step 5:** Verify decisions are firing correctly (trigger a real call, then check CLI / MCP / dashboard)

### Step 1: Check Language Support

If the project's server-side code is not JavaScript, TypeScript, or Python → tell the user in chat that Arcjet doesn't support their language yet. Don't modify the project, don't write a `NOTES.md`, don't invent a package. Just say it and stop.

### Step 2: Get an ARCJET_KEY into the project's env file

Before writing any code, the project needs a real `ARCJET_KEY` in its env file. Don't write Arcjet code first and "leave the key as a TODO" — that just produces dead code. Get the key first, then wire it up.

**In order of preference:**

1. **Arcjet CLI** (preferred). Check whether you're already signed in, then retrieve a key.
2. **Arcjet MCP server** (endpoint: `https://api.arcjet.com/mcp`) — for clients with built-in MCP. See [references/mcp.md](references/mcp.md).
3. **Manual** (last resort): tell the user to grab a key from https://app.arcjet.com.

#### CLI bootstrap (the normal path)

```bash
npx -y @arcjet/cli@latest auth status        # is the user already signed in?
# if not signed in:
npx -y @arcjet/cli@latest auth login         # browser device flow, see references/cli.md

npx -y @arcjet/cli@latest teams list --output json --fields id,name
npx -y @arcjet/cli@latest sites list --team-id <team_id> --output json --fields id,name
# if no suitable site exists:
npx -y @arcjet/cli@latest sites create --team-id <team_id> --name "<project>"

npx -y @arcjet/cli@latest sites get-key --site-id <site_id> --output json --fields key
```

Write the `key` value to the project's env file as `ARCJET_KEY=ajkey_...`. Match whatever the project already does — filename, `.env.example` companion, `.gitignore` entry. If the project doesn't have a convention yet, default to whatever the framework expects and add the env file to `.gitignore`. Never hardcode the key in source.

See [references/cli.md](references/cli.md) for install options beyond `npx`, agent-mode flags, and the full command reference.

#### Install the SDK with the project's package manager

Once you know which SDK you need (Step 3 below), install it via the package manager the project already uses — `npm install`, `pnpm add`, `yarn add`, `bun add`, `pip install`, `uv add`, `poetry add`, etc. Don't hand-edit `package.json` / `requirements.txt` and guess a version: typed versions tend to be wrong (`arcjet>=1.0.0` doesn't exist for the Python SDK; `^1.0.0` is stale for `@arcjet/next`), and the lockfile won't get updated. Let the package manager pick the real version and pin it.

### Step 3: Detect Protection Type and Read Reference

Determine which protection type applies:

| | **Request-based** | **Guard** |
|---|---|---|
| **When to use** | Code has an HTTP request object (Express `req`, Next.js `Request`, FastAPI `Request`, etc.) | No HTTP request (tool calls, MCP handlers, queue workers, background jobs, agent loops) |
| **JS/TS SDK** | `@arcjet/next`, `@arcjet/node`, `@arcjet/fastify`, etc. | `@arcjet/guard` (>= 1.4.0) |
| **Python SDK** | `arcjet` (with `arcjet()` / `arcjet_sync()`) | `arcjet` (with `launch_arcjet()` / `launch_arcjet_sync()`) |
| **Entry point** | `protect(request)` | `guard(label, rules)` |

A single project can use both — e.g. request-based on API routes and guard on agent tool calls.

**Common misclassifications to watch for:**

- **MCP servers**: the word "server" is misleading. MCP tools don't receive HTTP requests — they're invoked by an MCP client over stdio or SSE. Use **Guard**, not request-based.
- **Background jobs / queue consumers**: no HTTP request at the protection site. Use **Guard**.
- **Server actions / RPC over HTTP** (Next.js server actions, tRPC, etc.): there *is* an HTTP request underneath. Use **request-based**.
- **Agent tool calls inside a request handler**: if you want to limit per-user-per-route, request-based is fine. If you want per-tool budgets independent of any HTTP boundary, use Guard at the tool call site.

Read the appropriate reference:

- **Request-based JS/TS**: [references/requests_javascript.md](references/requests_javascript.md)
- **Request-based Python**: [references/requests_python.md](references/requests_python.md)
- **Guard JS/TS**: [references/guards_javascript.md](references/guards_javascript.md)
- **Guard Python**: [references/guards_python.md](references/guards_python.md)

These references explain architectural decisions and patterns that can't be inferred from the source code alone. For exact API signatures, read the installed package's types and doc comments.

### Step 4: Implement Protection

Follow the patterns in the reference file from Step 3. Key principles:

#### Request-based (HTTP routes):
- Shared Arcjet client in its own file with `shield()` as a base rule.
- `withRule()` to layer route-specific rules.
- Call `protect()` inside each route handler (not in app-level middleware), once per request.
- Map `decision.isDenied()` reasons to HTTP responses. Only branch on reasons that produce a *different* response — there's no point in an `else if (reason.isShield())` arm that returns the same status as the default 403.
- Put `characteristics: ["userId"]` (or similar) on the specific rule that needs it, not on the global client.

#### Guard (non-HTTP code):
- Client at module scope with `launchArcjet()` (JS) or `launch_arcjet()` / `launch_arcjet_sync()` (Python — pick async vs sync to match the function you're protecting).
- Rules declared at module scope. Give each rule a meaningful `label` so they show up usefully in the dashboard.
- **One `guard()` call per specific operation, with a hardcoded `label`** like `"tools.get-weather"` or `"queue.summarize"`. Put it wherever you already know exactly what's happening — that can be inside the tool/task function itself, or right before calling it from a dispatch arm. Both work; pick whichever makes error propagation cleaner. What to avoid is the generic-dispatcher pattern (`handleToolCall(name, args)` calling `guard(label=f"tools.{name}")`) — interpolated labels break grep and produce messy dashboard groupings.
- **Label naming rules**: labels are validated server-side as slugs — **lowercase letters, digits, dash (`-`), and dot (`.`) only**, must start and end with a letter or digit, max 256 bytes. Underscores, uppercase, and slashes are rejected even though some SDK TSDoc comments claim otherwise. Use `tools.get-weather`, not `tools.get_weather` or `Tools.GetWeather`.
- **Pass `metadata` on the `guard()` call** when you have useful auditing context (`metadata={"user_id": user_id, "request_id": ...}`). It appears in the dashboard alongside the decision.
- **Branch on which rule denied**, not just on `DENY`. Use the per-rule accessors (e.g. `userLimit.deniedResult(decision)` for retry-after info) or the flat reason string (`decision.reason === "PROMPT_INJECTION"` in JS, `decision.reason == "PROMPT_INJECTION"` in Python) so the error you surface to the caller tells them *why* — "rate limited, retry in 12s" vs "input flagged as prompt injection" — instead of a generic "blocked." Note: guard's `decision.reason` is a flat string literal, unlike the request-based SDK's tagged-helper API.
- Every rate-limit rule needs a `key` and a `bucket`:
  - **Per-user context** (agent tool calls inside a logged-in session, queue jobs with a `user_id`): use the user/session id as the key.
  - **No user context** (stdio MCP server, single-tenant worker): use a stable identifier you control — instance id, deployment name, or a literal like `"default"`. Just be explicit.
- Check `decision.conclusion === "DENY"` (JS) or `decision.conclusion == "DENY"` (Python) before proceeding.

#### Conventions outside the Arcjet flow

For everything that *isn't* an Arcjet-specific decision — dev scripts, file/module layout, named-vs-default exports, comment style, env-file naming, type hints, error class patterns — match the project's existing conventions. If the project has no convention yet, default to modern best practice for the language. This skill is opinionated about *where Arcjet goes* and *how its API is used*; it shouldn't reach further than that.

### Step 5: Verify Decisions

After wiring up protection, confirm it's actually firing. Three steps:

**1. Type-check / build first.** Run `tsc`, `next build`, `python -m py_compile`, or whatever check command the project uses. Catches wrong imports, wrong rule names, and stale type signatures before the user does.

**2. Trigger a real call so a decision exists to check.** Without one, the dashboard and CLI are empty and you can't tell whether protection is actually wired up.

- **Request-based**: start the dev server (`npm run dev`, `uvicorn main:app --reload`, etc.) and `curl` the protected route. To trip a rate limit, loop the call: `for i in {1..50}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/your-route; done` — you should see a mix of 200s and 429s once the limit is hit.
- **Guard**: invoke the protected function directly. A tiny script that imports the tool/task function and calls it twice (once to allow, once to exceed the limit) is usually the fastest path — e.g. `node -e "import('./src/tools.js').then(m => m.getWeather('SF', 'user_123'))"` or `python -c "from worker import process_job; process_job({'user_id': 'user_123'})"`. For MCP servers, send a tool call via the MCP client / inspector. For queue workers, enqueue a real job. Don't try to test guard by `curl`ing anything — there's no HTTP surface.

**3. Confirm the decision in the Arcjet platform.**

- **CLI**: `npx -y @arcjet/cli@latest requests list --site-id <id>` (request-based) or `... guards list --site-id <id>` (Guard)
- **MCP**: `list-requests` / `list-guards`
- **Dashboard**: https://app.arcjet.com

For deeper investigation: `arcjet requests explain --site-id <id> --request-id <id>` or `arcjet guards explain --site-id <id> --guard-id <id>`.

If you can't run the app in the current environment, tell the user exactly what to do (which command to run, what to look for in the output) instead of silently skipping verification.

### Gotchas

- **Wrong SDK**: `@arcjet/guard` is for non-HTTP code. `@arcjet/node` / `@arcjet/next` / etc. are for HTTP routes. Using the wrong one is the most common mistake.
- **Wrong placement**: `protect()` must not be called in Express middleware or Next.js middleware. Call it inside each route handler.
- **Wrong layer for `guard()`**: don't put `guard()` in a `handleToolCall(name, args)` dispatcher — put it inside each specific tool / task function so the `label` and metadata can be hardcoded.
- **Hand-edited dependency manifests**: don't append `"arcjet": "^1.0.0"` to `package.json` or `arcjet>=1.0.0` to `requirements.txt`. Run the project's package manager so the version is real and the lockfile updates.
- **Double-counting**: Calling `protect()` or `guard()` multiple times for the same operation counts against rate limits multiple times.
- **Never hardcode `ARCJET_KEY`** — always use environment variables.

## Choosing Protections

When you need to pick which rules address the user's concern — bot abuse, rate limits, prompt injection, signup spam, PII, IP filtering, etc. — load [references/choosing_protections.md](references/choosing_protections.md). It maps common problems to Arcjet rules and explains the tradeoffs between strategies (e.g. token bucket vs sliding window). The mapping doesn't need to be in your context for the rest of the workflow.

## Resources

For exact API signatures, parameter names, and the full set of rules and helpers, read the installed SDK's source — types and docstrings are the source of truth:

- **Python SDK**: https://github.com/arcjet/arcjet-py — `arcjet` package (request protection) and `arcjet.guard` subpackage (non-HTTP guard).
- **JavaScript / TypeScript SDK**: https://github.com/arcjet/arcjet-js — monorepo with framework-specific packages (`@arcjet/next`, `@arcjet/node`, `@arcjet/fastify`, `@arcjet/sveltekit`, `@arcjet/guard`, etc.).
- **Docs**: https://docs.arcjet.com — narrative guides, blueprints, and product reference.
- **Dashboard**: https://app.arcjet.com — sites, keys, and decision history.
