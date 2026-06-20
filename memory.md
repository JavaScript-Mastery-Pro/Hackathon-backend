# Memory — NestJS Hackathon Backend Course Project

Last updated: 2026-06-15

## What was built

**Auth module (full replacement of Better Auth with JWT):**
- `src/module/auth/auth.service.ts` — signUp (bcrypt hash, returns JWT), signIn (bcrypt compare, returns JWT)
- `src/module/auth/auth.controller.ts` — POST /auth/sign-up, POST /auth/sign-in
- `src/module/auth/auth.module.ts` — registers PassportModule, JwtModule (7d expiry from JWT_SECRET env var)
- `src/module/auth/strategies/jwt.strategy.ts` — validates Bearer token, attaches { id, email, role } to req.user
- `src/module/auth/dto/sign-up.dto.ts` / `sign-in.dto.ts`
- `src/common/guards/jwt-auth.guard.ts` — moved here (not inside auth module) because it's cross-cutting

**Feature changes:**
- `src/module/hackathon/hackathon.controller.ts` — guards moved to per-route, GET routes public, @Roles('ADMIN') on create/update/delete, GET /:id/participants added
- `src/module/hackathon/hackathon.service.ts` — added getParticipants(), replaced console.log with Logger
- `src/module/submission/submission.service.ts` — removed temp file dance, writes directly to final path, added expiry check, added updateStatus(), initial status is UNDER_REVIEW
- `src/module/submission/submission.controller.ts` — JwtAuthGuard, added PATCH /:id/status for ADMIN
- `src/module/user/user.controller.ts` — replaced Better Auth decorators with JwtAuthGuard + req.user
- `src/lib/queue/queue.processor.ts` — stripped to email-only, no file logic

**Schema changes:**
- `prisma/models/user.prisma` — added `password String`, removed Session/Account/Verification models
- `prisma/models/submssion.prisma` — enum changed to UNDER_REVIEW | ACCEPTED | REJECTED (default UNDER_REVIEW)
- Database synced via `npx prisma db push`, client regenerated

**Config/infra:**
- `src/app.module.ts` — Better Auth removed, AuthModule registered
- `src/common/types/express.d.ts` — augments `Express.User` (not Request.user) with { id, email, role }
- `auth.ts` (root) — deleted
- JWT_SECRET and JWT_EXPIRES_IN=7d added to .env
- `context/plan/` — build-plan.md, plan.md, auth-plan.md, progress-tracker.md all created

## Decisions made

- **No refresh tokens** — 7-day JWT expiry, stateless, single token only. Keeps it simple for course.
- **Role in JWT payload** — { sub, email, role } embedded. No DB fetch per request. Acceptable since role changes are rare.
- **Sign-up returns JWT immediately** — user is logged in right after registration.
- **JwtAuthGuard in common/guards/** — used cross-app, belongs with RolesGuard. JwtStrategy stays in auth module (implementation detail).
- **BullMQ queue sends email only** — no file processing in the queue. File written directly to final path on request thread.
- **Submission status** — UNDER_REVIEW (default) | ACCEPTED | REJECTED. Admin updates via PATCH /submission/:id/status.
- **Public hackathon routes** — GET /hackathon, GET /hackathon/:id, GET /hackathon/:id/participants require no auth.
- **Express.User augmentation** — must augment `Express.User` interface (not `Express.Request.user`) because @types/passport overrides Request.user with Express.User.

## Problems solved

- **`prisma migrate dev` fails in non-interactive shell** — use `npx prisma db push --accept-data-loss` for dev. For the course video, run `npm run db:migrate` manually in terminal.
- **`@types/passport` conflict** — it declares `req.user?: Express.User`. Must augment `Express.User` interface, not `Express.Request.user` directly, or the type gets overridden.
- **`secretOrKey` type error in JwtStrategy** — `config.get<string>()` returns `string | undefined`. Fix: extract to variable with `as string` cast before passing to super().
- **`expiresIn` type error in JwtModule** — use `'7d' as const` instead of reading from config to satisfy the StringValue type constraint.
- **IDE diagnostics show stale errors after file writes** — always verify with `npx tsc --noEmit` rather than trusting the PostToolUse hook diagnostics.

## Current state

- TypeScript: zero errors (`npx tsc --noEmit` passes clean)
- All phases 1–3 complete per progress-tracker.md
- Phase 4 (verify — run server and test endpoints) not yet done
- Skills installed in `.claude/skills/`: architect, recover, remember, review
- CLAUDE.md exists at project root for session context

## Next session starts with

**Phase 4 — verification.** Start dev server (`npm run start:dev`), then test in order:
1. POST /auth/sign-up → POST /auth/sign-in → GET /user/me
2. GET /hackathon (no token — should work)
3. POST /hackathon/create (ADMIN token — should work; PARTICIPANT token — should 403)
4. POST /hackathon/:id/join (PARTICIPANT token)
5. POST /submission/:hackathonId/submit (with file)
6. PATCH /submission/:id/status (ADMIN token)

## Open questions

- `npm run db:migrate` needs to be run manually in a real terminal to create a named migration file from the schema changes. `db push` was used instead — fine for dev but won't leave a migration history.
- The `hackathon.module.ts` may need to import `MailModule` — verify it's wired correctly when testing join flow.
- Queue module (`QueueModule`) imports `PrismaService` via the processor — now that the processor no longer uses Prisma, check if that import can be cleaned up.
