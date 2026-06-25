# JavaScript/TypeScript Request Protection

## What Request Protection Is

Request protection inspects HTTP requests — headers, IP, body — to enforce security rules on API routes, form handlers, and server-rendered pages. Each web framework has a dedicated Arcjet adapter that knows how to extract the request metadata.

## Installation

Pick the adapter for the project's framework, then install it with whichever package manager the project already uses (`npm install`, `pnpm add`, `yarn add`, `bun add`). Don't hand-edit `package.json` — a typed version is usually stale, and the lockfile won't update. Read the installed package's types and doc comments for the full API surface.

**Runtime baseline:** **Node.js ≥ 20**, **Bun ≥ 1.3.0**, **Deno** `stable` / `lts`. If the project is below any of these, the install will fail or runtime behavior will misbehave — bump the runtime first.

> _Version info last verified against `@arcjet/*` v1.4.0 on **2026-05-20**. Numbers below may drift — before relying on them, check the current `package.json` of the relevant `@arcjet/*` package at https://github.com/arcjet/arcjet-js (or the latest release at https://github.com/arcjet/arcjet-js/releases). Minimums tend to creep upward over time._

| Framework         | Package                                                   | Min framework version                                |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Next.js           | `@arcjet/next`                                            | Next.js ≥ 15                                         |
| Express / Node.js | `@arcjet/node`                                            | Node ≥ 20 (no framework peer)                        |
| Fastify           | `@arcjet/fastify`                                         | Fastify ≥ 5                                          |
| NestJS            | `@arcjet/nest`                                            | `@nestjs/common` ^10 \|\| ^11                        |
| SvelteKit         | `@arcjet/sveltekit`                                       | Svelte ^3.54 \|\| ^4 \|\| ^5                         |
| Remix             | `@arcjet/remix`                                           | Remix v2 (v3 was renamed to React Router 7 — use `@arcjet/react-router`) |
| React Router      | `@arcjet/react-router`                                    | react-router ≥ 7                                     |
| Astro             | `@arcjet/astro`                                           | Astro ^5.9.3 \|\| ^6                                 |
| Nuxt              | `@arcjet/nuxt`                                            | `@nuxt/kit` ≥ 4, `@nuxt/schema` ≥ 4                  |
| Bun               | `@arcjet/bun`                                             | Bun ≥ 1.3.0                                          |
| Deno              | `@arcjet/deno` (install with `deno add npm:@arcjet/deno`) | Deno `stable` / `lts`                                |
| Hono              | `@arcjet/node` (on Node) or `@arcjet/bun` (on Bun)        | runtime-dependent (see Node/Bun rows)                |

If the project is below a listed minimum, warn the user and stop — installing anyway produces confusing errors.

**Some frameworks don't fit the generic patterns below.** Check the [Framework-specific setup](#framework-specific-setup) section first:

- **Astro, Nuxt, NestJS** — replace the "shared client file" pattern entirely (Astro integration / Nuxt module / NestJS DI).
- **Bun, Deno, Hono on Node** — use the shared client file as below, but with a runtime quirk (`aj.handler()` wrapping for Bun/Deno; `HttpBindings` type for Hono on Node).

Everything else (Next.js, Express/Node, Fastify, SvelteKit, Remix, React Router, Hono on Bun) follows the generic patterns directly.

## Architecture: Why Things Go Where They Do

### Shared client file (standard pattern)

Create a **separate file** (e.g. `src/lib/arcjet.ts` or `lib/arcjet.ts`) that exports the Arcjet instance. Do NOT define the client inline in route handlers — it should be importable from any route.

Always include `shield({ mode: "LIVE" })` as a base rule, even when using combined rules like `protectSignup()`. Shield protects against common attacks (SQLi, XSS) and costs nothing to add.

```typescript
// src/lib/arcjet.ts
import arcjet, { shield } from "@arcjet/next"; // or @arcjet/node, etc.

export const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [shield({ mode: "LIVE" })],
});
```

### withRule() for per-route rules

Use `withRule()` to add route-specific rules without modifying the shared instance. This keeps the base protection (shield) everywhere while layering additional rules per endpoint.

```typescript
import aj from "@/lib/arcjet";
import { slidingWindow } from "@arcjet/next";

const protect = aj.withRule(slidingWindow({ mode: "LIVE", interval: 60, max: 100 }));
```

### protect() in route handlers, not middleware

Call `protect()` inside each route handler, once per request. Don't call it in Express middleware (`app.use()`) or Next.js middleware — these run on every request including static assets, and you lose the ability to apply different rules to different routes.

## Framework-specific setup

Five frameworks don't fit the "shared client file" pattern above. Use the structure below for the affected framework, then read the installed package's types and README for the full API.

### Astro

Astro registers Arcjet as a build-time **integration** in `astro.config.mjs`. The configured client is exposed as a virtual module — there is no `lib/arcjet.ts` file and no `withRule()`. Rules are global to the integration; per-route variation isn't supported.

```typescript
// astro.config.mjs
import arcjet, { shield } from "@arcjet/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [arcjet({ rules: [shield({ mode: "LIVE" })] })],
});

// src/pages/api/hello.ts
import aj from "arcjet:client";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const decision = await aj.protect(request);
  // ...
};
```

### Nuxt

Nuxt registers Arcjet as a Nuxt **module**. The key goes in `nuxt.config.ts`, not in the `arcjet()` call, and the SDK is imported from the auto-generated alias `#arcjet`.

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@arcjet/nuxt"],
  arcjet: { key: process.env.ARCJET_KEY },
});

// server/routes/hello.get.ts
import arcjet, { shield } from "#arcjet";

const aj = arcjet({ rules: [shield({ mode: "LIVE" })] }); // no `key` — module provides it

export default defineEventHandler(async (event) => {
  const decision = await aj.protect(event);
  // ...
});
```

### NestJS

NestJS uses dependency injection. Register `ArcjetModule.forRoot()` in your app module, then inject the client in controllers with `@InjectArcjet()`.

```typescript
// app.module.ts
import { ArcjetModule, shield } from "@arcjet/nest";

@Module({
  imports: [
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [shield({ mode: "LIVE" })],
    }),
  ],
})
export class AppModule {}

// app.controller.ts
import { ArcjetNest, InjectArcjet } from "@arcjet/nest";

@Controller()
export class AppController {
  constructor(@InjectArcjet() private readonly arcjet: ArcjetNest) {}

  @Get("/")
  async index(@Req() req: Request) {
    const decision = await this.arcjet.protect(req);
    // ...
  }
}
```

### Bun and Deno

Both expose `aj.handler()` to wrap the server's fetch handler. Wrapping is for accurate client IP detection — `protect()` still needs to be called inside.

```typescript
// Bun
import arcjet, { shield } from "@arcjet/bun";
import { env } from "bun";

const aj = arcjet({ key: env.ARCJET_KEY!, rules: [shield({ mode: "LIVE" })] });

Bun.serve({
  port: 3000,
  fetch: aj.handler(async (req) => {
    const decision = await aj.protect(req);
    // ...
    return new Response("ok");
  }),
});

// Deno
import arcjet, { shield } from "npm:@arcjet/deno";

const aj = arcjet({ key: Deno.env.get("ARCJET_KEY")!, rules: [shield({ mode: "LIVE" })] });

Deno.serve(aj.handler(async (request) => {
  const decision = await aj.protect(request);
  // ...
  return new Response("ok");
}));
```

On Deno, imports use the `npm:` prefix (`npm:@arcjet/deno`, `npm:@arcjet/inspect`). On Bun, env comes from `import { env } from "bun"` rather than `process.env`.

### Hono

Hono on **Bun** is straightforward — install `@arcjet/bun`, create the client per the standard pattern, and pass `c.req.raw` to `protect()`.

Hono on **Node.js** needs the type-bindings dance so the underlying `IncomingMessage` is reachable. Install `@arcjet/node` and type the app with `HttpBindings` from `@hono/node-server`:

```typescript
import arcjet, { shield } from "@arcjet/node";
import { serve, type HttpBindings } from "@hono/node-server";
import { Hono } from "hono";

const aj = arcjet({ key: process.env.ARCJET_KEY!, rules: [shield({ mode: "LIVE" })] });
const app = new Hono<{ Bindings: HttpBindings }>();

app.get("/", async (c) => {
  const decision = await aj.protect(c.env.incoming);
  // ...
});
```

Without the `Bindings` type, `c.env.incoming` won't typecheck.

## Choosing Rules

See the "Choosing the Right Rules" section in the main skill for rule selection guidance and rate limiting strategy comparisons. Key framework-specific notes:

- **shield** — always include. No configuration needed.
- **detectBot** — use `allow` for a safelist or `deny` for specific categories. They're mutually exclusive.
- **Rate limits** — use `characteristics: ["userId"]` to key by something other than IP.
- **validateEmail** — for signup/login forms.
- **protectSignup** — combined bot + email + rate limit, purpose-built for registration flows.
- **sensitiveInfo** — blocks PII in request bodies.
- **detectPromptInjection** — for AI endpoints receiving user prompts.
- **filter** — block by IP metadata (VPN, Tor, country, IP range).

## Framework-Specific protect() Calls

The request object to pass differs by framework:

| Framework                           | What to pass to `protect()`                                       |
| ----------------------------------- | ----------------------------------------------------------------- |
| Express / Node.js                   | `req` (IncomingMessage)                                           |
| Next.js App Router                  | `req` (Request)                                                   |
| Next.js Server Components / actions | `await request()` from `@arcjet/next`                             |
| Fastify                             | `request` (Fastify request, not raw Node)                         |
| NestJS                              | `req` (`@Req() req: Request`)                                     |
| SvelteKit                           | `event`                                                           |
| Remix / React Router                | `args` (the loader/action args)                                   |
| Nuxt                                | `event` (H3 event)                                                |
| Astro                               | `request` (the Web `Request`)                                     |
| Hono on Node.js                     | `c.env.incoming` (requires `Hono<{ Bindings: HttpBindings }>`)    |
| Hono on Bun                         | `c.req.raw`                                                       |
| Bun                                 | `request` (Web `Request`), wrap `fetch` with `aj.handler()`       |
| Deno                                | `request` (Web `Request`), wrap `Deno.serve` body with `aj.handler()` |

`aj.handler()` on Bun and Deno wraps the user's fetch handler so Arcjet has access to the underlying socket / connection info for accurate IP detection — Bun and Deno don't expose that on the `Request` object alone. The wrapping is for IP detection only; you still need to call `aj.protect(request)` yourself inside the handler.

## Decision Handling

`decision.isDenied()` means a LIVE rule triggered a denial. Map denial reasons to HTTP status codes, but **only branch on reasons that produce a different response** — skip arms that would just return the same status as the default 403:

- `decision.reason.isRateLimit()` → 429
- `decision.reason.isEmail()` → 400
- `decision.reason.isSensitiveInfo()` → 400
- `decision.reason.isPromptInjection()` → 400
- everything else (bot, shield, filter) → default 403

Writing an explicit `else if (reason.isShield())` arm that returns 403 just adds noise when the default already returns 403.

`decision.isErrored()` means something went wrong during rule evaluation but the SDK failed open. Log it and allow the request.

## Deprecations

As of `@arcjet/*` 1.4.0, the request-based SDK carries a few deprecated bits. New code should avoid them; existing code that uses them should be migrated when convenient.

- **`detectPromptInjection({ threshold })`** — the `threshold` option is no longer respected by the server and will be removed in a future release. Drop it from new configs; remove it from existing configs when touching them. Detection runs without it.
- **`PromptInjectionReason.score`** — the `score` field on the reason returned for prompt-injection denials is no longer populated by the server and will be removed. Don't read it; branch on `decision.reason.isPromptInjection()` instead.
- **`experimental_detectPromptInjection`** — the legacy `experimental_` alias is deprecated. Import `detectPromptInjection` directly from `@arcjet/node` / `@arcjet/next` / etc.
- **`ArcjetEdgeRuleReason`** — currently unused; can be ignored in reason-handling switches.

> _Deprecations last verified against `@arcjet/*` v1.4.0 on **2026-05-20**. Before relying on the items above, grep the installed package for `@deprecated` markers — see [`protocol/index.ts`](https://github.com/arcjet/arcjet-js/blob/main/protocol/index.ts) and [`arcjet/index.ts`](https://github.com/arcjet/arcjet-js/blob/main/arcjet/index.ts)._

## Key Patterns

- Rules that need extra input at protect() time: `tokenBucket` needs `{ requested: N }`, `validateEmail`/`protectSignup` needs `{ email }`, `sensitiveInfo` needs `{ sensitiveInfoValue }`, `detectPromptInjection` needs `{ detectPromptInjectionMessage }`.
- Every rule accepts `mode: "LIVE" | "DRY_RUN"`. Start with DRY_RUN to verify rules match expected traffic before enforcing.
- For existing projects, check for an existing Arcjet client file before creating a new one — extend with `withRule()` instead.
