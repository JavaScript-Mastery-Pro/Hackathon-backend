# Choosing Protections

Map the user's problem to the right Arcjet rules. Load this file when you need to pick rules for a specific concern (bot abuse, cost explosion, prompt injection, etc.) — the main SKILL.md only points here.

## Automated traffic and bot abuse

Automated clients — scrapers, data harvesters, and script-based attackers — treat AI features as free compute. Without bot protection, every request from a bot reaches your AI provider and inflates your costs.

Arcjet bot detection runs inside the application, before the AI call, so denied requests never reach your provider. It classifies 600+ known bots across 25 categories, verifies legitimate bots (search engines, monitors), and detects emerging threats in real time.

You configure bot rules in application code — not at the CDN layer — so you can apply different strategies per route and make decisions based on full application context (identity, subscription level, session state).

**Rules:** `detectBot` (request-based only). Use `allow` for a safelist or `deny` to block specific categories — they're mutually exclusive. Combine with rate limiting for full traffic control.

Bot rules can also be configured as remote rules via the CLI or MCP server — applied site-wide with no code changes or redeployment. Useful for blocking a newly-spotted bot category during an incident.

## Cost explosion and budget control

Automated traffic, user abuse, and prompt attacks inflate token and tool spend. Rate limiting enforces per-user token quotas to prevent cost explosions.

**Rules:** `tokenBucket`, `fixedWindow`, `slidingWindow` (request-based and guard).

Use token bucket for AI workloads where operations have variable cost — set `requested` per call to consume proportional tokens (1 for a lookup, 10 for an expensive generation). Fixed window gives a hard cap that resets at period boundaries. Sliding window provides smooth rate limiting without boundary bursts.

For request-based protection, rate limits default to keying by IP. Use `characteristics: ["userId"]` to key by something else. For guard protection, you must always pass an explicit `key` (user ID, session ID, etc.) and a `bucket` name to avoid collisions.

## Prompt injection attacks

Jailbreaks, role-play escapes, and instruction overrides allow attackers to manipulate AI behavior. Arcjet scores incoming messages for injection patterns before they reach the model.

**Rules:** `detectPromptInjection` (request-based and guard). Use on any untrusted text before it reaches a model or tool argument — and on tool call *results* when the tool fetches content from untrusted sources.

## Data loss prevention

Sensitive data leaks into AI model context, logs, third-party tool calls, or model memory through unguarded inputs and outputs. Arcjet detects card numbers, email addresses, phone numbers, and custom patterns — entirely locally via WASM, with no data leaving your infrastructure.

**Rules:** `sensitiveInfo` / `localDetectSensitiveInfo` (request-based and guard). Use to block PII from entering the system (users sending credit card numbers) or leaving it (tool outputs leaking email addresses).

## Unauthorized tool invocation

Agents invoke tools in ways they shouldn't — issuing refunds, accessing data, escalating privileges. The prompt can be benign; the tool call is catastrophic.

**Rules:** Guard protection with per-tool rate limits and labels. Each tool call site gets its own `label` and rules, so you can enforce different budgets and detect abuse per operation. Combine with prompt injection detection on tool inputs.

## Common web attacks

SQLi, XSS, and other injection attacks targeting web endpoints.

**Rules:** `shield` (request-based only). Zero config, no cost. Include on the shared client as a base rule unless the codebase has a different convention.

## Signup abuse

Credential stuffing, spam registrations, and disposable email abuse on signup/login forms.

**Rules:** `validateEmail` + `protectSignup` (request-based only). Rejects disposable, no-MX, and invalid addresses. `protectSignup` combines bot detection + email validation + rate limiting in one rule.

## IP-based filtering

Block traffic by IP metadata — VPN, Tor, country, or specific IP ranges.

**Rules:** `filter` (request-based only). Can also be configured as remote rules via CLI/MCP for immediate response to active attacks without redeployment.
