# Progress Tracker

Check this at the start of every session. Update immediately after each step is done.
Full step details in `build-plan.md`.

## Phase 1 — Schema
- [x] 1. Update `user.prisma` — add password, remove Better Auth models
- [x] 2. Update `submssion.prisma` — new status enum
- [x] 3. Run migration

## Phase 2 — Replace Better Auth with JWT
- [x] 4. Uninstall `@thallesp/nestjs-better-auth`
- [x] 5. Install JWT + passport packages
- [x] 6. Add `JWT_SECRET` + `JWT_EXPIRES_IN` to `.env`
- [x] 7. Create `jwt.strategy.ts`
- [x] 8. Create `jwt-auth.guard.ts`
- [x] 9. Create `sign-up.dto.ts`
- [x] 10. Create `sign-in.dto.ts`
- [x] 11. Create `auth.service.ts`
- [x] 12. Create `auth.controller.ts`
- [x] 13. Create `auth.module.ts`
- [x] 14. Update `app.module.ts`
- [x] 15. Update `express.d.ts`
- [x] 16. Delete `auth.ts`

## Phase 3 — Feature Changes
- [x] 17. Fix `hackathon.controller.ts` — guards, roles, participants route
- [x] 18. Update `hackathon.service.ts` — getParticipants, Logger
- [x] 19. Update `submission.service.ts` — remove temp, expiry check, updateStatus
- [x] 20. Update `submission.controller.ts` — JwtAuthGuard, PATCH status route
- [x] 21. Update `user.controller.ts` — JwtAuthGuard, remove @Session
- [x] 22. Simplify `queue.processor.ts` — email only

## Phase 4 — Verify
- [x] 23. Dev server starts clean
- [x] 24. Auth endpoints work
- [x] 25. Public hackathon routes work without token
- [x] 26. Admin-only routes reject PARTICIPANT token
- [x] 27. Join hackathon works
- [x] 28. File submission works
- [x] 29. Admin status update works
