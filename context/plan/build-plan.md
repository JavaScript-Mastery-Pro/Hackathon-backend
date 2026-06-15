# Build Plan

Consolidated ordered steps for implementing all changes.
See `plan.md` and `auth-plan.md` for full context behind each decision.

---

## Phase 1 — Schema (do first, everything depends on it)

1. `prisma/models/user.prisma` — add `password String`, remove `Session` / `Account` / `Verification` models
2. `prisma/models/submssion.prisma` — change enum to `UNDER_REVIEW | ACCEPTED | REJECTED`, default `UNDER_REVIEW`
3. Run `npm run db:migrate` → verify generated types in `src/generated/prisma/`

---

## Phase 2 — Replace Better Auth with JWT

4. Uninstall `@thallesp/nestjs-better-auth`
5. Install `@nestjs/passport` `passport` `passport-jwt` `@nestjs/jwt` `bcryptjs` `@types/passport-jwt` `@types/bcryptjs`
6. Add `JWT_SECRET` and `JWT_EXPIRES_IN=7d` to `.env`
7. Create `src/module/auth/strategies/jwt.strategy.ts`
8. Create `src/module/auth/guards/jwt-auth.guard.ts`
9. Create `src/module/auth/dto/sign-up.dto.ts` — `name`, `email`, `password`
10. Create `src/module/auth/dto/sign-in.dto.ts` — `email`, `password`
11. Create `src/module/auth/auth.service.ts` — `signUp()`, `signIn()`
12. Create `src/module/auth/auth.controller.ts` — `POST /auth/sign-up`, `POST /auth/sign-in`
13. Create `src/module/auth/auth.module.ts`
14. Update `src/app.module.ts` — register `AuthModule`, remove Better Auth config
15. Update `src/common/types/express.d.ts` — `req.user: { id, email, role }`
16. Delete `auth.ts` from project root

---

## Phase 3 — Feature changes

17. `src/module/hackathon/hackathon.controller.ts`
    - Remove `@UseGuards` from class level
    - Apply `@UseGuards(JwtAuthGuard, RolesGuard)` per write route
    - Uncomment `@Roles('ADMIN')` on `createHackathon`
    - Swap `AuthGuard` import → `JwtAuthGuard`
    - Add `GET /:id/participants` route (public, no guard)

18. `src/module/hackathon/hackathon.service.ts`
    - Add `getParticipants(hackathonId)` method
    - Replace `console.log` with `Logger`

19. `src/module/submission/submission.service.ts`
    - Remove temp file logic — write directly to final path
    - Add hackathon expiry check (`endsAt < new Date()`)
    - Change initial status from `PROCESSING` → `UNDER_REVIEW`
    - Add `updateStatus(id, status, userRole)` method

20. `src/module/submission/submission.controller.ts`
    - Swap `AuthGuard` → `JwtAuthGuard`
    - Add `PATCH /:id/status` route with `@Roles('ADMIN')`

21. `src/module/user/user.controller.ts`
    - Swap `AuthGuard` → `JwtAuthGuard`
    - Remove `@Session()` decorator from `me()`, use `@Request() req` → `req.user`

22. `src/lib/queue/queue.processor.ts`
    - Remove all file move / rename / directory logic
    - Processor calls `mailService.sendSubmissionProcessed` only
    - Remove `onFailed` temp file cleanup

---

## Phase 4 — Verify

23. Start dev server — check for type errors
24. Test: `POST /auth/sign-up` → `POST /auth/sign-in` → `GET /user/me`
25. Test: public `GET /hackathon` without token
26. Test: `POST /hackathon/create` with ADMIN token
27. Test: `POST /hackathon/:id/join` with PARTICIPANT token
28. Test: `POST /submission/:hackathonId/submit` with file
29. Test: `PATCH /submission/:id/status` with ADMIN token
