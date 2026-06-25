# JavaScript/TypeScript Guard

## What Guard Is

Guard protects code paths that don't have an HTTP request — tool calls, agent loops, MCP handlers, queue consumers, background jobs. It's a separate SDK (`@arcjet/guard`) from the HTTP request SDKs (`@arcjet/node`, `@arcjet/next`, etc.) because there's no request object to inspect. Instead, you pass explicit context (labels, keys, text to scan) at each call site.

## Installation

Install with whichever package manager the project already uses (`npm install`, `pnpm add`, `yarn add`, `bun add`) — don't hand-edit `package.json`:

```bash
npm install @arcjet/guard
```

Requires `@arcjet/guard` ≥ 1.4.0. The runtime minimums are stricter than the request adapters (which need only Node 20+):

| Runtime            | Minimum version          |
| ------------------ | ------------------------ |
| Node.js            | 22.18.0                  |
| Bun                | 1.3.0                    |
| Deno               | `stable` / `lts`         |
| Cloudflare Workers | compat date `2025-09-01` |

The correct transport is picked automatically via conditional exports (HTTP/2 on Node and Bun, fetch-based on Deno and Workers) — import from `@arcjet/guard` either way. If the project is on Node 20/21 or an older Bun/Workers compat date, warn the user and stop until the runtime is bumped.

Read the installed package's types and doc comments for the full API surface.

> _Runtime support last verified against `@arcjet/guard` v1.4.0 on **2026-05-20**. Before relying on these numbers, check the [Runtime support section](https://github.com/arcjet/arcjet-js/tree/main/arcjet-guard#runtime-support) of the current README — minimums tend to creep upward over time._

## Architecture: Why Things Go Where They Do

### Client at module scope

```typescript
import { launchArcjet } from "@arcjet/guard";
const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

The client holds a persistent HTTP/2 connection to the Arcjet decision service. Creating it inside a function means a new connection per call — slow and wasteful.

### Rules at module scope

Rate limit state is tracked server-side by the combination of `bucket` and other configuration properties, so recreating rules per call won't break counting. However, defining rules at module scope is still best practice because:

- It makes the per-rule result accessors (e.g. `userLimit.deniedResult(decision)`) work — you need a stable reference to call methods on.
- It avoids unnecessary object allocation on every invocation.
- It keeps rule configuration visible and centralized.

```typescript
import { tokenBucket, detectPromptInjection } from "@arcjet/guard";

// WORKS but awkward — no stable reference for result inspection
function handleTool() {
  const limit = tokenBucket({ /* config */ }); // hard to call limit.deniedResult() later
}

// BETTER — declare rules at module scope, dynamically choose which to apply
const adminLimit = tokenBucket({
  label: "admin.tool-calls",
  bucket: "admin-tools",
  refillRate: 100,
  intervalSeconds: 60,
  maxTokens: 1000,
});
const memberLimit = tokenBucket({
  label: "member.tool-calls",
  bucket: "member-tools",
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 100,
});
const piRule = detectPromptInjection();

function toolRules(userId: string, role: string, text: string) {
  const limit = role === "admin" ? adminLimit : memberLimit;
  return [
    limit({ key: userId, requested: 1 }),
    piRule(text),
  ];
}
```

### guard() at the operation, with a hardcoded label

Place `guard()` wherever you already know exactly what operation is happening. That's typically inside the specific tool/task function, but the dispatch arm right before the call works equally well — sometimes it gives cleaner error propagation:

```typescript
// Option A: guard inside the tool function
async function getWeather(city: string, userId: string) {
  const decision = await arcjet.guard({
    label: "tools.get-weather",
    rules: [toolCallLimit({ key: userId, requested: 1 })],
    metadata: { userId },
  });
  if (decision.conclusion === "DENY") throw new Error(decision.reason);
  // ...do the work
}

// Option B: guard at the dispatch site, right before calling the tool
switch (toolName) {
  case "get_weather": {
    const decision = await arcjet.guard({
      label: "tools.get-weather",
      rules: [toolCallLimit({ key: userId, requested: 1 })],
      metadata: { userId },
    });
    if (decision.conclusion === "DENY") throw new Error(decision.reason);
    return getWeather(args.city);
  }
  // ...
}

// Avoid: generic dispatcher with interpolated label
async function handleToolCall(name: string, args: Record<string, unknown>, userId: string) {
  const decision = await arcjet.guard({ label: `tools.${name}`, rules: [/* ... */] }); // 👎
}
```

The `label` should be a hardcoded string — `"tools.get-weather"`, not `` `tools.${name}` ``. Hardcoded labels stay greppable, and the dashboard groups by them; interpolation produces a sea of distinct-looking calls instead of one bucket per operation.

**Label naming rules (often surprising):** labels are validated server-side as slugs — **lowercase letters, digits, dash (`-`), and dot (`.`) only**, must start and end with a letter or digit, max 256 bytes. Underscores, uppercase, and forward slashes are rejected even though the `GuardOptions.label` TSDoc lists them as allowed. Use `tools.get-weather`, not `tools.get_weather`. Same rules apply to rate-limit `bucket` names.

Pass `metadata` whenever you have useful auditing context (`{ userId, requestId }`) — it shows up in the dashboard alongside the decision and makes debugging much easier later.

## Choosing a Rate Limit Strategy

See the "Rate Limiting Strategies" section in the main skill for a comparison of token bucket vs fixed window vs sliding window.

Key guard-specific notes: all rate limit rules require a `key` parameter at call time (user ID, session ID, API key) — without it, limits are global across all callers. They also need a `bucket` name to avoid collisions between different rules.

**Picking a `key` when there's no user:** Some call sites have no per-user context — e.g. a stdio MCP server where the client is the only caller, or a single-tenant queue worker. Don't try to fake it by passing an empty string. Use whatever identifier actually matches the scope of the limit:
- single-tenant worker → the deployment name or env (`process.env.HOSTNAME ?? "default"`)
- stdio MCP server → the MCP client/session id if exposed by the SDK, otherwise the process identity
- shared limit across all callers → a stable literal like `"global"`, and add a comment explaining why
The point is to be intentional. A wrong-but-explicit `key` is much easier to fix than a missing one.

## Content Scanning Rules

### Prompt injection detection

Use `detectPromptInjection()` on any untrusted text before it reaches a model or is used as a tool argument. This catches jailbreaks, role-play escapes, and instruction overrides. Also useful on tool call *results* when the tool fetches content from untrusted sources.

### Sensitive information detection

Use `localDetectSensitiveInfo()` to block PII from entering or leaving the system (e.g. users sending credit card numbers, or tool outputs leaking email addresses). The scan runs locally via WASM — raw text never leaves the SDK, which matters for compliance.

## Decision Handling

`decision.conclusion` is either `"ALLOW"` or `"DENY"`. Always check before proceeding.

For useful error messages, branch on **which rule** denied — not just on `DENY`. Each rule defined at module scope exposes a `.deniedResult(decision)` accessor that returns rule-specific info (e.g. `resetAtUnixSeconds` for rate limits). Use this to give the caller something actionable:

```typescript
if (decision.conclusion === "DENY") {
  const rateLimited = toolCallLimit.deniedResult(decision);
  if (rateLimited) {
    throw new Error(`rate limited — retry after unix ${rateLimited.resetAtUnixSeconds}`);
  }
  if (decision.reason === "PROMPT_INJECTION") {
    throw new Error("input flagged as prompt injection");
  }
  throw new Error("blocked");
}
```

`decision.reason` is a flat string when `conclusion === "DENY"` — one of `"RATE_LIMIT"`, `"PROMPT_INJECTION"`, `"SENSITIVE_INFO"`, `"CUSTOM"`, `"ERROR"`, `"NOT_RUN"`, `"UNKNOWN"`. (On ALLOW it's `undefined`.) Read the types on the decision object for the full structure.

`decision.hasError()` means something went wrong during rule evaluation (service unreachable, rule execution failure, etc.) but the SDK failed open. Log it but don't block the user.

## Key Patterns

- Pass `signal` (an `AbortSignal`) on the `.guard()` call when one is available (e.g. from the caller or a timeout) so guard respects cancellation. `timeoutSeconds` is also available for a simple deadline.
- Use `metadata` for analytics/auditing context (user ID, session, etc.) — this appears in the dashboard.
- The `label` string should identify the operation (e.g. `"tools.get-weather"`, `"mcp.query-database"`) — it appears in the dashboard and helps you understand which operations are being rate limited or blocked.
